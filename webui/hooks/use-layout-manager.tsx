"use client"

import type React from "react"
import { useState, useCallback, useRef, useEffect } from "react"

// =============================================================================
// TYPES
// =============================================================================

export type PanelTab = {
  id: string
  order: number
}

export type PanelState = {
  id: string
  tabs: PanelTab[]
  activeTabId: string
  column: number
  row: number
  width: number
  height: number
  isHidden: boolean
  isMaximized: boolean
}

export type LayoutState = {
  panels: PanelState[]
  columns: number[]
}

export type DragState = {
  type: "tab" | "resize-col"
  sourceId: string
  tabId?: string
  startX: number
  startY: number
  currentX: number
  currentY: number
  columnIndex?: number
  isDraggingFar: boolean
}

// =============================================================================
// DEFAULT LAYOUT
// =============================================================================

const DEFAULT_LAYOUT: LayoutState = {
  panels: [
    { id: "filesystem", tabs: [{ id: "filesystem", order: 0 }], activeTabId: "filesystem", column: 0, row: 0, width: 100, height: 100, isHidden: false, isMaximized: false },
    { id: "pack", tabs: [{ id: "pack", order: 0 }], activeTabId: "pack", column: 1, row: 0, width: 100, height: 100, isHidden: false, isMaximized: false },
    { id: "tree", tabs: [{ id: "tree", order: 0 }], activeTabId: "tree", column: 2, row: 0, width: 100, height: 100, isHidden: false, isMaximized: false },
    { id: "viewer", tabs: [{ id: "viewport", order: 0 }, { id: "imageviewer", order: 1 }], activeTabId: "viewport", column: 3, row: 0, width: 100, height: 100, isHidden: false, isMaximized: false },
    { id: "summary", tabs: [{ id: "summary", order: 0 }], activeTabId: "summary", column: 4, row: 0, width: 100, height: 100, isHidden: false, isMaximized: false },
  ],
  columns: [15, 15, 15, 35, 20],
}

// =============================================================================
// HOOK
// =============================================================================

