"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { ChromePicker, ColorResult } from "react-color"
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
  materialsDisabled?: boolean
  onToggleMaterials?: () => void
  isolatedMeshName?: string | null
}

export function ViewportContent({ selectedResource, childResources, packName, backfaceCulling = false, onToggleBackfaceCulling, materialsDisabled = false, onToggleMaterials, isolatedMeshName }: ViewportContentProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [backgroundColor, setBackgroundColor] = useState("#0a0a0a")
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false)
  const [renderColorPicker, setRenderColorPicker] = useState(false)
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

  const handleToggleColorPicker = useCallback(() => {
    setIsColorPickerOpen((prev) => !prev)
  }, [])

  const handleBackgroundColorChange = useCallback((color: ColorResult) => {
    setBackgroundColor(color.hex)
  }, [])

  // Controla montagem/desmontagem do picker para permitir anima‡Æo de sa¡da
  useEffect(() => {
    if (isColorPickerOpen) {
      setRenderColorPicker(true)
      return
    }

    if (!renderColorPicker) return
    const timeout = setTimeout(() => setRenderColorPicker(false), 150)
    return () => clearTimeout(timeout)
  }, [isColorPickerOpen, renderColorPicker])

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 relative overflow-hidden">
        <Scene 
          selectedResource={selectedResource} 
          childResources={childResources}
          packName={packName}
          onCameraRef={handleCameraRef}
          backfaceCulling={backfaceCulling}
          materialsDisabled={materialsDisabled}
          isolatedMeshName={isolatedMeshName}
          backgroundColor={backgroundColor}
        />

        {renderColorPicker && (
          <>
            <div 
              className="absolute inset-0 z-10" 
              onClick={() => setIsColorPickerOpen(false)}
            />
            <div className={`absolute bottom-16 right-3 z-20 shadow-lg border border-border rounded bg-background duration-150 ${isColorPickerOpen ? "animate-in fade-in-0 zoom-in-95" : "animate-out fade-out-0 zoom-out-95"}`}>
              <ChromePicker 
                color={backgroundColor} 
                onChange={handleBackgroundColorChange}
                disableAlpha 
              />
            </div>
          </>
        )}
        
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
          <div>Materials: {materialsDisabled ? 'OFF' : 'ON'}</div>
        </div>
      </div>

      <ViewportControls
        onResetCamera={handleResetCamera}
        onToggleFullscreen={handleToggleFullscreen}
        onExport={handleExport}
        onToggleCulling={onToggleBackfaceCulling}
        isCullingEnabled={backfaceCulling}
        onToggleMaterials={onToggleMaterials}
        areMaterialsDisabled={materialsDisabled}
        backgroundColor={backgroundColor}
        onToggleBackgroundPicker={handleToggleColorPicker}
      />
    </div>
  )
}
