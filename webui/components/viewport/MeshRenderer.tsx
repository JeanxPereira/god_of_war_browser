import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'

type BuiltMesh = {
  geometry: THREE.BufferGeometry
  hasJoints: boolean
  hasVertexColors: boolean
  hasUVs: boolean
  joints: number[]
  joints2: number[]
  weights: number[]
  name: string
  materialId?: number
}

type MaterialInfo = {
  color?: [number, number, number, number]
  textureUrl?: string
  hasAlpha?: boolean
}

type MeshRendererProps = {
  meshes: BuiltMesh[]
  backfaceCulling?: boolean
  materials?: MaterialInfo[] | null
}

export function MeshRenderer({ meshes, backfaceCulling = true, materials }: MeshRendererProps) {
  const ENABLE_CUSTOM_SHADER = process.env.NEXT_PUBLIC_ENABLE_CUSTOM_SHADER === '1'
  const [vertexShader, setVertexShader] = useState<string | null>(null)
  const [fragmentShader, setFragmentShader] = useState<string | null>(null)
  const [shaderError, setShaderError] = useState<string | null>(null)

  const ensureGeometryAttributes = (mesh: BuiltMesh) => {
    const geometry = mesh.geometry
    const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute | undefined
    const vertexCount = positionAttr?.count ?? 0

    if (vertexCount === 0) {
      console.warn('[MeshRenderer] Mesh has no vertices:', mesh.name)
      return
    }

    // Set joint attributes FIRST if mesh has joints
    if (mesh.hasJoints && mesh.joints.length > 0) {
      // Validate joint data length
      if (mesh.joints.length !== vertexCount || mesh.joints2.length !== vertexCount || mesh.weights.length !== vertexCount) {
        console.warn(`[MeshRenderer] Joint data length mismatch for ${mesh.name}:`, {
          vertices: vertexCount,
          joints: mesh.joints.length,
          joints2: mesh.joints2.length,
          weights: mesh.weights.length
        })
      }

      geometry.setAttribute(
        'jointId1',
        new THREE.Float32BufferAttribute(mesh.joints, 1)
      )
      geometry.setAttribute(
        'jointId2',
        new THREE.Float32BufferAttribute(mesh.joints2, 1)
      )
      geometry.setAttribute(
        'weight',
        new THREE.Float32BufferAttribute(mesh.weights, 1)
      )
    } else {
      // Create default joint attributes for non-skinned meshes
      const zeros = new Float32Array(vertexCount).fill(0)
      const ones = new Float32Array(vertexCount).fill(1)

      geometry.setAttribute('jointId1', new THREE.Float32BufferAttribute(zeros, 1))
      geometry.setAttribute('jointId2', new THREE.Float32BufferAttribute(zeros, 1))
      geometry.setAttribute('weight', new THREE.Float32BufferAttribute(ones, 1))
    }

    // Ensure we have vertex colors (required by our shader)
    const colorAttr =
      (geometry.getAttribute('color') as THREE.BufferAttribute | undefined) ||
      (geometry.getAttribute('aVertexColor') as THREE.BufferAttribute | undefined)
    if (colorAttr) {
      // Normalize to the attribute name our shaders expect
      geometry.setAttribute('color', colorAttr)
    } else {
      // Create white vertex colors (RGBA normalized floats)
      const colors = new Float32Array(vertexCount * 4)
      for (let i = 0; i < vertexCount; i++) {
        colors[i * 4 + 0] = 1.0 // R
        colors[i * 4 + 1] = 1.0 // G
        colors[i * 4 + 2] = 1.0 // B
        colors[i * 4 + 3] = 1.0 // A
      }
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4))
    }

    // Ensure UVs exist
    const uvAttr = geometry.getAttribute('uv') as THREE.BufferAttribute | undefined
    if (!uvAttr) {
      const uvs = new Float32Array(vertexCount * 2).fill(0)
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    }
  }

  useEffect(() => {
    Promise.all([
      fetch('/shaders/SkinnedTextured.vs').then((r) => r.text()),
      fetch('/shaders/SkinnedTextured.fs').then((r) => r.text()),
    ])
      .then(([vs, fs]) => {
        setVertexShader(vs)
        setFragmentShader(fs)
        setShaderError(null)
        console.log('[MeshRenderer] Shaders loaded')
      })
      .catch((err) => {
        console.error('[MeshRenderer] Failed to load shaders:', err)
        setShaderError('shader-load')
      })
  }, [])

  const meshMaterials = useMemo(() => {
    const useShader = ENABLE_CUSTOM_SHADER && !!vertexShader && !!fragmentShader && !shaderError

    const textureLoader = new THREE.TextureLoader()

    return meshes.map((mesh, meshIndex) => {
      const geometry = mesh.geometry
      const hasColorAttr =
        !!geometry.getAttribute('color') || !!geometry.getAttribute('aVertexColor')
      const useVertexColors = mesh.hasVertexColors || hasColorAttr

      const matInfo = materials?.[mesh.materialId ?? 0] ?? materials?.[0]
      const baseColor = matInfo?.color
      const textureUrl = matInfo?.textureUrl
      const hasAlpha = !!matInfo?.hasAlpha

      const fallbackMaterial = new THREE.MeshStandardMaterial({
        color: baseColor ? new THREE.Color(baseColor[0], baseColor[1], baseColor[2]) : new THREE.Color('#7dd3fc'),
        flatShading: true,
        side: backfaceCulling ? THREE.FrontSide : THREE.DoubleSide,
        vertexColors: useVertexColors,
        transparent: !!hasAlpha,
        opacity: baseColor ? baseColor[3] ?? 1 : 1,
        alphaTest: hasAlpha ? 0.01 : 0,
        depthWrite: !hasAlpha,
      })

      if (textureUrl) {
        const map = textureLoader.load(textureUrl)
        map.flipY = false
        map.colorSpace = THREE.SRGBColorSpace
        fallbackMaterial.map = map
        fallbackMaterial.needsUpdate = true
      }

      ensureGeometryAttributes(mesh)

      if (!useShader) {
        return fallbackMaterial
      }

      // Log mesh attributes for debugging
      console.log(`[MeshRenderer] Mesh ${meshIndex} (${mesh.name}):`, {
        hasJoints: mesh.hasJoints,
        hasVertexColors: mesh.hasVertexColors,
        hasUVs: mesh.hasUVs,
        attributes: Object.keys(mesh.geometry.attributes)
      })

      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        // Don't use vertexColors:true - we declare attributes explicitly in shader
        uniforms: {
          // Transform uniforms
          umModelTransform: { value: new THREE.Matrix4() },
          umProjection: { value: new THREE.Matrix4() },
          umView: { value: new THREE.Matrix4() },

          // Layer uniforms
          uLayerOffset: { value: new THREE.Vector2(0, 0) },
          uLayerColor: { value: new THREE.Vector4(1, 1, 1, 1) },

          // Material uniforms
          uMaterialColor: { value: new THREE.Vector4(1, 1, 1, 1) },

          // Texture uniforms
          uLayerDiffuseSampler: { value: null },
          uLayerEnvmapSampler: { value: null },

          // Joint uniforms (up to 12 joints)
          umJoints: { value: Array(12).fill(null).map(() => new THREE.Matrix4()) },

          // Feature flags
          uUseJoints: { value: mesh.hasJoints },
          uUseVertexColor: { value: useVertexColors },
          uUseModelTransform: { value: true },
          uUseEnvmapSampler: { value: false },
          uUseBlendAttribute: { value: false },
          uUseLayerDiffuseSampler: { value: false },
        },
        side: backfaceCulling ? THREE.FrontSide : THREE.DoubleSide,
        transparent: mesh.hasVertexColors || hasAlpha,
        depthWrite: true,
        depthTest: true,
      })

      // Check for compilation errors
      material.customProgramCacheKey = () => {
        return `gow-shader-${mesh.hasJoints}-${mesh.hasVertexColors}-${backfaceCulling}`
      }

      if (textureUrl) {
        const map = textureLoader.load(textureUrl)
        material.uniforms.uLayerDiffuseSampler.value = map
        material.uniforms.uUseLayerDiffuseSampler.value = true
      }

      if (baseColor) {
        material.uniforms.uMaterialColor.value = new THREE.Vector4(baseColor[0], baseColor[1], baseColor[2], baseColor[3] ?? 1)
      }

      return material
    })
  }, [meshes, vertexShader, fragmentShader, backfaceCulling, shaderError, materials])

  return (
    <group>
      {meshes.map((mesh, idx) => (
        <primitive
          key={mesh.name}
          object={new THREE.Mesh(mesh.geometry, meshMaterials[idx])}
          onBeforeRender={(_, __, camera) => {
            const material = meshMaterials[idx] as THREE.ShaderMaterial
            if ((material as any).uniforms) {
              material.uniforms.umProjection.value = camera.projectionMatrix
              material.uniforms.umView.value = camera.matrixWorldInverse
            }
          }}
        />
      ))}
    </group>
  )
}