export function useLayoutManager() {
  const [layout, setLayout] = useState<LayoutState>(DEFAULT_LAYOUT)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  
  const containerRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number | null>(null)
  
  // Ref para guardar o estado atual das colunas durante o drag (sem re-render)
  const columnsRef = useRef<number[]>(DEFAULT_LAYOUT.columns)
  // Ref para guardar o estado "commitado" mais recente
  const committedColumnsRef = useRef<number[]>(DEFAULT_LAYOUT.columns)

  // Sincroniza refs quando o layout muda externamente
  useEffect(() => {
    committedColumnsRef.current = layout.columns
    columnsRef.current = layout.columns
  }, [layout.columns])

  // ===== Column Resize Start =====
  const startColumnResize = useCallback((columnIndex: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Inicializa o ref de trabalho com o estado atual
    columnsRef.current = [...committedColumnsRef.current]

    setDragState({
      type: "resize-col",
      sourceId: `col-${columnIndex}`,
      columnIndex,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      isDraggingFar: true,
    })
  }, [])

  // ===== Tab Drag Start =====
  const startTabDrag = useCallback((panelId: string, tabId: string, e: React.MouseEvent) => {
    e.preventDefault()
    setDragState({
      type: "tab",
      sourceId: panelId,
      tabId,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      isDraggingFar: false,
    })
  }, [])

  // ===== Mouse Move Handler (Optimized) =====
  useEffect(() => {
    if (!dragState) return

    const handleMouseMove = (e: MouseEvent) => {
      // Throttle via RAF
      if (rafRef.current) cancelAnimationFrame(rafRef.current)

      rafRef.current = requestAnimationFrame(() => {
        // Atualiza estado visual do Drag (para tabs apenas)
        // Para resize, evitamos setDragState se possível, ou usamos apenas para cursor
        
        if (dragState.type === "resize-col" && dragState.columnIndex !== undefined && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect()
          const deltaX = e.clientX - dragState.startX // Delta desde o início do drag
          const deltaPercent = (deltaX / rect.width) * 100

          const idx = dragState.columnIndex
          const minWidth = 5 // %

          // Calcula novas colunas baseadas no estado INICIAL do drag (committed)
          const startCols = committedColumnsRef.current
          const newLeft = Math.max(minWidth, startCols[idx] + deltaPercent)
          const newRight = Math.max(minWidth, startCols[idx + 1] - deltaPercent)
          
          // Verifica limites
          if (newLeft >= minWidth && newRight >= minWidth) {
             // Atualiza Ref (não causa render)
             const newCols = [...startCols]
             newCols[idx] = newLeft
             newCols[idx + 1] = newRight
             columnsRef.current = newCols

             // 1. ATUALIZAÇÃO DIRETA DO GRID (PERFORMANCE CRÍTICA)
             // Monta string do gridTemplateColumns sem passar pelo React
             // Precisamos saber quais colunas são visíveis. 
             // Assumindo que o layout atual no state reflete a visibilidade correta:
             const visiblePanels = layout.panels.filter(p => !p.isHidden)
             const visibleColIndices = new Set(visiblePanels.map(p => p.column))
             
             const gridString = newCols.map((w, i) => visibleColIndices.has(i) ? `${w}%` : "0fr").join(" ")
             containerRef.current.style.gridTemplateColumns = gridString

             // 2. ATUALIZAÇÃO DIRETA DO HANDLE (PERFORMANCE CRÍTICA)
             // O handle é uma div absoluta. Precisamos movê-la.
             const handleEl = document.getElementById(`resize-handle-${idx}`)
             if (handleEl) {
               // Calcula a posição esquerda acumulada
               let leftSum = 0
               for (let i = 0; i <= idx; i++) {
                 leftSum += newCols[i]
               }
               handleEl.style.left = `calc(${leftSum}% - 4px)`
             }
          }
        } else {
           // Lógica original para Tabs (mantida via State pois envolve lógica de drop complexa)
           const dx = e.clientX - dragState.startX
           const dy = e.clientY - dragState.startY
           const distance = Math.sqrt(dx * dx + dy * dy)
           
           if (dragState.type === "tab") {
              const threshold = 15
              if (!dragState.isDraggingFar && distance > threshold) {
                 setDragState(prev => prev ? { ...prev, isDraggingFar: true, currentX: e.clientX, currentY: e.clientY } : null)
              } else if (dragState.isDraggingFar) {
                 setDragState(prev => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null)
              }
           }
        }
      })
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)

      if (dragState.type === "resize-col") {
        // COMMIT FINAL: Agora sim atualizamos o React State
        setLayout(prev => ({ ...prev, columns: columnsRef.current }))
      }

      // ... (Lógica de Drop de Tabs mantida idêntica à original) ...
      if (dragState.type === "tab") {
         const dx = e.clientX - dragState.startX
         const dy = e.clientY - dragState.startY
         const distance = Math.sqrt(dx * dx + dy * dy)
 
         if (distance < 15) {
           if (dragState.tabId) {
             setLayout((prev) => ({
               ...prev,
               panels: prev.panels.map((p) =>
                 p.id === dragState.sourceId ? { ...p, activeTabId: dragState.tabId! } : p,
               ),
             }))
           }
         } else if (dropTarget && dragState.tabId && dropTarget !== dragState.sourceId) {
           const sourcePanel = layout.panels.find((p) => p.id === dragState.sourceId)
           const targetPanel = layout.panels.find((p) => p.id === dropTarget)
 
           if (sourcePanel && targetPanel) {
             const tabToMove = sourcePanel.tabs.find((t) => t.id === dragState.tabId)
 
             if (tabToMove) {
               setLayout((prev) => {
                 const newPanels = prev.panels
                   .map((p) => {
                     if (p.id === sourcePanel.id) {
                       const newTabs = p.tabs.filter((t) => t.id !== dragState.tabId)
                       return {
                         ...p,
                         tabs: newTabs,
                         activeTabId: newTabs.length > 0 ? newTabs[0].id : p.activeTabId,
                       }
                     }
                     if (p.id === targetPanel.id) {
                       return {
                         ...p,
                         tabs: [...p.tabs, { ...tabToMove, order: p.tabs.length }],
                         activeTabId: tabToMove.id,
                       }
                     }
                     return p
                   })
                   .filter((p) => p.tabs.length > 0)
 
                 const removedPanel = prev.panels.find((p) => p.id === sourcePanel.id && sourcePanel.tabs.length === 1)
                 if (removedPanel) {
                   const removedCol = removedPanel.column
                   const newColumns = [...prev.columns]
                   const removedWidth = newColumns[removedCol]
 
                   if (removedCol > 0) {
                     newColumns[removedCol - 1] += removedWidth
                   } else if (newColumns.length > 1) {
                     newColumns[1] += removedWidth
                   }
                   newColumns.splice(removedCol, 1)
 
                   return {
                     columns: newColumns,
                     panels: newPanels.map((p) => ({
                       ...p,
                       column: p.column > removedCol ? p.column - 1 : p.column,
                     })),
                   }
                 }
 
                 return { ...prev, panels: newPanels }
               })
             }
           }
         }
       }

      setDragState(null)
      setDropTarget(null)
    }

    document.addEventListener("mousemove", handleMouseMove, { passive: true })
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [dragState, dropTarget, layout.panels]) // Dependências

  // ===== Tab Actions =====
  const setActiveTab = useCallback((panelId: string, tabId: string) => {
    setLayout((prev) => ({
      ...prev,
      panels: prev.panels.map((p) => (p.id === panelId ? { ...p, activeTabId: tabId } : p)),
    }))
  }, [])

  const detachTab = useCallback((panelId: string, tabId: string) => {
    setLayout((prev) => {
      const sourcePanel = prev.panels.find((p) => p.id === panelId)
      if (!sourcePanel || sourcePanel.tabs.length <= 1) return prev

      const tabToDetach = sourcePanel.tabs.find((t) => t.id === tabId)
      if (!tabToDetach) return prev

      const newPanelId = `panel-${tabId}-${Date.now()}`
      const newPanel: PanelState = {
        id: newPanelId,
        tabs: [{ id: tabId, order: 0 }],
        activeTabId: tabId,
        column: sourcePanel.column + 1,
        row: 0,
        width: 100,
        height: 100,
        isHidden: false,
        isMaximized: false,
      }

      const newColumns = [...prev.columns]
      const insertAt = sourcePanel.column + 1
      const sourceWidth = newColumns[sourcePanel.column]
      newColumns[sourcePanel.column] = sourceWidth * 0.6
      newColumns.splice(insertAt, 0, sourceWidth * 0.4)

      const updatedPanels = prev.panels.map((p) => {
        if (p.id === panelId) {
          const newTabs = p.tabs.filter((t) => t.id !== tabId)
          return {
            ...p,
            tabs: newTabs,
            activeTabId: newTabs[0]?.id || p.activeTabId,
          }
        }
        if (p.column >= insertAt) {
          return { ...p, column: p.column + 1 }
        }
        return p
      })

      return {
        columns: newColumns,
        panels: [...updatedPanels, newPanel],
      }
    })
  }, [])

  const reattachTab = useCallback((tabId: string, targetPanelId: string) => {
    setLayout((prev) => {
      const sourcePanel = prev.panels.find((p) => p.tabs.some((t) => t.id === tabId))
      const targetPanel = prev.panels.find((p) => p.id === targetPanelId)

      if (!sourcePanel || !targetPanel || sourcePanel.id === targetPanel.id) return prev

      const tab = sourcePanel.tabs.find((t) => t.id === tabId)
      if (!tab) return prev

      const newColumns = [...prev.columns]
      let updatedPanels = prev.panels.map((p) => {
        if (p.id === sourcePanel.id) {
          return { ...p, tabs: p.tabs.filter((t) => t.id !== tabId) }
        }
        if (p.id === targetPanel.id) {
          return {
            ...p,
            tabs: [...p.tabs, { ...tab, order: p.tabs.length }],
            activeTabId: tabId,
          }
        }
        return p
      })

      const emptyPanel = updatedPanels.find((p) => p.tabs.length === 0)
      if (emptyPanel) {
        const emptyCol = emptyPanel.column
        const emptyWidth = newColumns[emptyCol]

        if (emptyCol > 0) {
          newColumns[emptyCol - 1] += emptyWidth
        } else if (newColumns.length > 1) {
          newColumns[1] += emptyWidth
        }

        newColumns.splice(emptyCol, 1)

        updatedPanels = updatedPanels
          .filter((p) => p.tabs.length > 0)
          .map((p) => ({
            ...p,
            column: p.column > emptyCol ? p.column - 1 : p.column,
          }))
      }

      return { columns: newColumns, panels: updatedPanels }
    })
  }, [])

  // ===== Panel Actions =====
  const togglePanelHidden = useCallback((panelId: string) => {
    setLayout((prev) => ({
      ...prev,
      panels: prev.panels.map((p) => (p.id === panelId ? { ...p, isHidden: !p.isHidden } : p)),
    }))
  }, [])

  const togglePanelMaximized = useCallback((panelId: string) => {
    setLayout((prev) => ({
      ...prev,
      panels: prev.panels.map((p) =>
        p.id === panelId ? { ...p, isMaximized: !p.isMaximized } : { ...p, isMaximized: false },
      ),
    }))
  }, [])

  const resetLayout = useCallback(() => {
    setLayout(DEFAULT_LAYOUT)
    columnsRef.current = DEFAULT_LAYOUT.columns
  }, [])

  // ===== Drop Target =====
  const handleDragOver = useCallback(
    (panelId: string) => {
      if (dragState?.type === "tab" && dragState.isDraggingFar && dragState.sourceId !== panelId) {
        setDropTarget(panelId)
      }
    },
    [dragState],
  )

  const handleDragLeave = useCallback(() => {
    setDropTarget(null)
  }, [])

  return {
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
  }
}
