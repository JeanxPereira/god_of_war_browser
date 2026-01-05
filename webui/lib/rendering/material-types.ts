import * as THREE from 'three'

/**
 * Blend method for material layers
 * Based on the old UI rendering system
 */
export enum BlendMethod {
  /** Normal blending: SRC_ALPHA, ONE_MINUS_SRC_ALPHA */
  Normal = 0,
  /** Additive blending: SRC_ALPHA, ONE */
  Additive = 1,
  /** Subtractive blending */
  Subtract = 2,
  /** Unknown/special blending method */
  Unknown = 3,
}

/**
 * Texture data for a material layer
 */
export interface RenderTexture {
  /** WebGL texture object */
  texture: THREE.Texture | null
  /** Whether the texture has been loaded */
  loaded: boolean
  /** Base64 data URL or regular URL */
  url: string
  /** Special flag for font textures */
  isFontTexture?: boolean
}

/**
 * Material layer - represents one rendering pass with a texture
 */
export interface MaterialLayer {
  /** Layer tint color [r, g, b, a] - values 0-1 */
  color: [number, number, number, number]
  /** UV offset for texture animation [u, v] */
  uvOffset: [number, number]
  /** Current texture index (for sheet animations) */
  textureIndex: number
  /** Array of textures for this layer (for animated texture sheets) */
  textures: RenderTexture[]
  /** Blending method */
  method: BlendMethod
  /** Whether this layer has alpha transparency */
  hasAlpha: boolean
  /** Is this the environment map layer */
  isEnvMap?: boolean
}

/**
 * Complete material definition
 */
export interface Material {
  /** Base material color [r, g, b, a] - multiplied with all layers */
  color: [number, number, number, number]
  /** Array of rendering layers */
  layers: MaterialLayer[]
  /** Material animations (UV animations, texture sheet animations) */
  animations?: MaterialAnimation[]
}

/**
 * Material animation types
 */
export enum MaterialAnimationType {
  /** UV offset animation (scrolling textures) */
  LayerUV = 8,
  /** Texture sheet animation (switching between texture frames) */
  Sheet = 9,
}

/**
 * Material animation data
 */
export interface MaterialAnimation {
  /** Animation type */
  type: MaterialAnimationType
  /** Target layer index */
  layerIndex: number
  /** Animation keyframes/data */
  data: any
  /** Whether animation is enabled */
  enabled: boolean
}

/**
 * Mesh rendering data
 */
export interface RenderMesh {
  /** Vertex position buffer */
  positions: Float32Array
  /** Vertex indices for faces */
  indices: Uint16Array | Uint32Array
  /** Vertex colors (RGBA) */
  colors?: Uint8Array
  /** UV coordinates */
  uvs?: Float32Array
  /** Normals */
  normals?: Float32Array
  /** First bone ID per vertex (for skeletal animation) */
  jointIds1?: Int8Array
  /** Second bone ID per vertex (for skeletal animation) */
  jointIds2?: Int8Array
  /** Bone weights per vertex (for skeletal animation) */
  weights?: Float32Array
  /** Material index in model's material array */
  materialIndex: number
  /** Override layer index for this mesh */
  layerOverride?: number
  /** Enable depth testing */
  isDepthTested: boolean
  /** Has alpha transparency */
  hasAlpha: boolean
  /** Is visible */
  isVisible: boolean
  /** PS3 static mesh flag */
  ps3Static?: boolean
  /** Use inverted matrix for skinning */
  useBindToJoint?: boolean
}

/**
 * Complete 3D model with meshes and materials
 */
export interface RenderModel {
  /** Model visibility */
  visible: boolean
  /** Array of meshes */
  meshes: RenderMesh[]
  /** Array of materials */
  materials: Material[]
  /** Bitmask for filtering */
  mask?: number
  /** Special type (e.g., "sky" for skybox rendering) */
  type?: string
  /** Show only specific meshes (for highlighting) */
  exclusiveMeshes?: number[]
}

/**
 * Joint/bone data for skeletal animation
 */
export interface Joint {
  /** Joint name */
  name: string
  /** Parent joint index (-1 for root) */
  parentIndex: number
  /** Local transformation matrix */
  localMatrix: THREE.Matrix4
  /** Global/world transformation matrix */
  globalMatrix: THREE.Matrix4
  /** Render matrix (for skinning) */
  renderMatrix: THREE.Matrix4
  /** Bind pose inverse matrix */
  bindPoseInverse?: THREE.Matrix4
}

/**
 * Skeletal animation data
 */
export interface Skeleton {
  /** Array of joints */
  joints: Joint[]
  /** Root joint index */
  rootIndex: number
}

/**
 * Shader uniform values for material rendering
 */
export interface MaterialUniforms {
  /** Projection matrix */
  umProjection: { value: THREE.Matrix4 }
  /** View matrix */
  umView: { value: THREE.Matrix4 }
  /** Model transform matrix */
  umModelTransform: { value: THREE.Matrix4 }
  /** Joint/bone matrices (up to 12) */
  umJoints: { value: THREE.Matrix4[] }
  /** Material base color */
  uMaterialColor: { value: THREE.Vector4 }
  /** Layer color */
  uLayerColor: { value: THREE.Vector4 }
  /** UV offset for layer animation */
  uLayerOffset: { value: THREE.Vector2 }
  /** Diffuse texture sampler */
  uLayerDiffuseSampler: { value: THREE.Texture | null }
  /** Environment map sampler */
  uLayerEnvmapSampler: { value: THREE.Texture | null }
  /** Use diffuse texture */
  uUseLayerDiffuseSampler: { value: boolean }
  /** Use environment map */
  uUseEnvmapSampler: { value: boolean }
  /** Use vertex colors */
  uUseVertexColor: { value: boolean }
  /** Use skeletal animation */
  uUseJoints: { value: boolean }
  /** Use model transform */
  uUseModelTransform: { value: boolean }
}
