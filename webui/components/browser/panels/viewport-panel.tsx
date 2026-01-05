"use client"

import { useCallback } from "react"
// REMOVA: import { useBrowser } from "@/context/browser-context"
// ADICIONE:
import { useBrowserStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"

import { ViewportContent } from "@/components/viewport"

export function ViewportPanel() {
  const { 
    selectedPackFile, 
    selectedPackChildren, 
    activePackName, 
    viewportOptions, 
    setViewportOptions,
    isolatedMeshName
  } = useBrowserStore(
    useShallow((state) => ({
      selectedPackFile: state.selectedPackFile,
      selectedPackChildren: state.selectedPackChildren,
      activePackName: state.activePackName,
      viewportOptions: state.viewportOptions,
      setViewportOptions: state.setViewportOptions,
      isolatedMeshName: state.isolatedMeshName,
    }))
  )

  const handleToggleCulling = useCallback(() => {
    // A lógica aqui muda levemente pois setViewportOptions do store espera um Partial<ViewportOptions>
    // e não aceita função de callback direto para o estado anterior da mesma forma que o useState.
    // Mas no seu store definimos: setViewportOptions: (options) => set((state) => ({ viewportOptions: { ...state.viewportOptions, ...newOptions } }))
    // Então podemos passar o valor invertido diretamente lendo de viewportOptions.
    setViewportOptions({ backfaceCulling: !viewportOptions.backfaceCulling })
  }, [setViewportOptions, viewportOptions.backfaceCulling])

  const handleToggleMaterials = useCallback(() => {
    setViewportOptions({ disableMaterials: !viewportOptions.disableMaterials })
  }, [setViewportOptions, viewportOptions.disableMaterials])

  return (
    <ViewportContent
      selectedResource={
        selectedPackFile
          ? {
              id: selectedPackFile.id,
              name: selectedPackFile.name,
              type: selectedPackFile.type,
              size: selectedPackFile.size,
            }
          : null
      }
      childResources={selectedPackChildren}
      packName={activePackName}
      backfaceCulling={viewportOptions.backfaceCulling}
      onToggleBackfaceCulling={handleToggleCulling}
      materialsDisabled={viewportOptions.disableMaterials}
      onToggleMaterials={handleToggleMaterials}
      isolatedMeshName={isolatedMeshName}
    />
  )
}
