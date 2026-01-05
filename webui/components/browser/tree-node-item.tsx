"use client"

import type React from "react"
import { useState } from "react"
import { ChevronRight, ChevronDown, FolderTree, FileText } from "lucide-react"
import type { FileNode } from "@/types/browser-types"

type TreeNodeItemProps = {
  node: FileNode
  level?: number
  selectedId?: string
  onSelect: (node: FileNode) => void
  renderActions?: (node: FileNode) => React.ReactNode
}

export function TreeNodeItem({ node, level = 0, selectedId, onSelect, renderActions }: TreeNodeItemProps) {
  const [expanded, setExpanded] = useState(level < 2)
  const hasChildren = node.children && node.children.length > 0
  const isSelected = selectedId === node.id
  const actions = renderActions?.(node)

  return (
    <div>
      <button
        onClick={() => {
          onSelect(node)
          if (hasChildren) setExpanded(!expanded)
        }}
        className={`
          w-full flex items-center gap-1 py-0.5 px-1 text-left text-xs font-mono justify-between
          hover:bg-muted transition-colors
          ${isSelected ? "bg-primary/20 text-primary" : "text-foreground"}
        `}
        style={{ paddingLeft: `${level * 12 + 4}px` }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="w-3 h-3 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground" />
            )
          ) : (
            <span className="w-3 shrink-0" />
          )}
          {node.type === "folder" ? (
            <FolderTree className="w-3 h-3 shrink-0 text-primary" />
          ) : (
            <FileText className="w-3 h-3 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate">{node.name}</span>
        </div>
        {actions ? (
          <div
            className="flex items-center gap-1 pl-2 ml-auto text-muted-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            {actions}
          </div>
        ) : null}
      </button>
      {hasChildren &&
        expanded &&
        node.children?.map((child) => (
          <TreeNodeItem
            key={child.id}
            node={child}
            level={level + 1}
            selectedId={selectedId}
            onSelect={onSelect}
            renderActions={renderActions}
          />
        ))}
    </div>
  )
}
