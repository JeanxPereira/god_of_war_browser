"use client"

import { RotateCcw, Maximize2, Download, EyeOff, Eye, ImageOff, Image, Palette } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

type ControlsProps = {
  onResetCamera?: () => void
  onToggleFullscreen?: () => void
  onExport?: () => void
  onToggleCulling?: () => void
  isCullingEnabled?: boolean
  onToggleMaterials?: () => void
  areMaterialsDisabled?: boolean
  backgroundColor?: string
  onToggleBackgroundPicker?: () => void
}

export function ViewportControls({ onResetCamera, onToggleFullscreen, onExport, onToggleCulling, isCullingEnabled, onToggleMaterials, areMaterialsDisabled, backgroundColor = "#0a0a0a", onToggleBackgroundPicker }: ControlsProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-t border-border">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground font-mono">
          VIEWPORT 3D
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onResetCamera}
              className="p-1.5 bg-muted border border-border hover:border-primary/50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Reset Camera</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onToggleBackgroundPicker}
              className="p-1.5 bg-muted border border-border hover:border-primary/50 transition-colors"
              style={{ backgroundColor }}
            >
              <Palette className="w-3.5 h-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Change background color</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onToggleFullscreen}
              className="p-1.5 bg-muted border border-border hover:border-primary/50 transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Fullscreen</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onToggleCulling}
              className="p-1.5 bg-muted border border-border hover:border-primary/50 transition-colors"
            >
              {isCullingEnabled ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">{isCullingEnabled ? 'Disable backface culling' : 'Enable backface culling'}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onToggleMaterials}
              className="p-1.5 bg-muted border border-border hover:border-primary/50 transition-colors"
            >
              {areMaterialsDisabled ? <ImageOff className="w-3.5 h-3.5" /> : <Image className="w-3.5 h-3.5" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">{areMaterialsDisabled ? 'Enable textures/materials' : 'Disable textures/materials'}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onExport}
              className="p-1.5 bg-muted border border-border hover:border-primary/50 transition-colors"
              disabled
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Export (Coming Soon)</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
