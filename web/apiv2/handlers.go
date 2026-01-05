package apiv2

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/mogaika/god_of_war_browser/pack"
	"github.com/mogaika/god_of_war_browser/pack/wad"
	"github.com/mogaika/god_of_war_browser/vfs"
)

// respondJSON envia uma resposta JSON
func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// respondError envia uma resposta de erro JSON
func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, APIResponse{
		Success: false,
		Error:   message,
	})
}

// buildFileTree constrói recursivamente a árvore de arquivos
func buildFileTree(dir vfs.Directory, prefix string, depth int) ([]*FileNode, error) {
	// Limitar profundidade para evitar recursão infinita
	if depth > 5 {
		return nil, nil
	}

	fileNames, err := dir.List()
	if err != nil {
		return nil, err
	}

	nodes := make([]*FileNode, 0)

	for _, name := range fileNames {
		fullPath := filepath.Join(prefix, name)

		elem, err := dir.GetElement(name)
		if err != nil {
			continue // Skip elementos que não podem ser acessados
		}

		node := &FileNode{
			ID:   fullPath,
			Name: name,
		}

		if elem.IsDirectory() {
			node.Type = "folder"
			// Recursivamente buscar subdiretórios
			subDir := elem.(vfs.Directory)
			children, err := buildFileTree(subDir, fullPath, depth+1)
			if err == nil && len(children) > 0 {
				node.Children = children
			}
		} else {
			node.Type = "file"
			file := elem.(vfs.File)
			node.Size = file.Size()
			node.Extension = strings.TrimPrefix(filepath.Ext(name), ".")
		}

		nodes = append(nodes, node)
	}

	return nodes, nil
}

// HandleListFileSystem retorna a árvore completa do sistema de arquivos
func HandleListFileSystem(serverDir vfs.Directory) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tree, err := buildFileTree(serverDir, "", 0)
		if err != nil {
			respondError(w, http.StatusInternalServerError,
				fmt.Sprintf("Failed to build file tree: %v", err))
			return
		}

		respondJSON(w, http.StatusOK, APIResponse{
			Success: true,
			Data:    tree,
		})
	}
}

// HandleGetPackContents retorna o conteúdo de um arquivo WAD
func HandleGetPackContents(serverDir vfs.Directory) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Extrair nome do arquivo da URL
		pathParts := strings.Split(r.URL.Path, "/")
		if len(pathParts) < 5 {
			respondError(w, http.StatusBadRequest, "Invalid path")
			return
		}

		fileName := pathParts[4]

		// Carregar o arquivo WAD usando pack.GetInstanceHandler
		data, err := pack.GetInstanceHandler(serverDir, fileName)
		if err != nil {
			respondError(w, http.StatusInternalServerError,
				fmt.Sprintf("Failed to load pack: %v", err))
			return
		}

		// Verificar se é um WAD
		wadFile, ok := data.(*wad.Wad)
		if !ok {
			respondError(w, http.StatusBadRequest,
				fmt.Sprintf("File is not a WAD pack: %s", fileName))
			return
		}

		// Converter tags para PackFile
		packFiles := make([]*PackFile, 0)
		for _, tag := range wadFile.Tags {
			resourceType := fmt.Sprintf("0x%.4X", tag.Tag)
			if len(tag.Data) >= 4 {
				resourceType = fmt.Sprintf("0x%.4X", binary.LittleEndian.Uint32(tag.Data))
			}

			packFiles = append(packFiles, &PackFile{
				ID:     fmt.Sprintf("%d", tag.Id),
				Name:   tag.Name,
				Type:   resourceType,
				Size:   int64(tag.Size),
				Offset: int64(tag.DebugPos),
			})
		}

		respondJSON(w, http.StatusOK, APIResponse{
			Success: true,
			Data:    packFiles,
		})
	}
}

// HandleGetResourceInfo retorna informações detalhadas sobre um recurso
func HandleGetResourceInfo(serverDir vfs.Directory) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		pathParts := strings.Split(r.URL.Path, "/")
		if len(pathParts) < 7 {
			respondError(w, http.StatusBadRequest, "Invalid path")
			return
		}

		fileName := pathParts[4]
		resourceID := pathParts[6]

		// Carregar o arquivo WAD
		data, err := pack.GetInstanceHandler(serverDir, fileName)
		if err != nil {
			respondError(w, http.StatusInternalServerError,
				fmt.Sprintf("Failed to load pack: %v", err))
			return
		}

		wadFile, ok := data.(*wad.Wad)
		if !ok {
			respondError(w, http.StatusBadRequest, "File is not a WAD pack")
			return
		}

		// Encontrar o tag pelo ID
		var targetTag *wad.Tag
		for i := range wadFile.Tags {
			if fmt.Sprintf("%d", wadFile.Tags[i].Id) == resourceID {
				targetTag = &wadFile.Tags[i]
				break
			}
		}

		if targetTag == nil {
			respondError(w, http.StatusNotFound, "Resource not found")
			return
		}

		// Ler dados para preview hex
		previewSize := 256
		if int(targetTag.Size) < previewSize {
			previewSize = int(targetTag.Size)
		}

		previewData := make([]byte, previewSize)
		if targetTag.Data != nil && len(targetTag.Data) > 0 {
			copy(previewData, targetTag.Data[:min(len(targetTag.Data), previewSize)])
		}

		// Formatar hex preview
		hexPreview := formatHexPreview(previewData)

		resourceType := fmt.Sprintf("0x%.4X", targetTag.Tag)
		if len(targetTag.Data) >= 4 {
			resourceType = fmt.Sprintf("0x%.4X", binary.LittleEndian.Uint32(targetTag.Data))
		}

		info := &ResourceInfo{
			ID:         resourceID,
			Name:       targetTag.Name,
			Type:       resourceType,
			Size:       int64(targetTag.Size),
			Offset:     int64(targetTag.DebugPos),
			HexPreview: hexPreview,
			Properties: map[string]interface{}{
				"flags": fmt.Sprintf("0x%.4X", targetTag.Flags),
			},
		}

		respondJSON(w, http.StatusOK, APIResponse{
			Success: true,
			Data:    info,
		})
	}
}

// formatHexPreview formata bytes em visualização hexadecimal
func formatHexPreview(data []byte) string {
	if len(data) == 0 {
		return "No data available"
	}

	lines := make([]string, 0)

	for i := 0; i < len(data); i += 16 {
		end := i + 16
		if end > len(data) {
			end = len(data)
		}

		// Formatar offset
		line := fmt.Sprintf("%08X: ", i)

		// Formatar hex bytes
		hexPart := ""
		for j := i; j < end; j++ {
			hexPart += fmt.Sprintf("%.2X", data[j])
			if (j-i)%2 == 1 {
				hexPart += " "
			}
		}

		// Pad hex part se linha incompleta
		for len(hexPart) < 40 {
			hexPart += " "
		}

		// Formatar ASCII
		asciiPart := ""
		for j := i; j < end; j++ {
			if data[j] >= 32 && data[j] <= 126 {
				asciiPart += string(data[j])
			} else {
				asciiPart += "."
			}
		}

		line += hexPart + " " + asciiPart
		lines = append(lines, line)
	}

	return strings.Join(lines, "\n")
}

// min retorna o menor de dois inteiros
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
