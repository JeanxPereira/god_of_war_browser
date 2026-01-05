"use client"

import type React from "react"
import { createContext, useContext } from "react"
import type { FileNode, PackFile, TreeSelector, ViewportOptions } from "@/types/browser-types"

export type BrowserContextType = {
  selectedFsFile: FileNode | null
  setSelectedFsFile: (file: FileNode | null) => void
  selectedPackFile: PackFile | null
  setSelectedPackFile: (file: PackFile | null) => void
  selectedPackChildren: PackFile[]
  setSelectedPackChildren: (files: PackFile[]) => void
  activePackName: string | null
  setActivePackName: (name: string | null) => void
  selectedTreeNode: FileNode | null
  setSelectedTreeNode: (node: FileNode | null) => void
  packFilter: string
  setPackFilter: (filter: string) => void
  treeFilter: string
  setTreeFilter: (filter: string) => void
  treeSelectors: TreeSelector[]
  setTreeSelectors: React.Dispatch<React.SetStateAction<TreeSelector[]>>
  viewportOptions: ViewportOptions
  setViewportOptions: React.Dispatch<React.SetStateAction<ViewportOptions>>
}

export const BrowserContext = createContext<BrowserContextType | null>(null)

export const useBrowser = () => {
  const ctx = useContext(BrowserContext)
  if (!ctx) throw new Error("useBrowser must be used within BrowserProvider")
  return ctx
}
