"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Filter, Download } from "lucide-react"
import { useBrowser } from "@/context/browser-context"
import { usePackContents } from "@/hooks/use-api"
import { LEGACY_BASE_URL } from "@/lib/browser-constants"
import { TreeNodeItem } from "@/components/browser/tree-node-item"
import type { FileNode, PackFile, LegacyTag, LegacyTreeResponse } from "@/types/browser-types"

function useLegacyPackTree(packName: string | null) {
  const [data, setData] = useState<LegacyTreeResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchTree = useCallback(async () => {
    if (!packName) {
      setData(null)
      setError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${LEGACY_BASE_URL}/json/pack/${encodeURIComponent(packName)}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const json = (await response.json()) as LegacyTreeResponse & { error?: string }
      if (json?.error) {
        throw new Error(json.error)
      }

      setData(json)
    } catch (err) {
      setError(err as Error)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [packName])

  useEffect(() => {
    void fetchTree()
  }, [fetchTree])

  return { data, isLoading, isError: !!error, error, refetch: fetchTree }
}

export function TreeContent() {
  const {
    treeFilter,
    setTreeFilter,
    treeSelectors,
    setTreeSelectors,
    activePackName,
    selectedPackFile,
    setSelectedPackFile,
    setSelectedPackChildren,
    setSelectedTreeNode,
  } = useBrowser()
  const {
    data: packFiles,
    isLoading: isPackLoading,
    isError: isPackError,
    error: packError,
    refetch: refetchPack,
  } = usePackContents(activePackName)
  const {
    data: legacyTree,
    isLoading: isTreeLoading,
    isError: isTreeError,
    error: treeError,
    refetch: refetchTree,
  } = useLegacyPackTree(activePackName)

  const treeMode: "nodes" | "tags" = useMemo(
    () => (treeSelectors.find((s) => s.active)?.id === "tags" ? "tags" : "nodes"),
    [treeSelectors],
  )

  const setTreeMode = useCallback(
    (mode: "nodes" | "tags") => {
      setTreeSelectors((prev) => prev.map((s) => ({ ...s, active: s.id === mode })))
    },
    [setTreeSelectors],
  )

  const packFileById = useMemo(() => {
    const map: Record<string, PackFile> = {}
    packFiles?.forEach((file) => {
      map[file.id] = file
    })
    return map
  }, [packFiles])

  const legacyTagById = useMemo(() => {
    const map: Record<string, LegacyTag> = {}
    legacyTree?.Tags?.forEach((tag) => {
      map[String(tag.Id)] = tag
    })
    legacyTree?.Nodes?.forEach((node) => {
      map[String(node.Tag.Id)] = node.Tag
    })
    return map
  }, [legacyTree])

  const treeNodes = useMemo(() => {
    if (!legacyTree?.Nodes?.length) return []

    const buildNode = (index: number): FileNode | null => {
      const node = legacyTree.Nodes?.[index]
      if (!node) return null

      const children = (node.SubGroupNodes ?? [])
        .map((childIndex) => buildNode(childIndex))
        .filter(Boolean) as FileNode[]

      // const displayName = `${node.Tag.Id.toString().padStart(4, "0")}.${node.Tag.Name}`
      const displayName = `${node.Tag.Name}`
      return {
        id: String(node.Tag.Id),
        name: displayName,
        type: children.length ? "folder" : "file",
        children: children.length ? children : undefined,
        extension: `0x${node.Tag.Tag.toString(16).padStart(3, "0")}`,
        size: node.Tag.Size,
      }
    }

    const roots = legacyTree.Roots && legacyTree.Roots.length ? legacyTree.Roots : legacyTree.Nodes.map((_, idx) => idx)
    return roots.map((rootIndex) => buildNode(rootIndex)).filter(Boolean) as FileNode[]
  }, [legacyTree])

  const tagNodes = useMemo(() => {
    if (!legacyTree?.Tags?.length) return []
    return legacyTree.Tags.map((tag) => ({
      id: String(tag.Id),
      name: `${tag.Id.toString().padStart(4, "0")}.${tag.Name}`,
      type: "file" as const,
      extension: `0x${tag.Tag.toString(16).padStart(3, "0")}`,
      size: tag.Size,
    }))
  }, [legacyTree])

  const filterTree = useCallback((nodes: FileNode[], term: string): FileNode[] => {
    const search = term.trim().toLowerCase()
    if (!search) return nodes

    const matchNode = (node: FileNode): FileNode | null => {
      const filteredChildren = node.children ? (node.children.map(matchNode).filter(Boolean) as FileNode[]) : []
      const matches =
        node.name.toLowerCase().includes(search) || node.extension?.toLowerCase().includes(search) || false

      if (matches || filteredChildren.length) {
        return { ...node, children: filteredChildren.length ? filteredChildren : undefined }
      }
      return null
    }

    return nodes.map(matchNode).filter(Boolean) as FileNode[]
  }, [])

  const displayedNodes = useMemo(() => {
    const source = treeMode === "tags" ? tagNodes : treeNodes
    return filterTree(source, treeFilter)
  }, [treeMode, tagNodes, treeNodes, treeFilter, filterTree])

  const resolvePackFile = useCallback(
    (node: FileNode): PackFile | null => {
      const fromApi = packFileById[node.id]
      if (fromApi) return fromApi

      const tag = legacyTagById[node.id]
      if (tag) {
        return {
          id: String(tag.Id),
          name: tag.Name,
          type: `0x${tag.Tag.toString(16).padStart(4, "0")}`,
          size: Number(tag.Size ?? 0),
          offset: 0,
        }
      }

      return null
    },
    [legacyTagById, packFileById],
  )

  const collectChildPackFiles = useCallback(
    (node: FileNode): PackFile[] => {
      const walk = (n: FileNode): PackFile[] => {
        const result: PackFile[] = []
        n.children?.forEach((child) => {
          const pf = resolvePackFile(child)
          if (pf) result.push(pf)
          result.push(...walk(child))
        })
        return result
      }
      return walk(node)
    },
    [resolvePackFile],
  )

  const handleSelect = (node: FileNode) => {
    const packFile = resolvePackFile(node)
    const childPackFiles = collectChildPackFiles(node)
    if (packFile) {
      setSelectedPackFile(packFile)
    } else {
      setSelectedPackFile(null)
    }
    setSelectedPackChildren(childPackFiles)
    setSelectedTreeNode(node)
  }

  const isLoading = activePackName ? isPackLoading || isTreeLoading : false
  const hasError = (activePackName && (isPackError || isTreeError)) ?? false
  const errorMessage = treeError?.message || packError?.message

  return (
    <div className="h-full flex flex-col">
      <div className="p-1.5 border-b border-border space-y-1.5">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTreeMode("nodes")}
            className={`
              px-1.5 py-0.5 text-[10px] font-mono font-medium border transition-colors
              ${treeMode === "nodes" ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border hover:border-primary/50"}
            `}
          >
            Nodes
          </button>
          <button
            onClick={() => setTreeMode("tags")}
            className={`
              px-1.5 py-0.5 text-[10px] font-mono font-medium border transition-colors
              ${treeMode === "tags" ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border hover:border-primary/50"}
            `}
          >
            Tags
          </button>
          <span className="text-[10px] text-muted-foreground font-mono ml-1">
            {treeMode === "nodes" ? "Hierarchy" : "Flat tag list"}
          </span>
        </div>
        <div className="relative">
          <Filter className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <input
            type="text"
            value={treeFilter}
            onChange={(e) => setTreeFilter(e.target.value)}
            placeholder={activePackName ? `Filter ${activePackName}...` : "Select a pack to load tree"}
            className="w-full h-6 pl-6 pr-2 text-xs font-mono bg-muted border border-border focus:border-primary focus:outline-none"
            disabled={!activePackName}
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto p-1">
        {!activePackName && (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-mono">
            Select a pack from "Pack Contents" to view its tree
          </div>
        )}
        {activePackName && isLoading && (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-mono">
            Loading {activePackName}...
          </div>
        )}
        {activePackName && hasError && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-xs font-mono text-center px-2">
            <span className="text-destructive">Failed to load {activePackName}</span>
            <span className="text-muted-foreground">{errorMessage ?? "Unexpected error"}</span>
            <button
              onClick={() => {
                refetchTree()
                refetchPack()
              }}
              className="px-2 py-1 border border-border bg-muted hover:border-primary/50 transition-colors"
            >
              Retry
            </button>
          </div>
        )}
        {activePackName && !isLoading && !hasError && displayedNodes.length === 0 && (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-mono">
            No resources match the filters
          </div>
        )}
        {activePackName &&
          !isLoading &&
          !hasError &&
          displayedNodes.map((node) => (
            <TreeNodeItem
              key={node.id}
              node={node}
              selectedId={selectedPackFile?.id}
              onSelect={handleSelect}
              renderActions={(n) =>
                n.type === "file"
                  ? (() => {
                      const resolvedTag = legacyTagById[n.id]
                      const typeLabel =
                        packFileById[n.id]?.type ||
                        (resolvedTag ? `0x${resolvedTag.Tag.toString(16).padStart(3, "0")}` : n.extension || "")
                      return (
                        <div className="flex items-center gap-1">
                          {typeLabel ? (
                            <span className="text-[10px] uppercase tracking-wide px-1 bg-muted text-muted-foreground">
                              {typeLabel}
                            </span>
                          ) : null}
                          {activePackName ? (
                            <a
                              href={`/dump/pack/${encodeURIComponent(activePackName)}/${encodeURIComponent(n.id)}`}
                              download
                              className="p-1 hover:text-primary text-muted-foreground"
                              title="Download"
                            >
                              <Download className="w-3 h-3" />
                            </a>
                          ) : null}
                        </div>
                      )
                    })()
                  : null
              }
            />
          ))}
      </div>
    </div>
  )
}
