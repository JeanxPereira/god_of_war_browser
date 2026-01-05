"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from "@react-three/drei"
import { Suspense, useEffect } from "react"
import * as THREE from "three"
import { useMeshLoader } from "./useMeshLoader"
import { MeshRenderer } from "./MeshRenderer"

type ViewportProps = {
  selectedResource?: {
    id: string
    name: string
    type: string
    size?: number
  } | null
  childResources?: {
    id: string
    name: string
    type: string
    size?: number
  }[] | null
  packName?: string | null
  onCameraRef?: (controls: any) => void
  backfaceCulling?: boolean
}

function SceneContent({ selectedResource, childResources, packName, onCameraRef, backfaceCulling }: ViewportProps) {
  // Debug: log quando recurso muda
  useEffect(() => {
    console.log('[Scene] Selected resource changed:', selectedResource)
    console.log('[Scene] Pack name:', packName)
  }, [selectedResource, packName])

  // Carregar malha se selecionada
  const { meshes, materials, isLoading, error } = useMeshLoader(
    packName || null,
    selectedResource?.id || null,
    selectedResource?.type || null,
    selectedResource?.name || null,
    selectedResource?.size ?? null,
    childResources || null
  )

  useEffect(() => {
    if (meshes) {
      console.log('[Scene] Meshes loaded:', meshes.length)
    }
    if (error) {
      console.error('[Scene] Mesh loading error:', error)
    }
  }, [meshes, error])

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-10, -10, -5]} intensity={0.3} />

      {/* Grid */}
      <Grid 
        args={[20, 20]} 
        cellSize={1} 
        cellColor="#444" 
        sectionSize={5} 
        sectionColor="#666" 
        fadeDistance={120}
        infiniteGrid
      />

      {/* Renderizar malhas reais */}
      {meshes && meshes.length > 0 && (
        <MeshRenderer meshes={meshes} backfaceCulling={backfaceCulling ?? false} materials={materials} />
      )}

      {/* Loading indicator */}
      {isLoading && (
        <mesh position={[0, 1, 0]}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial color="#3b82f6" wireframe />
        </mesh>
      )}

      {/* Error indicator */}
      {error && (!meshes || meshes.length === 0) && (
        <mesh position={[0, 1, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      )}

      {/* Controls com ref */}
      <OrbitControls 
        makeDefault 
        ref={(ref) => {
          if (ref && onCameraRef) {
            console.log('[Scene] OrbitControls ref ready')
            onCameraRef(ref)
          }
        }}
      />
      
      {/* Gizmo */}
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport 
          axisColors={['#f43f5e', '#10b981', '#3b82f6']} 
          labelColor="white"
        />
      </GizmoHelper>
    </>
  )
}

export function Scene({ selectedResource, childResources, packName, onCameraRef, backfaceCulling = false }: ViewportProps) {
  useEffect(() => {
    console.log('[Scene Component] Mounted')
    console.log('[Scene Component] Selected resource:', selectedResource)
    console.log('[Scene Component] Pack name:', packName)
  }, [])

  useEffect(() => {
    console.log('[Scene Component] Resource updated:', selectedResource)
    console.log('[Scene Component] Pack name updated:', packName)
  }, [selectedResource, packName])

  return (
    <div className="w-full h-full bg-zinc-950">
      <Canvas
        shadows
        camera={{ position: [-50, 50, -50], fov: 50 }}
        gl={{ preserveDrawingBuffer: true }}
        onCreated={({ gl, camera }) => {
          console.log('[Canvas] Created')
          console.log('[Canvas] Camera position:', camera.position)
          console.log('[Canvas] WebGL version:', gl.capabilities.isWebGL2 ? 'WebGL2' : 'WebGL1')
        }}
      >
        <Suspense fallback={null}>
          <SceneContent
            selectedResource={selectedResource}
            childResources={childResources}
            packName={packName}
            onCameraRef={onCameraRef}
            backfaceCulling={backfaceCulling}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
