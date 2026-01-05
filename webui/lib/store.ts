import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { FileNode, PackFile, TreeSelector, ViewportOptions } from "@/types/browser-types"

interface BrowserState {
  // Estado de Seleção
  selectedFsFile: FileNode | null
  selectedPackFile: PackFile | null
  selectedPackChildren: PackFile[]
  activePackName: string | null
  selectedTreeNode: FileNode | null
  
  // Estado de Filtros
  packFilter: string
  treeFilter: string
  
  // Estado de Configuração
  treeSelectors: TreeSelector[]
  viewportOptions: ViewportOptions
  isolatedMeshName: string | null
  
  // Actions (Setters)
  setSelectedFsFile: (file: FileNode | null) => void
  setSelectedPackFile: (file: PackFile | null) => void
  setSelectedPackChildren: (children: PackFile[]) => void
  setActivePackName: (name: string | null) => void
  setSelectedTreeNode: (node: FileNode | null) => void
  setPackFilter: (filter: string) => void
  setTreeFilter: (filter: string) => void
  setTreeSelectors: (selectors: TreeSelector[]) => void
  setViewportOptions: (options: Partial<ViewportOptions>) => void
  setIsolatedMeshName: (name: string | null) => void
  
  // Action auxiliar para resetar seleção ao mudar de pack
  resetPackSelection: () => void
}

export const useBrowserStore = create<BrowserState>()(
  subscribeWithSelector((set) => ({
    // Valores Iniciais
    selectedFsFile: null,
    selectedPackFile: null,
    selectedPackChildren: [],
    activePackName: null,
    selectedTreeNode: null,
    packFilter: "WAD",
    treeFilter: "",
    treeSelectors: [
      { id: "nodes", label: "Nodes", active: true },
      { id: "tags", label: "Tags", active: false },
    ],
    viewportOptions: {
      showSkeletonIds: true,
      showSkeleton: true,
      showEntity: true,
      showInstance: true,
      showCollision: true,
      showCollisionStatic: true,
      showCollisionDebug: true,
      showLights: true,
      backfaceCulling: false,
      enableAnimation: true,
      disableMaterials: false,
    },
    isolatedMeshName: null,

    // Implementação das Actions
    setSelectedFsFile: (selectedFsFile) => set({ selectedFsFile }),
    
    setSelectedPackFile: (selectedPackFile) => set({ selectedPackFile }),
    
    setSelectedPackChildren: (selectedPackChildren) => set({ selectedPackChildren }),
    
    setActivePackName: (activePackName) => set({ activePackName }),
    
    setSelectedTreeNode: (selectedTreeNode) => set({ selectedTreeNode }),
    
    setPackFilter: (packFilter) => set({ packFilter }),
    
    setTreeFilter: (treeFilter) => set({ treeFilter }),
    
    setTreeSelectors: (treeSelectors) => set({ treeSelectors }),
    
    setViewportOptions: (newOptions) => 
      set((state) => ({ 
        viewportOptions: { ...state.viewportOptions, ...newOptions } 
      })),
    
    setIsolatedMeshName: (isolatedMeshName) => set({ isolatedMeshName }),

    resetPackSelection: () => set({
      selectedPackFile: null,
      selectedPackChildren: [],
      selectedTreeNode: null
    })
  }))
)
