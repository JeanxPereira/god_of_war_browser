"use client"

import type React from "react"
import { memo, useMemo } from "react"
import type { LayoutState, DragState } from "@/hooks/use-layout-manager"

type ResizableLayoutProps = {
  layout: LayoutState
  dragState: DragState | null
  containerRef: React.RefObject<HTMLDivElement | null>
  onColumnResize: (columnIndex: number, e: React.MouseEvent) => void
  renderPanel: (panelId: string) => React.ReactNode
}

export const ResizableLayout = memo(function ResizableLayout({
  layout,
  dragState,
  containerRef,
  onColumnResize,
  renderPanel,
}: ResizableLayoutProps) {
  const maximizedPanel = layout.panels.find((p) => p.isMaximized && !p.isHidden)
  const visiblePanels = useMemo(() => layout.panels.filter((p) => !p.isHidden), [layout.panels])

  const gridTemplateColumns = useMemo(() => {
    if (maximizedPanel) return "1fr"

    const visibleColumns = new Set(visiblePanels.map((p) => p.column))
    return layout.columns.map((width, idx) => (visibleColumns.has(idx) ? `${width}%` : "0fr")).join(" ")
  }, [layout.columns, visiblePanels, maximizedPanel])

  const resizeHandles = useMemo(() => {
    if (maximizedPanel) return []

    const handles: number[] = []
    const visibleColumns = [...new Set(visiblePanels.map((p) => p.column))].sort((a, b) => a - b)

    for (let i = 0; i < visibleColumns.length - 1; i++) {
      handles.push(visibleColumns[i])
    }

    return handles
  }, [visiblePanels, maximizedPanel])

  const handlePositions = useMemo(() => {
    return resizeHandles.map((colIndex) => {
      let left = 0
      for (let i = 0; i <= colIndex; i++) {
        left += layout.columns[i]
      }
      return { index: colIndex, left }
    })
  }, [resizeHandles, layout.columns])

  const isResizing = dragState?.type === "resize-col"

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden"
      style={{
        display: "grid",
        gridTemplateColumns,
        gap: "0px",
        height: "100%",
        willChange: isResizing ? "contents" : "auto",
      }}
    >
      {/* Panels */}
      {maximizedPanel ? (
        <div className="h-full overflow-hidden">{renderPanel(maximizedPanel.id)}</div>
      ) : (
        visiblePanels
          .sort((a, b) => a.column - b.column)
          .map((panel) => (
            <div
              key={panel.id}
              className="h-full overflow-hidden min-w-0"
              style={{
                contain: isResizing ? "strict" : "none",
              }}
            >
              {renderPanel(panel.id)}
            </div>
          ))
      )}

      {/* Column Resize Handles */}
      {!maximizedPanel &&
        handlePositions.map(({ index, left }) => (
          <div
            key={`resize-${index}`}
            className={`
              absolute top-0 bottom-0 w-1 z-30
              cursor-col-resize group
              transition-colors duration-75
              ${
                dragState?.type === "resize-col" && dragState.columnIndex === index
                  ? "bg-primary/50"
                  : "bg-transparent hover:bg-primary/30"
              }
            `}
            style={{
              left: `calc(${left}% - 4px)`,
              touchAction: "none",
            }}
            onMouseDown={(e) => onColumnResize(index, e)}
          >
            {/* Visual line indicator */}
            <div
              className={`
                absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2
                transition-colors duration-75
                ${
                  dragState?.type === "resize-col" && dragState.columnIndex === index
                    ? "bg-primary"
                    : "bg-transparent group-hover:bg-primary/60"
                }
              `}
            />
          </div>
        ))}

      {isResizing && <div className="fixed inset-0 z-50" style={{ cursor: "col-resize" }} />}

      {dragState?.type === "tab" && dragState.isDraggingFar && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: dragState.currentX + 10,
            top: dragState.currentY + 10,
          }}
        >
          <div className="bg-background border border-primary rounded px-2 py-1 text-xs font-mono shadow-lg">
            Moving tab...
          </div>
        </div>
      )}
    </div>
  )
})
