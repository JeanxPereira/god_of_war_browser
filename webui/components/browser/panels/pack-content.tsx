"use client"

import { useCallback, useMemo } from "react"
import { Filter, Download } from "lucide-react"
import { useBrowserStore } from "@/lib/store" // Store Zustand
import { useShallow } from "zustand/react/shallow"
import { useFileSystem } from "@/hooks/use-api"
import type { FileNode } from "@/types/browser-types"

export function PackContent() {
  // Conexão com Store via seletores (com useShallow para performance)
  const { 
    packFilter, 
    setPackFilter, 
    activePackName, 
    setActivePackName, 
    resetPackSelection 
  } = useBrowserStore(
    useShallow((state) => ({
      packFilter: state.packFilter,
      setPackFilter: state.setPackFilter,
      activePackName: state.activePackName,
      setActivePackName: state.setActivePackName,
      resetPackSelection: state.resetPackSelection
    }))
  )

  const { data, isLoading, isError, error, refetch } = useFileSystem()

  const flattenFiles = useCallback((nodes: FileNode[]): FileNode[] => {
    const result: FileNode[] = []
    nodes.forEach((node) => {
      if (node.type === "file") {
        result.push(node)
      }
      if (node.children) {
        result.push(...flattenFiles(node.children))
      }
    })
    return result
  }, [])

  const files = useMemo(() => (data ? flattenFiles(data) : []), [data, flattenFiles])
  
  const filteredFiles = useMemo(() => {
    return files.filter(
      (f) =>
        f.name.toLowerCase().includes(packFilter.toLowerCase()) ||
        f.extension?.toLowerCase().includes(packFilter.toLowerCase()),
    )
  }, [files, packFilter])

  const handleSelect = (file: FileNode) => {
    setActivePackName(file.name)
    resetPackSelection() // Substitui as chamadas individuais de limpar seleção
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-1.5 border-b border-border">
        <div className="relative">
          <Filter className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <input
            type="text"
            value={packFilter}
            onChange={(e) => setPackFilter(e.target.value)}
            placeholder="Filter..."
            className="w-full h-6 pl-6 pr-2 text-xs font-mono bg-muted border border-border focus:border-primary focus:outline-none"
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {isLoading && (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-mono">
            Loading packs...
          </div>
        )}
        {isError && (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-xs font-mono">
            <span className="text-destructive">Failed to load packs</span>
            <span className="text-muted-foreground">{error?.message ?? "Unexpected error"}</span>
            <button
              onClick={() => refetch()}
              className="px-2 py-1 border border-border bg-muted hover:border-primary/50 transition-colors"
            >
              Retry
            </button>
          </div>
        )}
        {!isLoading && !isError && filteredFiles.length === 0 && (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-mono">
            No pack files
          </div>
        )}
        {!isLoading &&
          !isError &&
          filteredFiles.map((file) => (
            <div
              key={file.id}
              className={`
                w-full flex items-center justify-between px-2 py-1 text-xs font-mono gap-2
                border-b border-border/50 hover:bg-muted transition-colors
                ${activePackName === file.name ? "bg-primary/20 text-primary" : ""}
              `}
            >
              <button onClick={() => handleSelect(file)} className="flex-1 text-left truncate">
                {file.name}
              </button>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={`/dump/pack/${encodeURIComponent(file.name)}`}
                  download
                  className="p-1 hover:text-primary text-muted-foreground"
                  title="Download"
                >
                  <Download className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}