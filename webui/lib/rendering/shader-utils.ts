import * as THREE from 'three'
import type { MaterialUniforms, BlendMethod } from './material-types'

/**
 * Load shader source code from public/shaders directory
 * @param filename - Shader filename (e.g., "SkinnedTextured.vs")
 * @returns Promise that resolves to shader source code
 */
export async function loadShaderSource(filename: string): Promise<string> {
  const response = await fetch(`/shaders/${filename}`)
  if (!response.ok) {
    throw new Error(`Failed to load shader: ${filename}`)
  }
  return response.text()
}

/**
 * Create initial uniform values for God of War material shader
 * @returns Object with all shader uniforms
 */
export function createMaterialUniforms(): MaterialUniforms {
  // Create array of 12 identity matrices for joints
  const jointMatrices = Array.from({ length: 12 }, () => new THREE.Matrix4())

  return {
    umProjection: { value: new THREE.Matrix4() },
    umView: { value: new THREE.Matrix4() },
    umModelTransform: { value: new THREE.Matrix4() },
    umJoints: { value: jointMatrices },
    uMaterialColor: { value: new THREE.Vector4(1, 1, 1, 1) },
    uLayerColor: { value: new THREE.Vector4(1, 1, 1, 1) },
    uLayerOffset: { value: new THREE.Vector2(0, 0) },
    uLayerDiffuseSampler: { value: null },
    uLayerEnvmapSampler: { value: null },
    uUseLayerDiffuseSampler: { value: false },
    uUseEnvmapSampler: { value: false },
    uUseVertexColor: { value: false },
    uUseJoints: { value: false },
    uUseModelTransform: { value: true },
  }
}

/**
 * Configure Three.js blending based on God of War blend method
 * @param material - Three.js material to configure
 * @param blendMethod - God of War blend method enum
 */
export function applyBlendMethod(
  material: THREE.Material,
  blendMethod: BlendMethod
): void {
  switch (blendMethod) {
    case BlendMethod.Normal:
      // Normal alpha blending: SRC_ALPHA, ONE_MINUS_SRC_ALPHA
      material.blending = THREE.NormalBlending
      material.transparent = true
      material.depthWrite = true
      break

    case BlendMethod.Additive:
      // Additive blending: SRC_ALPHA, ONE
      material.blending = THREE.AdditiveBlending
      material.transparent = true
      material.depthWrite = false
      break

    case BlendMethod.Subtract:
      // Subtractive blending
      material.blending = THREE.SubtractiveBlending
      material.transparent = true
      material.depthWrite = false
      break

    case BlendMethod.Unknown:
      // Unknown method - use multiply blending as fallback
      material.blending = THREE.MultiplyBlending
      material.transparent = true
      material.depthWrite = false
      break

    default:
      // Default to normal blending
      material.blending = THREE.NormalBlending
      material.transparent = true
      material.depthWrite = true
  }
}

/**
 * Create a custom ShaderMaterial for God of War rendering
 * @param vertexShader - Vertex shader source code
 * @param fragmentShader - Fragment shader source code
 * @param blendMethod - Blend method for this material
 * @returns Configured ShaderMaterial
 */
export function createGOWShaderMaterial(
  vertexShader: string,
  fragmentShader: string,
  blendMethod: BlendMethod = BlendMethod.Normal
): THREE.ShaderMaterial {
  const uniforms = createMaterialUniforms()

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    // Don't specify glslVersion - let Three.js auto-detect from shader syntax
    side: THREE.DoubleSide,
    transparent: true,
    depthTest: true,
    depthWrite: true,
  })

  // Apply blend method
  applyBlendMethod(material, blendMethod)

  return material
}

/**
 * Update material uniforms for a specific layer
 * @param uniforms - Material uniforms object
 * @param layerColor - Layer color [r, g, b, a]
 * @param layerOffset - UV offset [u, v]
 * @param diffuseTexture - Diffuse texture (optional)
 * @param envmapTexture - Environment map texture (optional)
 */
