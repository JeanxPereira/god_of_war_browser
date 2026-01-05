"use client"

import { Download } from "lucide-react"
import { useBrowser } from "@/context/browser-context"
import { useFileSystem } from "@/hooks/use-api"
import { TreeNodeItem } from "@/components/browser/tree-node-item"
import type { FileNode } from "@/types/browser-types"

export function FileSystemContent() {
  const { selectedFsFile, setSelectedFsFile, setSelectedPackFile, setSelectedPackChildren, setActivePackName } =
    useBrowser()
  const { data, isLoading, isError, error, refetch } = useFileSystem()
  const fileTree = data ?? []

  const handleSelect = (node: FileNode) => {
    setSelectedFsFile(node)
    if (node.type === "file") {
      setActivePackName(node.name)
      setSelectedPackFile(null)
      setSelectedPackChildren([])
    } else {
      setActivePackName(null)
      setSelectedPackChildren([])
    }
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-mono">
        Loading file system...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-xs font-mono">
        <span className="text-destructive">Failed to load file system</span>
        <span className="text-muted-foreground">{error?.message ?? "Unexpected error"}</span>
        <button
          onClick={() => refetch()}
          className="px-2 py-1 border border-border bg-muted hover:border-primary/50 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!fileTree.length) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-mono">
        No files found
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-1 space-y-1">
      {fileTree.map((node) => (
        <TreeNodeItem
          key={node.id}
          node={node}
          selectedId={selectedFsFile?.id}
          onSelect={handleSelect}
          renderActions={(n) =>
            n.type === "file" ? (
              <a
                href={`/dump/fs/${encodeURIComponent(n.id)}`}
                download
                className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold text-primary hover:underline"
                title="Download"
              >
                <Download className="w-3 h-3" />
              </a>
            ) : null
          }
        />
      ))}
      <p className="text-[10px] text-muted-foreground font-mono px-1">Download-only view (legacy driver)</p>
    </div>
  )
}
