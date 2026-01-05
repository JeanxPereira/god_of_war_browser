"use client"
import Image from "next/image"
import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { Lock, Unlock, RotateCcw, Layers2, Link2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { usePackContents } from "@/hooks/use-api"

// Layout system
import { useLayoutManager } from "@/hooks/use-layout-manager"
import { ResizableLayout } from "@/components/browser/resizable-layout"
import { PanelContainer } from "@/components/browser/panel-container"

// Store Global (Zustand)
import { useBrowserStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow" // <--- IMPORTANTE

// Constants
import { PANEL_CONFIGS } from "@/lib/browser-constants"

// Panel Components
import { FileSystemContent } from "@/components/browser/panels/file-system-content"
import { PackContent } from "@/components/browser/panels/pack-content"
import { TreeContent } from "@/components/browser/panels/tree-content"
import { SummaryContent } from "@/components/browser/panels/summary-content"
import { ViewportPanel } from "@/components/browser/panels/viewport-panel"
import { ImageViewerPanel } from "@/components/browser/panels/image-viewer-panel"

// =============================================================================
// MAIN BROWSER COMPONENT
// =============================================================================

export default function GameFileBrowser() {
  // 1. Layout Manager
  const {
    layout,
    dragState,
    dropTarget,
    containerRef,
    startColumnResize,
    startTabDrag,
    setActiveTab,
    detachTab,
    reattachTab,
    togglePanelHidden,
    togglePanelMaximized,
    resetLayout,
    handleDragOver,
    handleDragLeave,
  } = useLayoutManager()

  const [isLocked, setIsLocked] = useState(false)

  // 2. Integração com Store (Zustand)
  // CORREÇÃO: Uso de useShallow para evitar re-renders infinitos
  const { 
    activePackName,
    selectedPackFile,
    setActivePackName, 
    setSelectedPackFile, 
    setSelectedPackChildren, 
    setSelectedTreeNode 
  } = useBrowserStore(
    useShallow((state) => ({
      activePackName: state.activePackName,
      selectedPackFile: state.selectedPackFile,
      setActivePackName: state.setActivePackName,
      setSelectedPackFile: state.setSelectedPackFile,
      setSelectedPackChildren: state.setSelectedPackChildren,
      setSelectedTreeNode: state.setSelectedTreeNode
    }))
  )

  const [pendingHashSelection, setPendingHashSelection] = useState<{ pack: string; id?: string } | null>(null)
  const lastHashRef = useRef<string>("")
  const suppressNextHashChange = useRef(false)

  // Fetching de dados baseado na store
  const { data: hashPackContents } = usePackContents(activePackName)

  // 3. Sincronização URL Hash
  useEffect(() => {
    if (typeof window === "undefined") return

    const applyHash = () => {
      const rawHash = window.location.hash
      if (suppressNextHashChange.current) {
        suppressNextHashChange.current = false
        lastHashRef.current = rawHash
        return
      }

      const hash = rawHash.replace(/^#/, "").replace(/^\/+/, "")
      if (!hash || rawHash === lastHashRef.current) return

      const parts = hash.split("/").filter(Boolean)
      if (!parts.length) return

      const pack = decodeURIComponent(parts[0])
      const id = parts[1] ? decodeURIComponent(parts[1]) : undefined

      lastHashRef.current = rawHash
      
      // Atualiza via Store
      setActivePackName(pack)
      setSelectedPackFile(null)
      setSelectedPackChildren([])
      setPendingHashSelection({ pack, id })
    }

    applyHash()
    window.addEventListener("hashchange", applyHash)
    return () => window.removeEventListener("hashchange", applyHash)
  }, [setActivePackName, setSelectedPackFile, setSelectedPackChildren])

  useEffect(() => {
    if (!pendingHashSelection) return
    if (pendingHashSelection.pack !== activePackName) return
    if (!hashPackContents) return

    if (pendingHashSelection.id) {
      const match = hashPackContents.find((pf) => String(pf.id) === pendingHashSelection.id)
      if (match) {
        setSelectedPackFile(match)
        setSelectedPackChildren([])
        setSelectedTreeNode(null)
        setPendingHashSelection(null)
      }
    } else {
      setSelectedPackFile(null)
      setSelectedPackChildren([])
      setSelectedTreeNode(null)
      setPendingHashSelection(null)
    }
  }, [pendingHashSelection, activePackName, hashPackContents, setSelectedPackFile, setSelectedPackChildren, setSelectedTreeNode])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!activePackName) {
      if (window.location.hash) window.location.hash = ""
      return
    }

    const hash = selectedPackFile
      ? `#/${encodeURIComponent(activePackName)}/${encodeURIComponent(selectedPackFile.id)}`
      : `#/${encodeURIComponent(activePackName)}`

    if (window.location.hash !== hash) {
      suppressNextHashChange.current = true
      window.location.hash = hash
      lastHashRef.current = hash
    }
  }, [activePackName, selectedPackFile])

  // 4. Panel Rendering
  const getPanelContent = useCallback((tabId: string) => {
    switch (tabId) {
      case "filesystem":
        return <FileSystemContent />
      case "pack":
        return <PackContent />
      case "tree":
        return <TreeContent />
      case "summary":
        return <SummaryContent />
      case "viewport":
        return <ViewportPanel />
      case "imageviewer":
        return <ImageViewerPanel />
      default:
        return null
    }
  }, [])

  const hiddenPanels = useMemo(() => layout.panels.filter((p) => p.isHidden), [layout.panels])

  const detachedViewerTabs = useMemo(() => {
    const viewerTabIds = ["viewport", "imageviewer"]
    return layout.panels.filter((p) => p.tabs.length === 1 && viewerTabIds.includes(p.tabs[0].id))
  }, [layout.panels])

  const renderPanel = useCallback(
    (panelId: string) => {
      const panel = layout.panels.find((p) => p.id === panelId)
      if (!panel || panel.isHidden) return null

      return (
        <PanelContainer
          panel={panel}
          isDropTarget={dropTarget === panelId}
          isDragging={dragState?.sourceId === panelId}
          onTabClick={(tabId) => setActiveTab(panelId, tabId)}
          onTabDragStart={(tabId, e) => startTabDrag(panelId, tabId, e)}
          onTabDetach={(tabId) => detachTab(panelId, tabId)}
          onHide={() => togglePanelHidden(panelId)}
          onMaximize={() => togglePanelMaximized(panelId)}
          onDragOver={() => handleDragOver(panelId)}
          onDragLeave={handleDragLeave}
        >
          {getPanelContent(panel.activeTabId)}
        </PanelContainer>
      )
    },
    [
      layout.panels,
      dropTarget,
      dragState,
      setActiveTab,
      startTabDrag,
      detachTab,
      togglePanelHidden,
      togglePanelMaximized,
      handleDragOver,
      handleDragLeave,
      getPanelContent,
    ],
  )

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden">
        {/* Top Bar */}
        <div className="h-9 flex items-center justify-between px-2 bg-muted/30 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Image src="/icon.png" width={24} height={24} alt="God of War Browser" />
              <span className="text-xs font-mono font-bold tracking-wider">God Of War - Browser</span>
            </div>

            <div className="w-px h-4 bg-border" />

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                  <Layers2 className="w-3 h-3" />
                  <span>Drag tabs to merge • Drag dividers to resize</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="text-[10px]">
                Drag tabs onto other panels to merge, drag column dividers to resize
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-2">
            {/* Hidden Panels Restore */}
            {hiddenPanels.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground font-mono">Hidden:</span>
                {hiddenPanels.map((panel) => {
                  const config = PANEL_CONFIGS[panel.activeTabId]
                  return (
                    <Tooltip key={panel.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => togglePanelHidden(panel.id)}
                          className="p-1 bg-muted border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {config?.icon}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="text-[10px]">Show {config?.title}</TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            )}

            {/* Detached viewer tabs */}
            {detachedViewerTabs.length > 0 && detachedViewerTabs.length < 2 && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground font-mono">Detached:</span>
                {detachedViewerTabs.map((panel) => {
                  const tabId = panel.tabs[0].id
                  const config = PANEL_CONFIGS[tabId]
                  const targetPanel = layout.panels.find(
                    (p) => p.tabs.some((t) => t.id === "viewport" || t.id === "imageviewer") && p.id !== panel.id,
                  )

                  if (!targetPanel) return null

                  return (
                    <Tooltip key={panel.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => reattachTab(tabId, targetPanel.id)}
                          className="p-1 bg-primary/20 border border-primary/50 hover:border-primary text-primary transition-colors flex items-center gap-1"
                        >
                          {config?.icon}
                          <Link2 className="w-2.5 h-2.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="text-[10px]">
                        Re-attach {config?.title} to viewer panel
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            )}

            {/* Reset Layout */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={resetLayout}
                  className="p-1 border bg-muted border-border hover:border-primary/50 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-[10px]">Reset Layout</TooltipContent>
            </Tooltip>

            {/* Lock Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsLocked(!isLocked)}
                  className={`p-1 border transition-colors ${
                    isLocked
                      ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
                      : "bg-muted border-border hover:border-primary/50 text-muted-foreground"
                  }`}
                >
                  {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-[10px]">{isLocked ? "Unlock Layout" : "Lock Layout"}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Main Layout */}
        <ResizableLayout
          layout={layout}
          dragState={dragState}
          containerRef={containerRef}
          onColumnResize={startColumnResize}
          renderPanel={renderPanel}
        />
      </div>
    </TooltipProvider>
  )
}