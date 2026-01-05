import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'

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
  matrix?: THREE.Matrix4
  isSky?: boolean
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
  useCustomShader?: boolean
  isolatedMeshName?: string | null
}

export function MeshRenderer({ meshes, backfaceCulling = true, materials, useCustomShader = true, isolatedMeshName }: MeshRendererProps) {
  // Acesso ao contexto Three para invalidar frame se necessário (útil em frameloop='demand')
  const { invalidate } = useThree()
  
  const ENABLE_CUSTOM_SHADER = process.env.NEXT_PUBLIC_ENABLE_CUSTOM_SHADER === '1'
  const [vertexShader, setVertexShader] = useState<string | null>(null)
  const [fragmentShader, setFragmentShader] = useState<string | null>(null)
  const [shaderError, setShaderError] = useState<string | null>(null)

  // 1. Carregamento de Shaders (Executa apenas uma vez)
  useEffect(() => {
    let active = true
    Promise.all([
      fetch('/shaders/SkinnedTextured.vs').then((r) => r.text()),
      fetch('/shaders/SkinnedTextured.fs').then((r) => r.text()),
    ])
      .then(([vs, fs]) => {
        if (active) {
          setVertexShader(vs)
          setFragmentShader(fs)
          setShaderError(null)
          console.log('[MeshRenderer] Shaders loaded')
          invalidate() // Força um novo frame após carregar shaders
        }
      })
      .catch((err) => {
        if (active) {
          console.error('[MeshRenderer] Failed to load shaders:', err)
          setShaderError('shader-load')
        }
      })
    return () => { active = false }
  }, [invalidate])

  // 2. Processamento de Geometria (Side Effect)
  // Garante atributos necessários sem recriar a cada render
  useEffect(() => {
    meshes.forEach((mesh) => {
      const geometry = mesh.geometry
      
      // Verificação simples para evitar reprocessamento
      if (geometry.userData.processed) return

      const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute | undefined
      const vertexCount = positionAttr?.count ?? 0

      if (vertexCount === 0) {
        console.warn('[MeshRenderer] Mesh has no vertices:', mesh.name)
        return
      }

      // Configuração de Joints
      if (mesh.hasJoints && mesh.joints.length > 0) {
        if (!geometry.getAttribute('jointId1')) {
          geometry.setAttribute('jointId1', new THREE.Float32BufferAttribute(mesh.joints, 1))
          geometry.setAttribute('jointId2', new THREE.Float32BufferAttribute(mesh.joints2, 1))
          geometry.setAttribute('weight', new THREE.Float32BufferAttribute(mesh.weights, 1))
        }
      } else if (!geometry.getAttribute('jointId1')) {
        const zeros = new Float32Array(vertexCount).fill(0)
        const ones = new Float32Array(vertexCount).fill(1)
        geometry.setAttribute('jointId1', new THREE.Float32BufferAttribute(zeros, 1))
        geometry.setAttribute('jointId2', new THREE.Float32BufferAttribute(zeros, 1))
        geometry.setAttribute('weight', new THREE.Float32BufferAttribute(ones, 1))
      }

      // Configuração de Cores
      const colorAttr = (geometry.getAttribute('color') || geometry.getAttribute('aVertexColor')) as THREE.BufferAttribute
      if (colorAttr) {
        if (colorAttr.name !== 'color') geometry.setAttribute('color', colorAttr)
      } else if (!geometry.getAttribute('color')) {
        const colors = new Float32Array(vertexCount * 4).fill(1.0)
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4))
      }

      // Configuração de UVs
      if (!geometry.getAttribute('uv')) {
        const uvs = new Float32Array(vertexCount * 2).fill(0)
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
      } else {
        // Corrige flip vertical invertendo V nas UVs
        const uvAttr = geometry.getAttribute('uv') as THREE.BufferAttribute
        const uvArray = uvAttr.array as Float32Array
        for (let i = 1; i < uvArray.length; i += 2) {
          uvArray[i] = 1 - uvArray[i]
        }
        uvAttr.needsUpdate = true
      }

      geometry.userData.processed = true
    })
    
    invalidate()
  }, [meshes, invalidate])

  // 3. Criação de Materiais (Memoizado)
  const meshMaterials = useMemo(() => {
    const useShader = useCustomShader && ENABLE_CUSTOM_SHADER && !!vertexShader && !!fragmentShader && !shaderError
    const textureLoader = new THREE.TextureLoader()

    return meshes.map((mesh) => {
      const geometry = mesh.geometry
      const hasColorAttr = !!geometry.getAttribute('color') || !!geometry.getAttribute('aVertexColor')
      const useVertexColors = mesh.hasVertexColors || hasColorAttr

      const matInfo = materials?.[mesh.materialId ?? 0] ?? materials?.[0]
      const baseColor = matInfo?.color
      const textureUrl = matInfo?.textureUrl
      const hasAlpha = !!matInfo?.hasAlpha

      // Material Fallback / Standard
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
        const map = textureLoader.load(textureUrl, () => invalidate())
        // Texturas do legado vêm invertidas no eixo Y; alinhar com WebGL padrão
        map.flipY = true
        map.colorSpace = THREE.SRGBColorSpace
        fallbackMaterial.map = map
      }

      if (!useShader) {
        return fallbackMaterial
      }

      // Shader Material Customizado
      const material = new THREE.ShaderMaterial({
        vertexShader: vertexShader!,
        fragmentShader: fragmentShader!,
        uniforms: {
          umModelTransform: { value: new THREE.Matrix4() },
          umProjection: { value: new THREE.Matrix4() },
          umView: { value: new THREE.Matrix4() },
          uLayerOffset: { value: new THREE.Vector2(0, 0) },
          uLayerColor: { value: new THREE.Vector4(1, 1, 1, 1) },
          uMaterialColor: { value: new THREE.Vector4(1, 1, 1, 1) },
          uLayerDiffuseSampler: { value: null },
          uLayerEnvmapSampler: { value: null },
          umJoints: { value: Array(12).fill(null).map(() => new THREE.Matrix4()) },
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

      // Cache Key para o Three.js não recompilar shaders idênticos
      material.customProgramCacheKey = () => {
        return `gow-shader-${mesh.hasJoints}-${mesh.hasVertexColors}-${backfaceCulling}`
      }

      if (textureUrl) {
        const map = textureLoader.load(textureUrl, () => invalidate())
        material.uniforms.uLayerDiffuseSampler.value = map
        material.uniforms.uUseLayerDiffuseSampler.value = true
      }

      if (baseColor) {
        material.uniforms.uMaterialColor.value = new THREE.Vector4(baseColor[0], baseColor[1], baseColor[2], baseColor[3] ?? 1)
      }

      // Configurações específicas para Skybox
      if (mesh.isSky) {
        material.depthWrite = false
        material.depthTest = false
      }

      return material
    })
  }, [meshes, vertexShader, fragmentShader, backfaceCulling, shaderError, materials, ENABLE_CUSTOM_SHADER, invalidate])

  const renderMeshes = useMemo(() => {
    if (isolatedMeshName) {
      return meshes.filter((m) => m.name === isolatedMeshName)
    }
    return meshes
  }, [meshes, isolatedMeshName])

  return (
    <group>
      {renderMeshes.map((mesh, idx) => (
        <mesh
          key={`${mesh.name}-${idx}`}
          geometry={mesh.geometry}
          material={(() => {
            const originalIdx = meshes.indexOf(mesh)
            if (originalIdx >= 0 && meshMaterials[originalIdx]) return meshMaterials[originalIdx]
            return meshMaterials[idx]
          })()}
          renderOrder={mesh.isSky ? -10 : 0}
          onUpdate={(obj) => {
            // Atualiza matriz apenas se necessário, sem recriar o objeto Mesh
            obj.name = mesh.name
            if (mesh.matrix) {
              obj.matrixAutoUpdate = false
              obj.matrix.copy(mesh.matrix)
              obj.matrixWorldNeedsUpdate = true
            } else {
              obj.matrixAutoUpdate = true
            }
          }}
          onBeforeRender={(renderer, scene, camera, geometry, material, object) => {
             // Atualiza uniforms se for ShaderMaterial
             const mat = material as THREE.ShaderMaterial
             if (mat.uniforms) {
                if (mat.uniforms.umProjection) {
                  mat.uniforms.umProjection.value = camera.projectionMatrix
                }
                if (mat.uniforms.umView) {
                  mat.uniforms.umView.value = camera.matrixWorldInverse
                }
                if (mat.uniforms.umModelTransform && object?.matrixWorld) {
                  mat.uniforms.umModelTransform.value.copy(object.matrixWorld)
                }
             }
          }}
        />
      ))}
    </group>
  )
}
