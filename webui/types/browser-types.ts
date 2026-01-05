// =============================================================================
// BROWSER TYPES
// =============================================================================

import type { ReactNode } from "react"

export type FileNode = {
  id: string
  name: string
  type: "file" | "folder"
  children?: FileNode[]
  size?: number
  extension?: string
}

export type PackFile = {
  id: string
  name: string
  type: string
  size: number
  offset: number
}

export type LegacyTag = {
  Id: number
  Name: string
  Tag: number
  Size: number
  Flags?: number
  DebugPos?: number
}

export type LegacyNode = {
  Tag: LegacyTag
  SubGroupNodes?: number[]
}

export type LegacyTreeResponse = {
  Roots?: number[]
  Nodes?: LegacyNode[]
  Tags?: LegacyTag[]
}

export type RawMeshPacket = {
  Uvs: { U: number[]; V: number[] }
  Trias: { X: number[]; Y: number[]; Z: number[]; Skip: boolean[]; Weight: number[] }
  Norms: { X: number[]; Y: number[]; Z: number[] }
  Blend: { R: number[]; G: number[]; B: number[]; A: number[] }
  Joints: number[]
  Joints2: number[]
  Offset: number
  VertexMeta?: number[]
  Boundaries?: number[]
  HasTransparentBlending?: boolean
}

export type RawMeshObject = {
  Offset: number
  Type: number
  DmaTagsCountPerPacket: number
  MaterialId: number
  JointMapElementsCount: number
  InstancesCount: number
  Flags: number
  FlagsMask: number
  TextureLayersCount: number
  TotalDmaProgramsCount: number
  NextFreeVUBufferId: number
  Unk1c: number
  SourceVerticesCount: number
  Packets: RawMeshPacket[][]
  RawDmaAndJointsData?: number[]
  UseInvertedMatrix?: boolean
  JointMappers?: number[][]
}

export type RawMeshGroup = {
  Offset: number
  HideDistance: number
  Objects: RawMeshObject[]
  HasBbox: number
}

export type RawMeshPart = {
  Offset: number
  Unk00: number
  Groups: RawMeshGroup[]
  JointId: number
}

export type RawMesh = {
  Parts: RawMeshPart[]
  Vectors?: { Value: number[] }[]
  Flags0x20?: number
  NameOfRootJoint?: string
  BaseBoneIndex?: number
}

export type ViewportOptions = {
  showSkeletonIds: boolean
  showSkeleton: boolean
  showEntity: boolean
  showInstance: boolean
  showCollision: boolean
  showCollisionStatic: boolean
  showCollisionDebug: boolean
  showLights: boolean
  backfaceCulling: boolean
  enableAnimation: boolean
}

export type TreeSelector = {
  id: string
  label: string
  active: boolean
}

export type PanelConfig = {
  id: string
  title: string
  icon: ReactNode
  minSize: number
  defaultSize: number
}

export type LayoutMode = "horizontal" | "vertical" | "grid"

export type PanelTab = {
  id: string
  label: string
  icon: ReactNode
}

export type TextureData = {
  Data: {
    Width: number
    Height: number
    Bpp: number
    Flags: number
    GfxId: number
    PalId: number
  }
  Images: Array<{
    Image: string
    Gfx: number
    Pal: number
  }>
  Refs?: unknown[]
  IsSwizzled?: boolean
  IsIndexed?: boolean
  IsTiled?: boolean
}

export type MaterialLayerData = {
  BlendColor?: number[]
  Flags?: number[]
  ParsedFlags?: Record<string, boolean>
  Texture?: string
}

export type MaterialTexture = {
  Data?: {
    Width?: number
    Height?: number
    Bpp?: number
    Gfx?: number
    Pal?: number
    GfxName?: string
    PalName?: string
  }
  Images?: Array<{
    Image?: string
    Gfx?: number
    Pal?: number
    HasAlpha?: boolean
    HaveAlpha?: boolean
    HaveTransparent?: boolean
  }>
  HaveTransparent?: boolean
  HasAlpha?: boolean
}

export type MaterialData = {
  Mat?: {
    Color?: number[]
    Layers?: Array<MaterialLayerData> | Record<string, MaterialLayerData>
    Id?: number
  }
  Textures?: Array<MaterialTexture> | Record<string, MaterialTexture>
  TexturesBlended?: Array<MaterialTexture> | Record<string, MaterialTexture>
}

export type TabbedPanelConfig = {
  id: string
  tabs: string[]
  activeTab: string
  isDetached: boolean
}
