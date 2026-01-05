"use client"

import type React from "react"
import { memo, useCallback, useRef } from "react"
import { X, Maximize2, Minimize2, Unlink } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { PANEL_CONFIGS } from "@/lib/browser-constants"
import type { PanelState, DragState } from "@/hooks/use-layout-manager"

type PanelContainerProps = {
  panel: PanelState
  children: React.ReactNode
  isDropTarget: boolean
  dragState: DragState | null
  onTabClick: (tabId: string) => void
  onTabDragStart: (tabId: string, e: React.MouseEvent) => void
  onTabDetach: (tabId: string) => void
  onHide: () => void
  onMaximize: () => void
  onDragOver: () => void
  onDragLeave: () => void
}

export const PanelContainer = memo(function PanelContainer({
  panel,
  children,
  isDropTarget,
  dragState,
  onTabClick,
  onTabDragStart,
  onTabDetach,
  onHide,
  onMaximize,
  onDragOver,
  onDragLeave,
}: PanelContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTabMouseDown = useCallback(
    (tabId: string, e: React.MouseEvent) => {
      e.preventDefault()
      onTabDragStart(tabId, e)
    },
    [onTabDragStart],
  )

  const isDraggingThisTab = dragState?.type === "tab" && dragState.sourceId === panel.id

  return (
    <TooltipProvider>
      <div
        ref={containerRef}
        className={`
          flex flex-col h-full bg-background border border-border overflow-hidden
          transition-all duration-100 ease-out
          ${isDropTarget ? "border-primary border-2 shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]" : ""}
        `}
        onMouseEnter={onDragOver}
        onMouseLeave={onDragLeave}
      >
        {/* Header with tabs */}
        <div className="flex items-center h-7 bg-muted/50 border-b border-border shrink-0">
          {/* Tabs */}
          <div className="flex-1 flex items-center overflow-x-auto scrollbar-none">
            {panel.tabs.map((tab) => {
              const config = PANEL_CONFIGS[tab.id]
              const isActive = panel.activeTabId === tab.id
              const isBeingDragged = dragState?.type === "tab" && dragState.tabId === tab.id && dragState.isDraggingFar

              return (
                <div
                  key={tab.id}
                  onMouseDown={(e) => handleTabMouseDown(tab.id, e)}
                  className={`
                    group flex items-center gap-1.5 px-3 h-full text-[10px] font-mono uppercase tracking-wider
                    border-r border-border transition-all duration-75 shrink-0 select-none
                    ${
                      isActive
                        ? "bg-background text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }
                    ${isBeingDragged ? "opacity-50" : "opacity-100"}
                    cursor-pointer
                  `}
                >
                  <span className={isActive ? "text-primary" : ""}>{config?.icon}</span>
                  <span>{config?.title}</span>

                  {/* Detach button for multi-tab panels */}
                  {panel.tabs.length > 1 && isActive && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            onTabDetach(tab.id)
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="ml-1 p-0.5 opacity-0 group-hover:opacity-100 hover:bg-muted rounded transition-opacity cursor-pointer"
                        >
                          <Unlink className="w-2.5 h-2.5" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-[10px]">
                        Detach Tab
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onMaximize}
                  className="p-1.5 hover:bg-amber-700/20 text-muted-foreground hover:text-amber-700 border-l border-border transition-colors"
                >
                  {panel.isMaximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                {panel.isMaximized ? "Restore" : "Maximize"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onHide}
                  className="p-1.5 hover:bg-destructive/20 text-muted-foreground hover:text-destructive border-l border-border transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                Hide Panel
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Content - always visible */}
        <div className="flex-1 overflow-hidden relative">{children}</div>

        {isDropTarget && <div className="absolute inset-0 pointer-events-none border-2 border-primary rounded-sm" />}
      </div>
    </TooltipProvider>
  )
})
