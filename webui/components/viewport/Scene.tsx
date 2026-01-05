"use client"

import { Canvas, useThree } from "@react-three/fiber"
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from "@react-three/drei"
import { Suspense, useEffect, memo } from "react"
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
  materialsDisabled?: boolean
  isolatedMeshName?: string | null
  backgroundColor?: string
}

// Componente memoizado para evitar re-renderizações do conteúdo da cena
// quando props irrelevantes do pai mudarem.
const SceneContent = memo(function SceneContent({ 
  selectedResource, 
  childResources, 
  packName, 
  onCameraRef, 
  backfaceCulling,
  materialsDisabled,
  isolatedMeshName,
  backgroundColor = "#0a0a0a"
}: ViewportProps) {
  
  // Log de debug mantido, mas controlado
  useEffect(() => {
    if (selectedResource || packName) {
      console.log('[Scene] Loading resource:', { pack: packName, id: selectedResource?.id })
    }
  }, [selectedResource?.id, packName])

  const { meshes, materials, isLoading, error } = useMeshLoader(
    packName || null,
    selectedResource?.id || null,
    selectedResource?.type || null,
    selectedResource?.name || null,
    selectedResource?.size ?? null,
    childResources || null
  )

  const { invalidate, camera, controls, gl } = useThree((state) => ({
    invalidate: state.invalidate,
    camera: state.camera,
    controls: state.controls as any,
    gl: state.gl
  }))

  useEffect(() => {
    if (meshes) {
      invalidate()
    }
  }, [meshes, invalidate])

  // Auto enquadra os meshes carregados para garantir que fiquem visíveis.
  useEffect(() => {
    if (!meshes || meshes.length === 0) return

    const sceneBox = new THREE.Box3()
    let hasGeometry = false

    meshes.forEach((mesh) => {
      const geometry = mesh.geometry
      if (!geometry) return

      if (!geometry.boundingBox) {
        geometry.computeBoundingBox()
      }
      if (!geometry.boundingBox) return

      const meshBox = geometry.boundingBox.clone()

      // Se a malha tem matriz (instância), aplicamos para considerar a posição real.
      if (mesh.matrix) {
        meshBox.applyMatrix4(mesh.matrix)
      }

      sceneBox.union(meshBox)
      hasGeometry = true
    })

    if (!hasGeometry) return

    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    sceneBox.getSize(size)
    sceneBox.getCenter(center)

    const maxDim = Math.max(size.x, size.y, size.z, 1)
    const fitHeightDistance = maxDim / (2 * Math.tan((camera.fov * Math.PI) / 360))
    const fitWidthDistance = fitHeightDistance / Math.max(camera.aspect, 0.1)
    const distance = 1.2 * Math.max(fitHeightDistance, fitWidthDistance)

    const direction = camera.position.clone().sub(center)
    if (direction.lengthSq() < 1e-6) {
      direction.set(1, 1, 1)
    }
    direction.normalize()
    const newPosition = center.clone().add(direction.multiplyScalar(distance))

    camera.position.copy(newPosition)
    camera.near = Math.max(distance / 50, 0.1)
    camera.far = Math.max(distance * 50, camera.far)
    camera.updateProjectionMatrix()

    if (controls) {
      // @ts-expect-error drei injeta controls no contexto
      controls.target.copy(center)
      // @ts-expect-error drei injeta controls no contexto
      controls.update()
    } else {
      camera.lookAt(center)
    }

    invalidate()
  }, [meshes, camera, controls, invalidate])

  useEffect(() => {
    gl.setClearColor(new THREE.Color(backgroundColor))
    invalidate()
  }, [gl, backgroundColor, invalidate])

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
        <MeshRenderer 
          meshes={meshes} 
          backfaceCulling={backfaceCulling ?? false} 
          materials={materialsDisabled ? null : materials} 
          // Desliga shader custom em cenas grandes (ex: 0x800000) ou quando materiais estão off
          useCustomShader={!materialsDisabled && selectedResource?.type?.toLowerCase?.() !== '0x800000' && selectedResource?.type?.toLowerCase?.() !== '0x80000001'}
          isolatedMeshName={isolatedMeshName}
        />
      )}

      {/* Loading indicator (visual simples 3D) */}
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

      {/* Controls */}
      <OrbitControls 
        makeDefault 
        ref={onCameraRef}
        dampingFactor={0.1}
        rotateSpeed={0.5}
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
})

export function Scene(props: ViewportProps) {
  return (
    <div className="w-full h-full" style={{ backgroundColor: props.backgroundColor || "#0a0a0a" }}>
      <Canvas
        shadows
        // PERFORMANCE CRÍTICA: 'demand' significa que o loop de render para quando nada move.
        // O Three.js só desenha se a câmera mover ou props mudarem.
        frameloop="demand"
        camera={{ position: [-50, 50, -50], fov: 50 }}
        gl={{ 
          // PERFORMANCE CRÍTICA: 'false' economiza buffer swap. Só use true se precisar tirar print do canvas.
          preserveDrawingBuffer: false,
          powerPreference: "high-performance",
          antialias: true,
          alpha: false // Fundo opaco é mais rápido
        }}
        dpr={[1, 2]} // Limita pixel ratio para não fritar em telas Retina
        onCreated={({ gl }) => {
          console.log('[Canvas] Created with WebGL', gl.capabilities.isWebGL2 ? '2' : '1')
        }}
      >
        <Suspense fallback={null}>
          <SceneContent {...props} />
        </Suspense>
      </Canvas>
    </div>
  )
}
