package apiv2

import (
	"encoding/binary"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/mogaika/god_of_war_browser/pack"
	"github.com/mogaika/god_of_war_browser/pack/wad"
	"github.com/mogaika/god_of_war_browser/pack/wad/mdl"
	"github.com/mogaika/god_of_war_browser/pack/wad/mesh"
	"github.com/mogaika/god_of_war_browser/vfs"
)

// HandleGetMeshData retorna dados de mesh otimizados para Three.js
func HandleGetMeshData(serverDir vfs.Directory) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		fileName := vars["file"]
		resourceID := vars["id"]

		// Converter resourceID para int
		id, err := strconv.Atoi(resourceID)
		if err != nil {
			respondError(w, http.StatusBadRequest, "Invalid resource ID")
			return
		}

		// Carregar WAD
		wadInstance, err := pack.GetInstanceHandler(serverDir, fileName)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		wadFile, ok := wadInstance.(*wad.Wad)
		if !ok {
			respondError(w, http.StatusInternalServerError, "Failed to cast to WAD")
			return
		}

		// Verificar se o ID é válido
		if id < 0 || id >= len(wadFile.Tags) {
			respondError(w, http.StatusNotFound, "Resource not found")
			return
		}

		tag := &wadFile.Tags[id]

		// Validar serverId (primeiros 4 bytes do payload)
		if len(tag.Data) < 4 {
			respondError(w, http.StatusBadRequest, "Resource has no serverId (size < 4 bytes)")
			return
		}
		serverId := binary.LittleEndian.Uint32(tag.Data[:4])
		baseId := serverId & 0xFFFF
		if baseId != 0x000f {
			respondError(w, http.StatusBadRequest, fmt.Sprintf("Resource is not a mesh (serverId=0x%.4x)", serverId))
			return
		}

		// Resolve handler instance (serverInstance tags carregam o serverId real no payload)
		inst, _, err := wadFile.GetInstanceFromTag(wad.TagId(id))
		if err != nil {
			respondError(w, http.StatusInternalServerError,
				fmt.Sprintf("Failed to load resource: %v", err))
			return
		}

		var meshData *mesh.Mesh

		switch typed := inst.(type) {
		case *mesh.Mesh:
			meshData = typed
		case *mdl.Model:
			ajaxAny, err := typed.Marshal(wadFile.GetNodeResourceByTagId(tag.Id))
			if err != nil {
				respondError(w, http.StatusInternalServerError,
					fmt.Sprintf("Failed to load MDL meshes: %v", err))
				return
			}
			if ajax, ok := ajaxAny.(*mdl.Ajax); ok && len(ajax.Meshes) > 0 {
				meshData = ajax.Meshes[0] // use first mesh for now
			} else {
				respondError(w, http.StatusBadRequest, "MDL contains no meshes")
				return
			}
		default:
			respondError(w, http.StatusBadRequest, "Resource is not a MESH")
			return
		}

		// Converter para formato Three.js
		threeMesh, err := convertMeshToThreeJS(meshData)
		if err != nil {
			respondError(w, http.StatusInternalServerError,
				fmt.Sprintf("Failed to convert mesh: %v", err))
			return
		}

		respondJSON(w, http.StatusOK, APIResponse{
			Success: true,
			Data:    threeMesh,
		})
	}
}

// convertMeshToThreeJS converte mesh do GoW para formato Three.js
func convertMeshToThreeJS(m *mesh.Mesh) (*MeshData, error) {
	result := &MeshData{
		Vertices: make([]float32, 0),
		Normals:  make([]float32, 0),
		UVs:      make([]float32, 0),
		Indices:  make([]uint32, 0),
	}

	var minX, minY, minZ float32 = 999999, 999999, 999999
	var maxX, maxY, maxZ float32 = -999999, -999999, -999999

	// Iterar sobre parts, groups e objects
	for _, part := range m.Parts {
		for _, group := range part.Groups {
			for _, object := range group.Objects {
				// Processa todas as instâncias e camadas
				for instIdx := 0; instIdx < int(object.InstancesCount); instIdx++ {
					for layerIdx := 0; layerIdx < int(object.TextureLayersCount); layerIdx++ {
						dmaIndex := instIdx*int(object.TextureLayersCount) + layerIdx
						if dmaIndex < 0 || dmaIndex >= len(object.Packets) {
							continue
						}

						packets := object.Packets[dmaIndex]

						localVertices := make([]float32, 0)
						localNormals := make([]float32, 0)
						localUVs := make([]float32, 0)
						localIndices := make([]uint32, 0)

						var vertexOffset uint32 = 0

						for _, packet := range packets {
							if len(packet.Trias.X) == 0 {
								continue
							}

							hasNormals := len(packet.Norms.X) > 0
							hasUVs := len(packet.Uvs.U) > 0

							result.HasNormals = result.HasNormals || hasNormals
							result.HasUVs = result.HasUVs || hasUVs

							for i := 0; i < len(packet.Trias.X); i++ {
								x := packet.Trias.X[i]
								y := packet.Trias.Y[i]
								z := packet.Trias.Z[i]

								localVertices = append(localVertices, x, y, z)

								// Atualizar bounding box global
								if x < minX {
									minX = x
								}
								if x > maxX {
									maxX = x
								}
								if y < minY {
									minY = y
								}
								if y > maxY {
									maxY = y
								}
								if z < minZ {
									minZ = z
								}
								if z > maxZ {
									maxZ = z
								}

								// Adicionar normais se existirem
								if hasNormals && i < len(packet.Norms.X) {
									localNormals = append(localNormals,
										packet.Norms.X[i],
										packet.Norms.Y[i],
										packet.Norms.Z[i])
								}

								// Adicionar UVs se existirem
								if hasUVs && i < len(packet.Uvs.U) {
									localUVs = append(localUVs,
										packet.Uvs.U[i],
										packet.Uvs.V[i])
								}

								// Adicionar índices (segue lógica do UI legado)
								if packet.Trias.Skip == nil || len(packet.Trias.Skip) <= i || !packet.Trias.Skip[i] {
									base := vertexOffset + uint32(i)
									if base >= 2 {
										localIndices = append(localIndices,
											base-2,
											base-1,
											base)
									}
								}
							}

							vertexOffset += uint32(len(packet.Trias.X))
						}

						if len(localVertices) > 0 {
							base := uint32(len(result.Vertices) / 3)

							result.Vertices = append(result.Vertices, localVertices...)

							if len(localNormals) > 0 {
								result.Normals = append(result.Normals, localNormals...)
							}
							if len(localUVs) > 0 {
								result.UVs = append(result.UVs, localUVs...)
							}
							for _, idx := range localIndices {
								result.Indices = append(result.Indices, base+idx)
							}

							result.MaterialID = int(object.MaterialId)
						}
					}
				}
			}
		}
	}

	result.VertexCount = len(result.Vertices) / 3
	result.IndexCount = len(result.Indices)

	// Evita bounding box inválido quando não há vértices
	if result.VertexCount == 0 {
		return nil, fmt.Errorf("mesh has no vertices")
	}

	result.BoundingBox = [6]float32{minX, minY, minZ, maxX, maxY, maxZ}

	return result, nil
}
