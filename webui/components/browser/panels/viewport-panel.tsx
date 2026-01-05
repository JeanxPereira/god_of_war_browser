"use client"

import { useCallback } from "react"
import { useBrowser } from "@/context/browser-context"
import { ViewportContent } from "@/components/viewport"

export function ViewportPanel() {
  const { selectedPackFile, selectedPackChildren, activePackName, viewportOptions, setViewportOptions } = useBrowser()

  const handleToggleCulling = useCallback(() => {
    setViewportOptions((prev) => ({ ...prev, backfaceCulling: !prev.backfaceCulling }))
  }, [setViewportOptions])

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
    />
  )
}
