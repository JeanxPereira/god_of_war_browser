package apiv2

// APIResponse é a estrutura padrão de resposta
type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// FileNode representa um arquivo ou pasta no sistema
type FileNode struct {
	ID        string      `json:"id"`
	Name      string      `json:"name"`
	Type      string      `json:"type"` // "file" ou "folder"
	Size      int64       `json:"size,omitempty"`
	Extension string      `json:"extension,omitempty"`
	Children  []*FileNode `json:"children,omitempty"`
}

// PackFile representa um arquivo dentro de um pack WAD
type PackFile struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Type   string `json:"type"`
	Size   int64  `json:"size"`
	Offset int64  `json:"offset"`
}

// TreeNode representa um nó na árvore de recursos
type TreeNode struct {
	ID       string      `json:"id"`
	Name     string      `json:"name"`
	Type     string      `json:"type"`
	Children []*TreeNode `json:"children,omitempty"`
}

// MeshData representa dados de uma mesh para renderização
type MeshData struct {
	Vertices    []float32  `json:"vertices"`    // [x,y,z, x,y,z, ...]
	Normals     []float32  `json:"normals"`     // [nx,ny,nz, ...]
	UVs         []float32  `json:"uvs"`         // [u,v, u,v, ...]
	Indices     []uint32   `json:"indices"`     // indices de triângulos
	VertexCount int        `json:"vertexCount"` // total de vértices
	IndexCount  int        `json:"indexCount"`  // total de índices
	BoundingBox [6]float32 `json:"boundingBox"` // [minX,minY,minZ,maxX,maxY,maxZ]
	MaterialID  int        `json:"materialId"`  // ID do material
	HasNormals  bool       `json:"hasNormals"`  // indica se normals estão presentes
	HasUVs      bool       `json:"hasUvs"`      // indica se uvs estão presentes
}

// ResourceInfo contém informações detalhadas sobre um recurso
type ResourceInfo struct {
	ID         string                 `json:"id"`
	Name       string                 `json:"name"`
	Type       string                 `json:"type"`
	Size       int64                  `json:"size"`
	Offset     int64                  `json:"offset"`
	Properties map[string]interface{} `json:"properties,omitempty"`
	HexPreview string                 `json:"hexPreview,omitempty"`
}
