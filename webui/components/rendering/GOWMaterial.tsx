import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useThree, useFrame } from '@react-three/fiber'
import type { Material, MaterialLayer, BlendMethod } from '@/lib/rendering/material-types'
import {
  loadGOWShaders,
  createGOWShaderMaterial,
  updateLayerUniforms,
  updateMaterialColor,
  updateCameraUniforms,
  updateModelTransform,
  setUseVertexColors,
} from '@/lib/rendering/shader-utils'

export interface GOWMaterialProps {
  /** Material data */
  material: Material
  /** Active layer index (default: 0) */
  activeLayerIndex?: number
  /** Model transformation matrix */
  modelMatrix?: THREE.Matrix4
  /** Whether to use vertex colors */
  useVertexColors?: boolean
  /** Callback when material is ready */
  onMaterialReady?: (material: THREE.ShaderMaterial) => void
}

/**
 * God of War custom shader material component for React Three Fiber
 * Handles loading shaders and creating Three.js ShaderMaterial
 */
export function GOWMaterial({
  material,
  activeLayerIndex = 0,
  modelMatrix,
  useVertexColors = false,
  onMaterialReady,
}: GOWMaterialProps) {
  const { camera } = useThree()
  const [shaderMaterial, setShaderMaterial] = useState<THREE.ShaderMaterial | null>(null)
  const materialRef = useRef<THREE.ShaderMaterial | null>(null)

  // Load shaders and create material
  useEffect(() => {
    let mounted = true

    const initMaterial = async () => {
      try {
        // Load shader source code
        const { vertexShader, fragmentShader } = await loadGOWShaders()

        if (!mounted) return

        // Get active layer
        const activeLayer = material.layers[activeLayerIndex]
        if (!activeLayer) {
          console.warn('No active layer found for material')
          return
        }

        // Create shader material with blend method from layer
        const mat = createGOWShaderMaterial(
          vertexShader,
          fragmentShader,
          activeLayer.method
        )

        // Set material base color
        updateMaterialColor(mat.uniforms as any, material.color)

        // Set vertex color usage
        setUseVertexColors(mat.uniforms as any, useVertexColors)

        // Store material
        materialRef.current = mat
        setShaderMaterial(mat)

        // Notify parent
        onMaterialReady?.(mat)
      } catch (error) {
        console.error('Failed to initialize GOW material:', error)
      }
    }

    initMaterial()

    return () => {
      mounted = false
      // Cleanup material
      if (materialRef.current) {
        materialRef.current.dispose()
        materialRef.current = null
      }
    }
  }, []) // Only run once on mount

  // Update layer uniforms when layer changes
  useEffect(() => {
    if (!shaderMaterial) return

    const activeLayer = material.layers[activeLayerIndex]
    if (!activeLayer) return

    // Get textures
    const diffuseTexture = activeLayer.textures[activeLayer.textureIndex]?.texture || null
    const envmapLayer = material.layers.find((l) => l.isEnvMap)
    const envmapTexture = envmapLayer?.textures[envmapLayer.textureIndex]?.texture || null

    // Update uniforms
    updateLayerUniforms(
      shaderMaterial.uniforms as any,
      activeLayer.color,
      activeLayer.uvOffset,
      diffuseTexture,
      envmapTexture
    )

    shaderMaterial.needsUpdate = true
  }, [shaderMaterial, material, activeLayerIndex])

  // Update camera and model transform every frame
  useFrame(() => {
    if (!shaderMaterial) return

    // Update camera matrices
    updateCameraUniforms(shaderMaterial.uniforms as any, camera)

    // Update model transform if provided
    if (modelMatrix) {
      updateModelTransform(shaderMaterial.uniforms as any, modelMatrix)
    }

    shaderMaterial.uniformsNeedUpdate = true
  })

  // Return the material as a primitive
  if (!shaderMaterial) return null

  return <primitive object={shaderMaterial} attach="material" />
}

/**
 * Hook to use GOW shader material outside of React Three Fiber context
 * Useful for manual Three.js scene management
 */
export function useGOWMaterial(material: Material, activeLayerIndex = 0) {
  const [shaderMaterial, setShaderMaterial] = useState<THREE.ShaderMaterial | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let mounted = true

    const initMaterial = async () => {
      try {
        const { vertexShader, fragmentShader } = await loadGOWShaders()

        if (!mounted) return

        const activeLayer = material.layers[activeLayerIndex]
        if (!activeLayer) return

        const mat = createGOWShaderMaterial(
          vertexShader,
          fragmentShader,
          activeLayer.method
        )

        updateMaterialColor(mat.uniforms as any, material.color)

        setShaderMaterial(mat)
        setIsReady(true)
      } catch (error) {
        console.error('Failed to create GOW material:', error)
      }
    }

    initMaterial()

    return () => {
      mounted = false
      if (shaderMaterial) {
        shaderMaterial.dispose()
      }
    }
  }, [material, activeLayerIndex])

  return { shaderMaterial, isReady }
}
