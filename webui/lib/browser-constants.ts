import { FolderTree, Package, Layers, FileText, Box, ImageIcon } from "lucide-react"
import type { PanelConfig } from "@/types/browser-types"
import { createElement } from "react"

const rawLegacyBase =
  process.env.NEXT_PUBLIC_LEGACY_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export const LEGACY_BASE_URL = rawLegacyBase.replace(/\/api\/v2\/?$/, "").replace(/\/+$/, "")

export const PANEL_CONFIGS: Record<string, PanelConfig> = {
  filesystem: {
    id: "filesystem",
    title: "File System",
    icon: createElement(FolderTree, { className: "w-3.5 h-3.5" }),
    minSize: 180,
    defaultSize: 240,
  },
  pack: {
    id: "pack",
    title: "Pack Contents",
    icon: createElement(Package, { className: "w-3.5 h-3.5" }),
    minSize: 180,
    defaultSize: 240,
  },
  tree: {
    id: "tree",
    title: "Tree View",
    icon: createElement(Layers, { className: "w-3.5 h-3.5" }),
    minSize: 180,
    defaultSize: 260,
  },
  summary: {
    id: "summary",
    title: "Summary",
    icon: createElement(FileText, { className: "w-3.5 h-3.5" }),
    minSize: 200,
    defaultSize: 280,
  },
  viewport: {
    id: "viewport",
    title: "3D Viewport",
    icon: createElement(Box, { className: "w-3.5 h-3.5" }),
    minSize: 300,
    defaultSize: 500,
  },
  imageviewer: {
    id: "imageviewer",
    title: "Image Viewer",
    icon: createElement(ImageIcon, { className: "w-3.5 h-3.5" }),
    minSize: 280,
    defaultSize: 400,
  },
}

export const DEFAULT_PANEL_ORDER = ["filesystem", "pack", "tree", "viewer-stack", "summary"]

export const DEFAULT_PANEL_SIZES: Record<string, number> = {
  filesystem: 220,
  pack: 220,
  tree: 240,
  summary: 260,
  "viewer-stack": 600,
  viewport: 500,
  imageviewer: 400,
}
