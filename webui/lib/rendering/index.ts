/**
 * God of War Rendering System
 *
 * Sistema completo de renderização portado da UI antiga
 * para Next.js com Three.js e React Three Fiber
 */

// Export all types
export type {
  RenderTexture,
  MaterialLayer,
  Material,
  MaterialAnimation,
  RenderMesh,
  RenderModel,
  Joint,
  Skeleton,
  MaterialUniforms,
} from './material-types'

export {
  BlendMethod,
  MaterialAnimationType,
} from './material-types'

// Export texture hooks
export {
  useTexture,
  useTextures,
  useRenderTextures,
  usePreloadTextures,
  clearTextureCache,
  getTextureCacheSize,
} from './useTexture'

// Export shader utilities
export {
  loadShaderSource,
  createMaterialUniforms,
  applyBlendMethod,
  createGOWShaderMaterial,
  updateLayerUniforms,
  updateMaterialColor,
  updateCameraUniforms,
  updateModelTransform,
  updateJointMatrices,
  setUseVertexColors,
  loadGOWShaders,
  clearShaderCache,
} from './shader-utils'

// Re-export GOWMaterial component
export { GOWMaterial, useGOWMaterial } from '@/components/rendering/GOWMaterial'
export type { GOWMaterialProps } from '@/components/rendering/GOWMaterial'
