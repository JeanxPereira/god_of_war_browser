// Cliente para comunicação com o backend Go
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v2';

export type FileNode = {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  size?: number;
  extension?: string;
};

export type PackFile = {
  id: string;
  name: string;
  type: string;
  size: number;
  offset: number;
};

export type ResourceInfo = {
  id: string;
  name: string;
  type: string;
  size: number;
  offset: number;
  properties?: Record<string, any>;
  hexPreview?: string;
};

export type MeshData = {
  vertices: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
  vertexCount: number;
  indexCount: number;
  boundingBox: [number, number, number, number, number, number];
  materialId: number;
  hasNormals: boolean;
  hasUvs: boolean;
};

type APIResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

class GowBrowserAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const err = new Error(`HTTP error! status: ${response.status}`) as Error & { status?: number; body?: string };
        err.status = response.status;
        try {
          err.body = await response.text();
        } catch {
          // ignore secondary failure
        }
        throw err;
      }

      const result: APIResponse<T> = await response.json();

      if (!result.success) {
        const err = new Error(result.error || 'API request failed') as Error & { status?: number };
        err.status = response.status;
        throw err;
      }

      return result.data as T;
    } catch (error) {
      const status = (error as { status?: number }).status
      if (status && status >= 400 && status < 500) {
        console.warn('API client warning:', error)
      } else {
        console.error('API Error:', error);
      }
      throw error;
    }
  }

  /**
   * Obtém a árvore completa do sistema de arquivos
   */
  async getFileSystem(): Promise<FileNode[]> {
    return this.fetch<FileNode[]>('/filesystem');
  }

  /**
   * Obtém o conteúdo de um arquivo WAD/pack
   */
  async getPackContents(packFile: string): Promise<PackFile[]> {
    return this.fetch<PackFile[]>(`/pack/${encodeURIComponent(packFile)}/contents`);
  }

  /**
   * Obtém informações detalhadas de um recurso específico
   */
  async getResourceInfo(packFile: string, resourceId: string): Promise<ResourceInfo> {
    return this.fetch<ResourceInfo>(
      `/pack/${encodeURIComponent(packFile)}/resource/${resourceId}`
    );
  }

  /**
   * Obtém dados de uma mesh para renderização 3D
   */
  async getMeshData(packFile: string, resourceId: string): Promise<MeshData> {
    return this.fetch<MeshData>(`/pack/${encodeURIComponent(packFile)}/mesh/${resourceId}`);
  }

  /**
   * Obtém uma textura
   */
  async getTexture(packFile: string, resourceId: string): Promise<Blob> {
    const url = `${this.baseUrl}/pack/${encodeURIComponent(packFile)}/texture/${resourceId}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch texture: ${response.status}`);
    }
    
    return response.blob();
  }
}

export const api = new GowBrowserAPI();
