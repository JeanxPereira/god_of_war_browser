"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import {
  Eye,
  FileText,
  Palette,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Grid3X3,
  Download,
  ImageIcon,
  Layers,
} from "lucide-react"
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useBrowser } from "@/context/browser-context"
import { LEGACY_BASE_URL } from "@/lib/browser-constants"
import type { TextureData, MaterialData, MaterialLayerData, MaterialTexture, PanelTab } from "@/types/browser-types"

const GRID_BACKGROUND_CLASS =
  "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDIwIEwgMjAgMjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIwLjUiLz48cGF0aCBkPSJNIDIwIDAgTCAyMCAyMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjAuNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')]"

function useLegacyTextureData(packName: string | null, nodeId: string | null) {
  const [data, setData] = useState<TextureData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchTexture = useCallback(async () => {
    if (!packName || !nodeId) {
      setData(null)
      setError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `${LEGACY_BASE_URL}/json/pack/${encodeURIComponent(packName)}/${encodeURIComponent(nodeId)}`,
      )
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const json = await response.json()
      if (json?.error) {
        throw new Error(json.error)
      }

      if (json?.Data?.Images || json?.Images) {
        setData(json.Data || json)
      } else {
        setData(null)
      }
    } catch (err) {
      setError(err as Error)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [packName, nodeId])

  useEffect(() => {
    void fetchTexture()
  }, [fetchTexture])

  return { data, isLoading, isError: !!error, error, refetch: fetchTexture }
}

function isTextureType(type: string | undefined): boolean {
  if (!type) return false
  const normalizedType = type.toLowerCase()
  return (
    normalizedType === "0x0007" ||
    normalizedType === "0x00070007" ||
    normalizedType.includes("txr") ||
    normalizedType.includes("tex")
  )
}

function useLegacyMaterialData(packName: string | null, nodeId: string | null) {
  const [data, setData] = useState<MaterialData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchMaterial = useCallback(async () => {
    if (!packName || !nodeId) {
      setData(null)
      setError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `${LEGACY_BASE_URL}/json/pack/${encodeURIComponent(packName)}/${encodeURIComponent(nodeId)}`,
      )
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const json = await response.json()
      const payload = json?.Data || json

      if (payload?.Mat || payload?.Textures || payload?.TexturesBlended) {
        setData(payload as MaterialData)
      } else {
        setData(null)
      }
    } catch (err) {
      setError(err as Error)
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [packName, nodeId])

  useEffect(() => {
    void fetchMaterial()
  }, [fetchMaterial])

  return { data, isLoading, isError: !!error, error, refetch: fetchMaterial }
}

function isMaterialType(type: string | undefined): boolean {
  if (!type) return false
  const normalized = type.toLowerCase()
  return normalized === "0x0008" || normalized === "0x00000008" || normalized === "0x8" || normalized.includes("mat")
}

function normalizeMaterialLayers(layers?: Array<MaterialLayerData> | Record<string, MaterialLayerData>) {
  if (!layers) return []
  if (Array.isArray(layers)) return layers
  return Object.keys(layers)
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => layers[key])
}

function pickFromCollection<T>(collection: Array<T> | Record<string, T> | undefined, index: number): T | undefined {
  if (!collection) return undefined
  if (Array.isArray(collection)) return collection[index]
  const byNumber = (collection as Record<string, T>)[index]
  if (byNumber) return byNumber
  return (collection as Record<string, T>)[index.toString()]
}

type ResolvedImage = {
  src: string
  width?: number
  height?: number
  bpp?: number
  gfx?: number
  pal?: number
  gfxName?: string
  palName?: string
  hasAlpha?: boolean
}

function resolveTextureImage(texture?: MaterialTexture): ResolvedImage | null {
  if (!texture) return null
  const img = texture.Images?.[0]
  if (!img?.Image) return null

  const hasAlpha =
    !!img.HasAlpha ||
    !!img.HaveAlpha ||
    !!img.HaveTransparent ||
    !!texture.HaveTransparent ||
    !!texture.HasAlpha

  return {
    src: `data:image/png;base64,${img.Image}`,
    width: texture.Data?.Width,
    height: texture.Data?.Height,
    bpp: texture.Data?.Bpp,
    gfx: img.Gfx ?? texture.Data?.Gfx,
    pal: img.Pal ?? texture.Data?.Pal,
    gfxName: texture.Data?.GfxName,
    palName: texture.Data?.PalName,
    hasAlpha,
  }
}

type NormalizedColor = { r: number; g: number; b: number; a: number; css: string }

function toNormalizedColor(color?: number[]): NormalizedColor {
  const values = color ?? [1, 1, 1, 1]
  const numericValues = values.filter((v) => typeof v === "number") as number[]
  const maxValue = numericValues.length ? Math.max(...numericValues) : 1
  const useUnitScale = maxValue <= 1.001
  const scale = useUnitScale ? 255 : 1

  const clamp255 = (val: number | undefined, fallback: number) => {
    const raw = val === undefined ? fallback : val
    return Math.max(0, Math.min(255, Math.round(raw * scale)))
  }

  const r = clamp255(values[0], useUnitScale ? 1 : 255)
  const g = clamp255(values[1], useUnitScale ? 1 : 255)
  const b = clamp255(values[2], useUnitScale ? 1 : 255)
  const alphaRaw = values[3]
  const a = alphaRaw === undefined ? 1 : useUnitScale ? alphaRaw : Math.min(1, alphaRaw / 255)

  return {
    r,
    g,
    b,
    a,
    css: `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`,
  }
}

function combineColors(base?: number[], layer?: number[]): NormalizedColor {
  const baseColor = toNormalizedColor(base)
  const layerColor = toNormalizedColor(layer)

  const r = Math.max(0, Math.min(255, Math.round((baseColor.r / 255) * (layerColor.r / 255) * 255)))
  const g = Math.max(0, Math.min(255, Math.round((baseColor.g / 255) * (layerColor.g / 255) * 255)))
  const b = Math.max(0, Math.min(255, Math.round((baseColor.b / 255) * (layerColor.b / 255) * 255)))
  const a = Number((baseColor.a * layerColor.a).toFixed(3))

  return {
    r,
    g,
    b,
    a,
    css: `rgba(${r}, ${g}, ${b}, ${a})`,
  }
}

function getBlendMethod(parsed?: Record<string, boolean>): string {
  if (!parsed) return "Unknown"
  if (parsed.RenderingUsual) return "Normal"
  if (parsed.RenderingAdditive) return "Additive"
  if (parsed.RenderingSubstract) return "Substract"
  if (parsed.RenderingStrangeBlended) return "Blended"
  return "Unknown"
}

export function ImageViewerPanel() {
  const { selectedPackFile, activePackName } = useBrowser()

  const [activeTab, setActiveTab] = useState<string>("viewer")
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [showGrid, setShowGrid] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [selectedLayerIndex, setSelectedLayerIndex] = useState(0)
  const [materialViewMode, setMaterialViewMode] = useState<"base" | "blended">("base")
  const containerRef = useRef<HTMLDivElement>(null)

  const isTexture = isTextureType(selectedPackFile?.type)
  const isMaterial = isMaterialType(selectedPackFile?.type)
  const resourceKind = isTexture ? "texture" : isMaterial ? "material" : "unsupported"

  const {
    data: textureData,
    isLoading: isTextureLoading,
    isError: isTextureError,
    error: textureError,
    refetch: refetchTexture,
  } = useLegacyTextureData(isTexture ? activePackName : null, isTexture ? (selectedPackFile?.id ?? null) : null)

  const {
    data: materialData,
    isLoading: isMaterialLoading,
    isError: isMaterialError,
    error: materialError,
    refetch: refetchMaterial,
  } = useLegacyMaterialData(isMaterial ? activePackName : null, isMaterial ? (selectedPackFile?.id ?? null) : null)

  const materialLayers = useMemo(() => normalizeMaterialLayers(materialData?.Mat?.Layers), [materialData])

  useEffect(() => {
    setZoom(1)
    setRotation(0)
    setSelectedImageIndex(0)
    setSelectedLayerIndex(0)
    setMaterialViewMode("base")
  }, [selectedPackFile?.id])

  useEffect(() => {
    if (materialLayers.length && selectedLayerIndex >= materialLayers.length) {
      setSelectedLayerIndex(0)
    }
  }, [materialLayers, selectedLayerIndex])

  const tabs: PanelTab[] = useMemo(() => {
    const list: PanelTab[] = [
      { id: "viewer", label: "Viewer", icon: <Eye className="w-3 h-3" /> },
      { id: "info", label: "Info", icon: <FileText className="w-3 h-3" /> },
    ]
    if (isTexture) {
      list.push({ id: "palette", label: "Palette", icon: <Palette className="w-3 h-3" /> })
    }
    if (isMaterial) {
      list.push({ id: "layers", label: "Layers", icon: <Layers className="w-3 h-3" /> })
    }
    return list
  }, [isTexture, isMaterial])

  useEffect(() => {
    if (!tabs.find((tab) => tab.id === activeTab)) {
      setActiveTab(tabs[0]?.id ?? "viewer")
    }
  }, [tabs, activeTab])

  const handleZoomIn = useCallback(() => setZoom((prev) => Math.min(prev * 1.25, 8)), [])
  const handleZoomOut = useCallback(() => setZoom((prev) => Math.max(prev / 1.25, 0.125)), [])
  const handleResetZoom = useCallback(() => {
    setZoom(1)
    setRotation(0)
  }, [])
  const handleRotate = useCallback(() => setRotation((prev) => (prev + 90) % 360), [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      setZoom((prev) => Math.min(Math.max(prev * delta, 0.125), 8))
    }
  }, [])

  const currentTextureImage = textureData?.Images?.[selectedImageIndex]
  const textureImageSrc = currentTextureImage ? `data:image/png;base64,${currentTextureImage.Image}` : ""

  const layerCount = materialLayers.length
  const safeLayerIndex = layerCount ? Math.min(selectedLayerIndex, layerCount - 1) : 0
  const currentLayer = layerCount ? materialLayers[safeLayerIndex] : undefined
  const baseTexture = pickFromCollection(materialData?.Textures, safeLayerIndex)
  const blendedTexture = pickFromCollection(materialData?.TexturesBlended, safeLayerIndex)
  const baseImage = resolveTextureImage(baseTexture)
  const blendedImage = resolveTextureImage(blendedTexture)
  const activeMaterialImage = materialViewMode === "blended" ? blendedImage : baseImage
  const materialColor = toNormalizedColor(materialData?.Mat?.Color)
  const layerColor = toNormalizedColor(currentLayer?.BlendColor)
  const resultColor = combineColors(materialData?.Mat?.Color, currentLayer?.BlendColor)
  const blendMethod = getBlendMethod(currentLayer?.ParsedFlags)

  if (!selectedPackFile) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-xs text-muted-foreground font-mono gap-2">
        <ImageIcon className="w-8 h-8 opacity-30" />
        <span>Select a resource from the tree</span>
      </div>
    )
  }

  if (resourceKind === "unsupported") {
    return (
      <div className="h-full flex flex-col items-center justify-center text-xs text-muted-foreground font-mono gap-2 p-4 text-center">
        <ImageIcon className="w-8 h-8 opacity-30" />
        <span>Selected resource is not a texture or material</span>
        <span className="text-[10px] opacity-60">Type: {selectedPackFile.type}</span>
        <span className="text-[10px] opacity-60">Expected TXR (0x0007) or MAT (0x0008)</span>
      </div>
    )
  }

  const isLoading = resourceKind === "texture" ? isTextureLoading : isMaterialLoading
  const isError = resourceKind === "texture" ? isTextureError : isMaterialError
  const error = resourceKind === "texture" ? textureError : materialError
  const refetch = resourceKind === "texture" ? refetchTexture : refetchMaterial

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-mono">
        <div className="flex flex-col items-center gap-2">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Loading {resourceKind}...</span>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-xs font-mono p-4 text-center">
        <span className="text-destructive">Failed to load {resourceKind}</span>
        <span className="text-muted-foreground text-[10px]">{error?.message}</span>
        <button
          onClick={() => refetch()}
          className="px-2 py-1 border border-border bg-muted hover:border-primary/50 transition-colors mt-2"
        >
          Retry
        </button>
      </div>
    )
  }

  const hasTextureImages = !!textureData?.Images?.length
  if (resourceKind === "texture" && !hasTextureImages) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-xs text-muted-foreground font-mono gap-2 p-4 text-center">
        <ImageIcon className="w-8 h-8 opacity-30" />
        <span>No images in texture data</span>
      </div>
    )
  }

  if (resourceKind === "material" && !materialData) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-xs text-muted-foreground font-mono gap-2 p-4 text-center">
        <ImageIcon className="w-8 h-8 opacity-30" />
        <span>Material data not available</span>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col">
        <div className="flex items-center border-b border-border bg-muted/30 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider border-r border-border transition-colors ${
                activeTab === tab.id
                  ? "bg-background text-primary border-b-2 border-b-primary -mb-px"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === "viewer" && resourceKind === "texture" && currentTextureImage && (
          <>
            <div className="flex items-center justify-between px-2 py-1 border-b border-border bg-muted/20 shrink-0">
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleZoomOut}
                      className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[10px]">
                    Zoom out
                  </TooltipContent>
                </Tooltip>

                <span className="text-[10px] font-mono text-muted-foreground min-w-[3.5rem] text-center">
                  {Math.round(zoom * 100)}%
                </span>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleZoomIn}
                      className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[10px]">
                    Zoom in
                  </TooltipContent>
                </Tooltip>

                <div className="w-px h-4 bg-border mx-1" />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleRotate}
                      className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[10px]">
                    Rotate 90 deg
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleResetZoom}
                      className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[10px]">
                    Reset view
                  </TooltipContent>
                </Tooltip>

                <div className="w-px h-4 bg-border mx-1" />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setShowGrid(!showGrid)}
                      className={`p-1.5 transition-colors ${
                        showGrid ? "bg-primary/20 text-primary" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Grid3X3 className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[10px]">
                    Toggle grid
                  </TooltipContent>
                </Tooltip>
              </div>

              {textureData?.Images?.length > 1 && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-mono text-muted-foreground">Image:</span>
                  <select
                    value={selectedImageIndex}
                    onChange={(e) => setSelectedImageIndex(Number(e.target.value))}
                    className="h-5 px-1 text-[10px] font-mono bg-muted border border-border focus:border-primary focus:outline-none"
                  >
                    {textureData.Images.map((img, idx) => (
                      <option key={idx} value={idx}>
                        {idx + 1} (Gfx:{img.Gfx} Pal:{img.Pal})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={textureImageSrc}
                    download={`${selectedPackFile.name}_${selectedImageIndex}.png`}
                    className="p-1.5 hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[10px]">
                  Download image
                </TooltipContent>
              </Tooltip>
            </div>

            <div
              ref={containerRef}
              onWheel={handleWheel}
              className={`flex-1 overflow-auto flex items-center justify-center p-4 ${
                showGrid ? GRID_BACKGROUND_CLASS : "bg-muted/20"
              }`}
            >
              <div
                className="relative transition-transform duration-150 ease-out"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  imageRendering: zoom > 1 ? "pixelated" : "auto",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={textureImageSrc || "/placeholder.svg"}
                  alt={`Texture: ${selectedPackFile.name}`}
                  className="max-w-none select-none"
                  style={{ imageRendering: zoom > 1 ? "pixelated" : "auto" }}
                  draggable={false}
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-2 py-1 border-t border-border bg-muted/30 text-[10px] font-mono text-muted-foreground shrink-0">
              <span>
                {textureData?.Data?.Width ?? "?"}x{textureData?.Data?.Height ?? "?"} | {textureData?.Data?.Bpp ?? "?"}bpp
              </span>
              <span>
                Gfx: {currentTextureImage.Gfx} | Pal: {currentTextureImage.Pal}
              </span>
            </div>
          </>
        )}

        {activeTab === "viewer" && resourceKind === "material" && (
          <>
            <div className="flex items-center justify-between px-2 py-1 border-b border-border bg-muted/20 shrink-0">
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleZoomOut}
                      className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[10px]">
                    Zoom out
                  </TooltipContent>
                </Tooltip>

                <span className="text-[10px] font-mono text-muted-foreground min-w-[3.5rem] text-center">
                  {Math.round(zoom * 100)}%
                </span>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleZoomIn}
                      className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[10px]">
                    Zoom in
                  </TooltipContent>
                </Tooltip>

                <div className="w-px h-4 bg-border mx-1" />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleRotate}
                      className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[10px]">
                    Rotate 90 deg
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleResetZoom}
                      className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[10px]">
                    Reset view
                  </TooltipContent>
                </Tooltip>

                <div className="w-px h-4 bg-border mx-1" />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setShowGrid(!showGrid)}
                      className={`p-1.5 transition-colors ${
                        showGrid ? "bg-primary/20 text-primary" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Grid3X3 className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[10px]">
                    Toggle grid
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-mono text-muted-foreground">Layer:</span>
                  <select
                    value={safeLayerIndex}
                    onChange={(e) => setSelectedLayerIndex(Number(e.target.value))}
                    className="h-5 px-1 text-[10px] font-mono bg-muted border border-border focus:border-primary focus:outline-none"
                  >
                    {layerCount ? (
                      materialLayers.map((_, idx) => (
                        <option key={idx} value={idx}>
                          {idx + 1}
                        </option>
                      ))
                    ) : (
                      <option value={0}>0</option>
                    )}
                  </select>
                </div>

                <div className="flex items-center gap-0.5 border border-border rounded">
                  <button
                    onClick={() => setMaterialViewMode("base")}
                    className={`px-2 py-1 text-[10px] font-mono ${
                      materialViewMode === "base" ? "bg-background text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Base
                  </button>
                  <button
                    onClick={() => setMaterialViewMode("blended")}
                    className={`px-2 py-1 text-[10px] font-mono ${
                      materialViewMode === "blended"
                        ? "bg-background text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Blended
                  </button>
                </div>

                <div className="hidden xl:flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span>Mat</span>
                    <span className="w-4 h-4 border border-border" style={{ backgroundColor: materialColor.css }} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span>Layer</span>
                    <span className="w-4 h-4 border border-border" style={{ backgroundColor: layerColor.css }} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span>Result</span>
                    <span className="w-4 h-4 border border-border" style={{ backgroundColor: resultColor.css }} />
                  </div>
                </div>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={activeMaterialImage?.src || "#"}
                    download={`${selectedPackFile.name}_layer${safeLayerIndex}_${materialViewMode}.png`}
                    className={`p-1.5 transition-colors ${
                      activeMaterialImage ? "hover:bg-muted text-muted-foreground hover:text-primary" : "text-muted-foreground opacity-50"
                    }`}
                    aria-disabled={!activeMaterialImage}
                    onClick={(e) => {
                      if (!activeMaterialImage) {
                        e.preventDefault()
                      }
                    }}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[10px]">
                  Download current view
                </TooltipContent>
              </Tooltip>
            </div>

            <div
              ref={containerRef}
              onWheel={handleWheel}
              className={`flex-1 overflow-auto flex items-center justify-center p-4 ${
                showGrid ? GRID_BACKGROUND_CLASS : "bg-muted/20"
              }`}
            >
              {activeMaterialImage ? (
                <div
                  className="relative transition-transform duration-150 ease-out"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    imageRendering: zoom > 1 ? "pixelated" : "auto",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeMaterialImage.src}
                    alt={`Material layer ${safeLayerIndex + 1}`}
                    className="max-w-none select-none"
                    style={{ imageRendering: zoom > 1 ? "pixelated" : "auto" }}
                    draggable={false}
                  />
                </div>
              ) : (
                <div className="text-xs font-mono text-muted-foreground">No preview available for this layer</div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-3 py-3 border-t border-border bg-muted/20">
              {baseImage && (
                <div className="border border-border bg-background p-2">
                  <div className="text-[10px] font-mono text-muted-foreground mb-2">Color + Alpha</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={baseImage.src} alt="Base layer" className="max-w-full max-h-64 object-contain border border-border" />
                  <div className="text-[10px] font-mono text-muted-foreground mt-1">
                    Gfx: {baseImage.gfx ?? "?"} | Pal: {baseImage.pal ?? "?"}
                  </div>
                </div>
              )}
              {blendedImage && (
                <div className="border border-border bg-background p-2">
                  <div className="text-[10px] font-mono text-muted-foreground mb-2">Blended preview</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={blendedImage.src}
                    alt="Blended layer"
                    className="max-w-full max-h-64 object-contain border border-border"
                  />
                  <div className="text-[10px] font-mono text-muted-foreground mt-1">
                    Gfx: {blendedImage.gfx ?? "?"} | Pal: {blendedImage.pal ?? "?"}
                  </div>
                </div>
              )}
              {!baseImage && !blendedImage && (
                <div className="text-xs font-mono text-muted-foreground">Material has no texture previews for this layer.</div>
              )}
            </div>

            <div className="flex items-center justify-between px-2 py-1 border-t border-border bg-muted/30 text-[10px] font-mono text-muted-foreground shrink-0">
              <span>
                {activeMaterialImage?.width ?? "?"}x{activeMaterialImage?.height ?? "?"} | {activeMaterialImage?.bpp ?? "?"}bpp
              </span>
              <span>
                Layer {layerCount ? safeLayerIndex + 1 : 0}/{layerCount || 0} | Mode: {materialViewMode} | Blend: {blendMethod}
              </span>
            </div>
          </>
        )}

        {activeTab === "info" && resourceKind === "texture" && textureData && (
          <div className="flex-1 overflow-auto p-3 space-y-3">
            <div className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider">Texture properties</div>

            <div className="space-y-2">
              {[
                { label: "Width", value: textureData.Data?.Width ?? "N/A" },
                { label: "Height", value: textureData.Data?.Height ?? "N/A" },
                { label: "Bpp", value: textureData.Data?.Bpp ?? "N/A" },
                { label: "Flags", value: textureData.Data?.Flags ? `0x${textureData.Data.Flags.toString(16)}` : "N/A" },
                { label: "GfxId", value: textureData.Data?.GfxId ?? "N/A" },
                { label: "PalId", value: textureData.Data?.PalId ?? "N/A" },
                { label: "Is Swizzled", value: textureData.IsSwizzled ? "Yes" : "No" },
                { label: "Is Indexed", value: textureData.IsIndexed ? "Yes" : "No" },
                { label: "Is Tiled", value: textureData.IsTiled ? "Yes" : "No" },
                { label: "Images Count", value: textureData.Images?.length ?? 0 },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between text-[11px] font-mono border border-border/50 px-2 py-1 bg-muted/40"
                >
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="text-primary">{String(row.value)}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-border space-y-2">
              <div className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider">Actions</div>
              <div className="flex flex-col gap-2">
                <a
                  href={`${LEGACY_BASE_URL}/action/${encodeURIComponent(activePackName ?? "")}/${encodeURIComponent(selectedPackFile?.id ?? "")}/asjson`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-2 py-1.5 text-[10px] font-mono bg-muted border border-border hover:border-primary/50 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Download as JSON
                </a>
              </div>
            </div>
          </div>
        )}

        {activeTab === "info" && resourceKind === "material" && (
          <div className="flex-1 overflow-auto p-3 space-y-3">
            <div className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider">Material summary</div>

            <div className="space-y-2">
              {[
                {
                  label: "Material color",
                  value: `${materialColor.r}, ${materialColor.g}, ${materialColor.b}, a ${materialColor.a.toFixed(2)}`,
                  swatch: materialColor.css,
                },
                { label: "Layers", value: layerCount || 0 },
                { label: "Has textures", value: materialData?.Textures ? "Yes" : "No" },
                { label: "Has blended textures", value: materialData?.TexturesBlended ? "Yes" : "No" },
                { label: "Material Id", value: materialData?.Mat?.Id ?? "N/A" },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between text-[11px] font-mono border border-border/50 px-2 py-1 bg-muted/40"
                >
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="flex items-center gap-2 text-primary">
                    {row.swatch && <span className="w-4 h-4 border border-border" style={{ backgroundColor: row.swatch }} />}
                    {String(row.value)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-border space-y-2">
              <div className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider">Actions</div>
              <div className="flex flex-col gap-2">
                <a
                  href={`${LEGACY_BASE_URL}/action/${encodeURIComponent(activePackName ?? "")}/${encodeURIComponent(selectedPackFile?.id ?? "")}/asjson`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-2 py-1.5 text-[10px] font-mono bg-muted border border-border hover:border-primary/50 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Download as JSON
                </a>
              </div>
            </div>
          </div>
        )}

        {activeTab === "layers" && resourceKind === "material" && (
          <div className="flex-1 overflow-auto p-3 space-y-3">
            {materialLayers.length === 0 && (
              <div className="text-xs text-muted-foreground font-mono">No layers available for this material.</div>
            )}
            {materialLayers.map((layer, idx) => {
              const baseTex = resolveTextureImage(pickFromCollection(materialData?.Textures, idx))
              const blendTex = resolveTextureImage(pickFromCollection(materialData?.TexturesBlended, idx))
              const combined = combineColors(materialData?.Mat?.Color, layer.BlendColor)
              const parsedFlags = layer.Flags?.map((flag) => `0x${flag.toString(16)}`).join(", ") || "None"
              const method = getBlendMethod(layer.ParsedFlags)

              return (
                <div key={idx} className="border border-border bg-muted/20 p-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-mono text-muted-foreground">Layer {idx + 1}</div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                      <span className="flex items-center gap-1">
                        Base
                        <span className="w-4 h-4 border border-border" style={{ backgroundColor: toNormalizedColor(layer.BlendColor).css }} />
                      </span>
                      <span className="flex items-center gap-1">
                        Result
                        <span className="w-4 h-4 border border-border" style={{ backgroundColor: combined.css }} />
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    Flags: {parsedFlags} | Mode: {method} | Texture: {layer.Texture || "None"}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {baseTex && (
                      <div className="border border-border bg-background p-2">
                        <div className="text-[10px] font-mono text-muted-foreground mb-1">Color + Alpha</div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={baseTex.src} alt={`Layer ${idx + 1} base`} className="max-w-full max-h-56 object-contain border border-border" />
                        <div className="text-[10px] font-mono text-muted-foreground mt-1">
                          Gfx: {baseTex.gfx ?? "?"} | Pal: {baseTex.pal ?? "?"}
                        </div>
                      </div>
                    )}
                    {blendTex && (
                      <div className="border border-border bg-background p-2">
                        <div className="text-[10px] font-mono text-muted-foreground mb-1">Blended preview</div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={blendTex.src} alt={`Layer ${idx + 1} blended`} className="max-w-full max-h-56 object-contain border border-border" />
                        <div className="text-[10px] font-mono text-muted-foreground mt-1">
                          Gfx: {blendTex.gfx ?? "?"} | Pal: {blendTex.pal ?? "?"}
                        </div>
                      </div>
                    )}
                    {!baseTex && !blendTex && (
                      <div className="text-xs font-mono text-muted-foreground">No texture previews for this layer.</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {activeTab === "palette" && resourceKind === "texture" && textureData && (
          <div className="flex-1 overflow-auto p-3">
            <div className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider mb-3">Palette information</div>
            <div className="text-xs text-muted-foreground font-mono">
              {textureData.IsIndexed ? (
                <div className="space-y-2">
                  <p>This texture uses indexed colors (palette-based).</p>
                  <p className="text-[10px]">Palette ID: {textureData.Data?.PalId ?? "N/A"}</p>
                </div>
              ) : (
                <p>This texture uses direct colors (non-indexed).</p>
              )}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