export function updateLayerUniforms(
  uniforms: MaterialUniforms,
  layerColor: [number, number, number, number],
  layerOffset: [number, number],
  diffuseTexture?: THREE.Texture | null,
  envmapTexture?: THREE.Texture | null
): void {
  // Update layer color
  uniforms.uLayerColor.value.set(
    layerColor[0],
    layerColor[1],
    layerColor[2],
    layerColor[3]
  )

  // Update UV offset
  uniforms.uLayerOffset.value.set(layerOffset[0], layerOffset[1])

  // Update diffuse texture
  if (diffuseTexture) {
    uniforms.uLayerDiffuseSampler.value = diffuseTexture
    uniforms.uUseLayerDiffuseSampler.value = true
  } else {
    uniforms.uLayerDiffuseSampler.value = null
    uniforms.uUseLayerDiffuseSampler.value = false
  }

  // Update environment map
  if (envmapTexture) {
    uniforms.uLayerEnvmapSampler.value = envmapTexture
    uniforms.uUseEnvmapSampler.value = true
  } else {
    uniforms.uLayerEnvmapSampler.value = null
    uniforms.uUseEnvmapSampler.value = false
  }
}

/**
 * Update material base color
 * @param uniforms - Material uniforms object
 * @param color - Material color [r, g, b, a]
 */
export function updateMaterialColor(
  uniforms: MaterialUniforms,
  color: [number, number, number, number]
): void {
  uniforms.uMaterialColor.value.set(color[0], color[1], color[2], color[3])
}

/**
 * Update camera matrices for rendering
 * @param uniforms - Material uniforms object
 * @param camera - Three.js camera
 */
export function updateCameraUniforms(
  uniforms: MaterialUniforms,
  camera: THREE.Camera
): void {
  // Update projection matrix
  uniforms.umProjection.value.copy(camera.projectionMatrix)

  // Update view matrix (inverse of camera's world matrix)
  uniforms.umView.value.copy(camera.matrixWorldInverse)
}

/**
 * Update model transform matrix
 * @param uniforms - Material uniforms object
 * @param modelMatrix - Model's world transformation matrix
 */
export function updateModelTransform(
  uniforms: MaterialUniforms,
  modelMatrix: THREE.Matrix4
): void {
  uniforms.umModelTransform.value.copy(modelMatrix)
  uniforms.uUseModelTransform.value = true
}

/**
 * Update joint/bone matrices for skeletal animation
 * @param uniforms - Material uniforms object
 * @param jointMatrices - Array of joint transformation matrices (max 12)
 */
export function updateJointMatrices(
  uniforms: MaterialUniforms,
  jointMatrices: THREE.Matrix4[]
): void {
  const maxJoints = Math.min(jointMatrices.length, 12)

  for (let i = 0; i < maxJoints; i++) {
    uniforms.umJoints.value[i].copy(jointMatrices[i])
  }

  uniforms.uUseJoints.value = maxJoints > 0
}

/**
 * Enable/disable vertex colors
 * @param uniforms - Material uniforms object
 * @param enabled - Whether to use vertex colors
 */
export function setUseVertexColors(
  uniforms: MaterialUniforms,
  enabled: boolean
): void {
  uniforms.uUseVertexColor.value = enabled
}

/**
 * Shader cache to avoid reloading
 */
const shaderCache = new Map<string, string>()

/**
 * Load both vertex and fragment shaders
 * @returns Promise with vertex and fragment shader sources
 */
export async function loadGOWShaders(): Promise<{
  vertexShader: string
  fragmentShader: string
}> {
  const vertexFilename = 'SkinnedTextured.vs'
  const fragmentFilename = 'SkinnedTextured.fs'

  // Check cache
  let vertexShader = shaderCache.get(vertexFilename)
  let fragmentShader = shaderCache.get(fragmentFilename)

  // Load if not cached
  if (!vertexShader) {
    vertexShader = await loadShaderSource(vertexFilename)
    shaderCache.set(vertexFilename, vertexShader)
  }

  if (!fragmentShader) {
    fragmentShader = await loadShaderSource(fragmentFilename)
    shaderCache.set(fragmentFilename, fragmentShader)
  }

  return { vertexShader, fragmentShader }
}

/**
 * Clear shader cache
 */
export function clearShaderCache(): void {
  shaderCache.clear()
}
