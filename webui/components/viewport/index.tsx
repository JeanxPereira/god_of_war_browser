"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Scene } from "./Scene"
import { ViewportControls } from "./Controls"

type ViewportContentProps = {
  selectedResource?: {
    id: string
    name: string
    type: string
    size?: number
  } | null
  childResources?: {
    id: string
    name: string
    type: string
    size?: number
  }[] | null
  packName?: string | null
  backfaceCulling?: boolean
  onToggleBackfaceCulling?: () => void
}

export function ViewportContent({ selectedResource, childResources, packName, backfaceCulling = false, onToggleBackfaceCulling }: ViewportContentProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const cameraControlsRef = useRef<any>(null)

  // Debug: log quando componente monta e quando recurso muda
  useEffect(() => {
    console.log('[ViewportContent] Component mounted')
  }, [])

  useEffect(() => {
    console.log('[ViewportContent] Selected resource changed:', selectedResource)
    console.log('[ViewportContent] Resource type:', selectedResource?.type)
    console.log('[ViewportContent] Resource name:', selectedResource?.name)
  }, [selectedResource])

  const handleCameraRef = useCallback((controls: any) => {
    console.log('[ViewportContent] Camera controls ref received:', controls)
    cameraControlsRef.current = controls
  }, [])

  const handleResetCamera = useCallback(() => {
    console.log('[ViewportContent] Reset camera clicked')
    if (cameraControlsRef.current) {
      console.log('[ViewportContent] Resetting camera to [-50, 50, -50]')
      // Reset camera position
      cameraControlsRef.current.object.position.set(-50, 50, -50)
      // Reset target to origin
      cameraControlsRef.current.target.set(0, 15, 0)
      // Update controls
      cameraControlsRef.current.update()
      console.log('[ViewportContent] Camera reset complete')
    } else {
      console.warn('[ViewportContent] Camera controls ref is null, cannot reset')
    }
  }, [])

  const handleToggleFullscreen = useCallback(() => {
    console.log('[ViewportContent] Toggle fullscreen')
    setIsFullscreen(!isFullscreen)
  }, [isFullscreen])

  const handleExport = useCallback(() => {
    console.log('[ViewportContent] Export clicked (not implemented yet)')
  }, [])

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 relative overflow-hidden">
        <Scene 
          selectedResource={selectedResource} 
          childResources={childResources}
          packName={packName}
          onCameraRef={handleCameraRef}
          backfaceCulling={backfaceCulling}
        />
        
        {/* Info overlay quando nada selecionado */}
        {!selectedResource && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center px-6 py-4 bg-background/80 backdrop-blur-sm border border-border rounded">
              <p className="text-sm font-mono text-muted-foreground mb-1">
                No resource selected
              </p>
              <p className="text-xs text-muted-foreground/70">
                Select a MESH from Tree View to visualize
              </p>
            </div>
          </div>
        )}

        {/* Info overlay do recurso selecionado */}
        {selectedResource && (
          <div className="absolute top-3 left-3 px-3 py-2 bg-background/90 backdrop-blur-sm border border-border rounded text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-primary font-bold">{selectedResource.type}</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-foreground">{selectedResource.name}</span>
            </div>
          </div>
        )}

        {/* Debug info */}
        <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/80 border border-green-500/50 rounded text-[10px] font-mono text-green-400">
          <div>DEBUG MODE</div>
          <div>Resource: {selectedResource ? 'YES' : 'NO'}</div>
          <div>Type: {selectedResource?.type || 'N/A'}</div>
          <div>Camera: {cameraControlsRef.current ? 'READY' : 'WAITING'}</div>
        </div>
      </div>

      <ViewportControls
        onResetCamera={handleResetCamera}
        onToggleFullscreen={handleToggleFullscreen}
        onExport={handleExport}
        onToggleCulling={onToggleBackfaceCulling}
        isCullingEnabled={backfaceCulling}
      />
    </div>
  )
}
