"use client"

import { useState, useEffect } from "react"
// REMOVA: import { useBrowser } from "@/context/browser-context"
// ADICIONE:
import { useBrowserStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"

import { LEGACY_BASE_URL } from "@/lib/browser-constants"
import type { FileNode, PackFile } from "@/types/browser-types"

export function SummaryContent() {
  // SUBSTITUIÇÃO AQUI:
  const { 
    selectedFsFile, 
    selectedPackFile, 
    selectedTreeNode, 
    activePackName,
    setIsolatedMeshName
  } = useBrowserStore(
    useShallow((state) => ({
      selectedFsFile: state.selectedFsFile,
      selectedPackFile: state.selectedPackFile,
      selectedTreeNode: state.selectedTreeNode,
      activePackName: state.activePackName,
      setIsolatedMeshName: state.setIsolatedMeshName,
    }))
  )

  const selected = selectedTreeNode || selectedPackFile || selectedFsFile
  const [legacyData, setLegacyData] = useState<any | null>(null)
  const [isLegacyLoading, setIsLegacyLoading] = useState(false)
  const [legacyError, setLegacyError] = useState<string | null>(null)

  useEffect(() => {
    const isMesh = selectedPackFile?.type?.toLowerCase() === "0x0001"
    if (!activePackName || !selectedPackFile || !isMesh) {
      setLegacyData(null)
      setLegacyError(null)
      setIsLegacyLoading(false)
      setIsolatedMeshName(null)
      return
    }

    let cancelled = false
    setLegacyData(null)
    setLegacyError(null)
    setIsLegacyLoading(true)

    const url = `${LEGACY_BASE_URL}/json/pack/${encodeURIComponent(activePackName)}/${encodeURIComponent(selectedPackFile.id)}`
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json) => {
        if (cancelled) return
        setLegacyData(json)
      })
      .catch((err) => {
        if (cancelled) return
        setLegacyError((err as Error).message || "Failed to load legacy data")
      })
      .finally(() => {
        if (!cancelled) setIsLegacyLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activePackName, selectedPackFile])

  if (!selected) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-mono">
        Select an item to view details
      </div>
    )
  }

  const isPackFile = "offset" in selected
  const isFileNode = "type" in selected && !isPackFile
  const isMesh = isPackFile && (selected as PackFile).type?.toLowerCase() === "0x0001"

  const materialRows: Array<{ label: string; value: string }> = []
  const objectRows: Array<{ label: string; value: string; name: string }> = []

  if (legacyData?.Materials?.length) {
    legacyData.Materials.forEach((mat: any, idx: number) => {
      const layers = mat?.Mat?.Layers ?? []
      materialRows.push({
        label: `MAT #${idx}`,
        value: `${layers.length} layers${mat?.Textures ? ` | textures: ${Object.keys(mat.Textures).length}` : ""}`,
      })
    })
  }

  if (legacyData?.Parts?.length) {
    legacyData.Parts.forEach((part: any, pIdx: number) => {
      part?.Groups?.forEach((group: any, gIdx: number) => {
        group?.Objects?.forEach((obj: any, oIdx: number) => {
          const matId = obj?.MaterialId ?? 0
          const meshName = `p${pIdx}_g${gIdx}_o${oIdx}m${matId}`
          objectRows.push({
            label: `P${pIdx} G${gIdx} O${oIdx}`,
            value: `mat ${matId} | inst ${obj?.InstancesCount ?? 1} | layers ${obj?.TextureLayersCount ?? 1}`,
            name: meshName,
          })
        })
      })
    })
  }

  return (
    <div className="h-full overflow-auto p-2 space-y-3">
      <div>
        <div className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider mb-1">Name</div>
        <div className="text-xs font-mono text-primary">{selected.name}</div>
      </div>
      {isPackFile && (
        <>
          <div>
            <div className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider mb-1">Type</div>
            <div className="text-xs font-mono">{(selected as PackFile).type}</div>
          </div>
          <div>
            <div className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider mb-1">Size</div>
            <div className="text-xs font-mono">{((selected as PackFile).size / 1024).toFixed(2)} KB</div>
          </div>
          <div>
            <div className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider mb-1">Offset</div>
            <div className="text-xs font-mono">0x{(selected as PackFile).offset.toString(16).toUpperCase()}</div>
          </div>
        </>
      )}
      {isFileNode && (selected as FileNode).size && (
        <div>
          <div className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider mb-1">Size</div>
          <div className="text-xs font-mono">{(((selected as FileNode).size || 0) / 1024 / 1024).toFixed(2)} MB</div>
        </div>
      )}
      {isMesh && (
        <div className="space-y-2">
          <div className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider">
            Mesh summary (legacy)
          </div>
          {isLegacyLoading && (
            <div className="text-xs text-muted-foreground font-mono">Loading legacy mesh info...</div>
          )}
          {legacyError && <div className="text-xs text-destructive font-mono">Legacy load failed: {legacyError}</div>}
          {!isLegacyLoading && !legacyError && (
            <>
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground font-mono">Materials: {materialRows.length || 0}</div>
                {materialRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between text-[11px] font-mono border border-border/50 px-2 py-1 rounded bg-muted/40"
                  >
                    <span className="text-primary">{row.label}</span>
                    <span className="text-muted-foreground">{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground font-mono">Objects: {objectRows.length || 0}</div>
                {objectRows.slice(0, 30).map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between text-[11px] font-mono border border-border/50 px-2 py-1 rounded bg-muted/40 hover:border-primary/60"
                    onMouseEnter={() => setIsolatedMeshName(row.name)}
                    onMouseLeave={() => setIsolatedMeshName(null)}
                  >
                    <span className="text-primary">{row.label}</span>
                    <span className="text-muted-foreground">{row.value}</span>
                  </div>
                ))}
                {objectRows.length > 30 && (
                  <div className="text-[10px] text-muted-foreground font-mono">+{objectRows.length - 30} more</div>
                )}
              </div>
            </>
          )}
        </div>
      )}
      <div>
        <div className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider mb-1">Hex Preview</div>
        <div className="bg-muted p-2 font-mono text-[10px] text-muted-foreground leading-relaxed overflow-x-auto">
          <div>00000000: 4D45 5348 0100 0000 A8B4 0000 0000 0000</div>
          <div>00000010: 1400 0000 0000 0000 5645 5254 0000 0000</div>
          <div>00000020: 6001 0000 0000 0000 464C 4147 0000 0000</div>
        </div>
      </div>
    </div>
  )
}
