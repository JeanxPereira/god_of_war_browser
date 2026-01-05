import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { api, FileNode, PackFile, ResourceInfo, MeshData } from '@/lib/api/client';

/**
 * Hook para buscar a árvore do sistema de arquivos
 */
export function useFileSystem(): UseQueryResult<FileNode[], Error> {
  return useQuery({
    queryKey: ['filesystem'],
    queryFn: () => api.getFileSystem(),
    staleTime: 60000, // Cache por 1 minuto
    retry: 2,
  });
}

/**
 * Hook para buscar o conteúdo de um pack WAD
 */
export function usePackContents(
  packFile: string | null
): UseQueryResult<PackFile[], Error> {
  return useQuery({
    queryKey: ['pack', packFile],
    queryFn: () => api.getPackContents(packFile!),
    enabled: !!packFile, // Só executa se packFile não for null
    staleTime: 30000, // Cache por 30 segundos
  });
}

/**
 * Hook para buscar informações de um recurso específico
 */
export function useResourceInfo(
  packFile: string | null,
  resourceId: string | null
): UseQueryResult<ResourceInfo, Error> {
  return useQuery({
    queryKey: ['resource', packFile, resourceId],
    queryFn: () => api.getResourceInfo(packFile!, resourceId!),
    enabled: !!packFile && !!resourceId,
    staleTime: 60000,
  });
}

/**
 * Hook para buscar dados de mesh para renderização 3D
 */
export function useMeshData(
  packFile: string | null,
  resourceId: string | null
): UseQueryResult<MeshData, Error> {
  return useQuery({
    queryKey: ['mesh', packFile, resourceId],
    queryFn: () => api.getMeshData(packFile!, resourceId!),
    enabled: !!packFile && !!resourceId,
    retry: false,
    staleTime: 600000, // Cache por 10 minutos - meshes não mudam
  });
}
