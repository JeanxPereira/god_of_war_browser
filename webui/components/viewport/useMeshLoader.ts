import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useMeshData } from '@/hooks/use-api'
import type { MeshData } from '@/lib/api/client'

const LEGACY_BASE_URL = (
  process.env.NEXT_PUBLIC_LEGACY_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000'
)
  .replace(/\/api\/v2\/?$/, '')
  .replace(/\/+$/, '')

const FORCE_LEGACY = process.env.NEXT_PUBLIC_FORCE_LEGACY_MESH === '1'

type RawMeshPacket = {
  Uvs: { U: number[]; V: number[] }
  Trias: { X: number[]; Y: number[]; Z: number[]; Skip: boolean[]; Weight: number[] }
  Norms: { X: number[]; Y: number[]; Z: number[] }
  Blend: { R: number[]; G: number[]; B: number[]; A: number[] }
  Joints: number[]
  Joints2: number[]
  Offset: number
  VertexMeta?: number[]
  Boundaries?: number[]
  HasTransparentBlending?: boolean
}

type RawMeshObject = {
  Offset: number
  Type: number
  DmaTagsCountPerPacket: number
  MaterialId: number
  JointMapElementsCount: number
  InstancesCount: number
  Flags: number
  FlagsMask: number
  TextureLayersCount: number
  TotalDmaProgramsCount: number
  NextFreeVUBufferId: number
  Unk1c: number
  SourceVerticesCount: number
  Packets: RawMeshPacket[][]
  RawDmaAndJointsData?: number[]
  UseInvertedMatrix?: boolean
  JointMappers?: number[][]
}

type RawMeshGroup = {
  Offset: number
  HideDistance: number
  Objects: RawMeshObject[]
  HasBbox: number
}

type RawMeshPart = {
  Offset: number
  Unk00: number
  Groups: RawMeshGroup[]
  JointId: number
}

type RawMesh = {
  Parts: RawMeshPart[]
  Vectors?: { Value: number[] }[]
  Flags0x20?: number
  NameOfRootJoint?: string
  BaseBoneIndex?: number
}

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

type BuiltMaterial = {
  color?: [number, number, number, number]
  textureUrl?: string
  hasAlpha?: boolean
}

type ChildResource = {
  id: string
  name: string
  type: string
  size?: number | null
}

function buildMaterialsFromLegacyResponse(json: any): BuiltMaterial[] {
  const mats: BuiltMaterial[] = []
  const legacyMaterials = json?.Materials || []

  legacyMaterials.forEach((mat: any, idx: number) => {
    const rawMat = mat?.Mat
    const matColor = rawMat?.Color // [r,g,b,a] 0-255
    const layers = rawMat?.Layers || []
    const textures = mat?.Textures || {}

    // Prefer first layer, fall back to material color
    const primaryLayer = layers[0] || {}
    const layerColor = primaryLayer?.BlendColor as number[] | undefined

    // Combine layer color * material color to mimic legacy pipeline
    const base = matColor && matColor.length >= 4 ? matColor : [255, 255, 255, 255]
    const layer = layerColor && layerColor.length >= 4 ? layerColor : [255, 255, 255, 255]
    const combined: [number, number, number, number] = [
      (base[0] * layer[0]) / (255 * 255),
      (base[1] * layer[1]) / (255 * 255),
      (base[2] * layer[2]) / (255 * 255),
      Math.min(1, ((base[3] ?? 255) * (layer[3] ?? 255)) / (255 * 255)),
    ]

    // Pick first available texture (matches legacy renderer behavior)
    const textureValues = Object.values(textures || {}) as any[]
    let pickedTexture: string | undefined
    let hasTransparentFlag = textureValues.some((t) => !!t?.HaveTransparent || !!t?.HasAlpha)
    for (const key in textures) {
      const images = (textures as any)[key]?.Images
      if (images && images.length && images[0]?.Image) {
        pickedTexture = `data:image/png;base64,${images[0].Image}`
        if (!hasTransparentFlag) {
          hasTransparentFlag = !!images[0]?.HasAlpha || !!images[0]?.HaveTransparent
        }
        break
      }
    }

    const material: BuiltMaterial = {
      color: combined,
      textureUrl: pickedTexture,
      hasAlpha: hasTransparentFlag || combined[3] < 1,
    }

    // Preserve materialId slot if present; otherwise append
    const targetIndex = (rawMat && (rawMat.Id ?? rawMat.MaterialId)) ?? idx
    mats[targetIndex] = material
  })

  return mats
}
// Detects if a resource is a mesh
const isMeshType = (type: string): boolean => {
  const meshTypes = [
    '0x0001',
    '0x000f',
    '0x0003',
    '0x100f',
    '0x1000f',
    '0x0001000f',
    '0x2000f',
    '0x0002000f',
  ]
  return meshTypes.includes(type.toLowerCase())
}

// Builds geometry from the API v2 payload (already converted by the backend)
function buildMeshesFromMeshData(meshData: MeshData, resourceName?: string | null): BuiltMesh[] {
  if (!meshData?.vertices?.length) {
    throw new Error('Mesh payload has no vertices')
  }

  const geometry = new THREE.BufferGeometry()

  const positions = new Float32Array(meshData.vertices)
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  // Legacy shader expects aVertexPos
  geometry.setAttribute('aVertexPos', new THREE.BufferAttribute(positions, 3))

  const hasNormalsFlag = (meshData.hasNormals ?? false) || !!meshData.normals?.length
  const hasNormals = hasNormalsFlag && !!meshData.normals?.length
  if (hasNormals) {
    const normals = new Float32Array(meshData.normals)
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  } else {
    geometry.computeVertexNormals()
  }

  const hasUvsFlag =
    (meshData.hasUvs ?? (meshData as { hasUVs?: boolean }).hasUVs ?? false) || !!meshData.uvs?.length
  const hasUvs = hasUvsFlag && !!meshData.uvs?.length
  if (hasUvs) {
    const uvs = new Float32Array(meshData.uvs)
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    // Legacy shader expects aVertexUV
    geometry.setAttribute('aVertexUV', new THREE.BufferAttribute(uvs, 2))
  }

  if (meshData.indices?.length) {
    geometry.setIndex(meshData.indices)
  }

  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()

  // Shader always expects a color attribute; fill with white if missing
  const vertexCount = geometry.getAttribute('position').count
  const colors = new Float32Array(vertexCount * 4).fill(1)
  geometry.setAttribute('aVertexColor', new THREE.BufferAttribute(colors, 4))

  return [
    {
      geometry,
      hasJoints: false,
      hasVertexColors: false,
      hasUVs: hasUvs,
      joints: [],
      joints2: [],
      weights: [],
      name: resourceName || 'Mesh',
      materialId: meshData.materialId,
    },
  ]
}

// Builds geometry from legacy /json/pack payload (fallback when API v2 is missing)
function buildMeshesFromRaw(mesh: RawMesh): BuiltMesh[] {
  const built: BuiltMesh[] = []

  mesh.Parts?.forEach((part, partIndex) => {
    part.Groups?.forEach((group, groupIndex) => {
      group.Objects?.forEach((object, objectIndex) => {
        const positions: number[] = []
        const normals: number[] = []
        const uvs: number[] = []
        const colors: number[] = []
        const jointIndices: number[] = []
        const jointIndices2: number[] = []
        const weights: number[] = []
        const indices: number[] = []

        const instances = Math.max(1, object.InstancesCount || 1)
        const layers = Math.max(1, object.TextureLayersCount || 1)

        let hasJoints = false
        let hasVertexColors = false
        let hasUVs = false

        for (let iInstance = 0; iInstance < instances; iInstance++) {
          for (let iLayer = 0; iLayer < layers; iLayer++) {
            const dmaIndex = iInstance * layers + iLayer
            const packets = object.Packets?.[dmaIndex] || []

            packets.forEach((packet) => {
              const vertexCount = packet?.Trias?.X?.length || 0
              for (let i = 0; i < vertexCount; i++) {
                const x = packet.Trias.X[i] ?? 0
                const y = packet.Trias.Y[i] ?? 0
                const z = packet.Trias.Z[i] ?? 0
                positions.push(x, y, z)

                if (packet.Norms?.X?.length) {
                  normals.push(packet.Norms.X[i] ?? 0, packet.Norms.Y?.[i] ?? 0, packet.Norms.Z?.[i] ?? 0)
                }

                if (iInstance === 0 && packet.Uvs?.U?.length) {
                  uvs.push(packet.Uvs.U[i] ?? 0, packet.Uvs.V?.[i] ?? 0)
                  hasUVs = true
                }

                if (packet.Blend?.R?.length) {
                  const r = (packet.Blend.R[i] ?? 255) / 255
                  const g = (packet.Blend.G[i] ?? 255) / 255
                  const b = (packet.Blend.B[i] ?? 255) / 255
                  const aRaw = packet.Blend.A?.[i]
                  const a = aRaw !== undefined ? Math.min(1, aRaw / 128) : 1
                  colors.push(r, g, b, a)
                  hasVertexColors = true
                }

                if (packet.Joints?.length) {
                  jointIndices.push(packet.Joints[i] ?? 0)
                  jointIndices2.push(packet.Joints2?.[i] ?? 0)

                  const weight = packet.Trias.Weight?.[i]
                  weights.push(weight !== undefined ? weight : 0)
                  hasJoints = true
                }

                if (dmaIndex === 0) {
                  const skip = packet.Trias.Skip?.[i] ?? false
                  if (!skip) {
                    const currentIndex = positions.length / 3 - 1
                    if (currentIndex >= 2) {
                      indices.push(currentIndex - 2, currentIndex - 1, currentIndex)
                    }
                  }
                }
              }
            })
          }
        }

        if (positions.length === 0) return

        const geometry = new THREE.BufferGeometry()
        const posAttr = new THREE.Float32BufferAttribute(positions, 3)
        geometry.setAttribute('position', posAttr)
        geometry.setAttribute('aVertexPos', posAttr)

        if (normals.length) {
          geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
        } else {
          geometry.computeVertexNormals()
        }

        if (uvs.length) {
          const uvAttr = new THREE.Float32BufferAttribute(uvs, 2)
          geometry.setAttribute('uv', uvAttr)
          geometry.setAttribute('aVertexUV', uvAttr)
        }

        if (colors.length) {
          geometry.setAttribute('aVertexColor', new THREE.Float32BufferAttribute(colors, 4))
        }

        if (indices.length) {
          geometry.setIndex(indices)
        }

        geometry.computeBoundingBox()
        geometry.computeBoundingSphere()

        built.push({
          geometry,
          hasJoints,
          hasVertexColors,
          hasUVs,
          joints: jointIndices,
          joints2: jointIndices2,
          weights,
          name: `Part${partIndex}_Group${groupIndex}_Obj${objectIndex}`,
          materialId: object.MaterialId,
        })
      })
    })
  })

  return built
}

function buildInstanceTransform(inst: any): THREE.Matrix4 {
  const matrix = new THREE.Matrix4()

  if (inst?.IsGow2) {
    const pos = inst.Position ?? inst.Position2 ?? [0, 0, 0]
    matrix.makeTranslation(pos[0] ?? 0, pos[1] ?? 0, pos[2] ?? 0)
    return matrix
  }

  const pos = inst?.Position1 ?? inst?.Position ?? [0, 0, 0]
  const rot = inst?.Rotation ?? [0, 0, 0, 1]
  const scaleVal = rot?.[3] ?? 1

  const position = new THREE.Vector3(pos[0] ?? 0, pos[1] ?? 0, pos[2] ?? 0)
  const rotation = new THREE.Euler(rot[0] ?? 0, rot[1] ?? 0, rot[2] ?? 0, 'XYZ')
  const quaternion = new THREE.Quaternion().setFromEuler(rotation)
  const scale = new THREE.Vector3(scaleVal, scaleVal, scaleVal)

  matrix.compose(position, quaternion, scale)
  return matrix
}

function buildMeshesFromObject(
  object: any,
  transform: THREE.Matrix4 | undefined,
  materialsAcc: BuiltMaterial[],
): BuiltMesh[] {
  const meshes: BuiltMesh[] = []
  const mdl = object?.Model || object?.ModelData || object

  const scripts = mdl?.Scripts || object?.Scripts || (object?.Script ? [object.Script] : [])
  const hasSky = Array.isArray(scripts) && scripts.some((s: any) => s?.TargetName === 'SCR_Sky')

  if (mdl?.Meshes?.length) {
    mdl.Meshes.forEach((mesh: RawMesh, idx: number) => {
      const built = buildMeshesFromRaw(mesh)
      built.forEach((bm, bIdx) => {
        bm.matrix = transform ? transform.clone() : undefined
        bm.isSky = hasSky
        bm.name = `${object?.Name || 'obj'}_${idx}_${bIdx}_${bm.name}`
        meshes.push(bm)
      })
    })
  }

  const mats = buildMaterialsFromLegacyResponse(mdl || object)
  if (mats.length) {
    materialsAcc.push(...mats)
  }

  return meshes
}

function buildMeshesFromInstance(inst: any, materialsAcc: BuiltMaterial[]): BuiltMesh[] {
  const transform = buildInstanceTransform(inst)
  if (!inst?.Object) return []
  return buildMeshesFromObject(inst.Object, transform, materialsAcc)
}

function buildSceneFromPayload(
  payload: any,
  materialsAcc: BuiltMaterial[],
  fallbackTransform?: THREE.Matrix4,
): BuiltMesh[] {
  const meshes: BuiltMesh[] = []

  if (Array.isArray(payload?.Instances)) {
    payload.Instances.forEach((inst: any) => {
      meshes.push(...buildMeshesFromInstance(inst, materialsAcc))
    })
    return meshes
  }

  if (payload?.Object || payload?.Model) {
    meshes.push(...buildMeshesFromObject(payload.Object || payload.Model || payload, fallbackTransform, materialsAcc))
    return meshes
  }

  if (payload?.Meshes) {
    meshes.push(...buildMeshesFromObject({ Model: payload }, fallbackTransform, materialsAcc))
  }

  return meshes
}

type MeshLoaderResult = {
  meshes: BuiltMesh[] | null
  materials: BuiltMaterial[] | null
  isLoading: boolean
  error: Error | null
}

export function useMeshLoader(
  packName: string | null,
  resourceId: string | null,
  resourceType: string | null,
  resourceName?: string | null,
  resourceSize?: number | null,
  childResources?: ChildResource[] | null
): MeshLoaderResult {
  const [meshes, setMeshes] = useState<BuiltMesh[] | null>(null)
  const [materials, setMaterials] = useState<BuiltMaterial[] | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [legacyLoading, setLegacyLoading] = useState(false)
  const [legacyTried, setLegacyTried] = useState(false)

  const isAnimation = resourceName?.toUpperCase().startsWith('ANM_') || false

  const shouldLoad = useMemo(() => {
    if (!packName || !resourceId || !resourceType) return false
    if (!isMeshType(resourceType)) return false
    if (isAnimation) return false
    return true
  }, [packName, resourceId, resourceType, isAnimation])

  const meshQueryEnabled = shouldLoad && !FORCE_LEGACY
  const { data, isLoading, error: queryError } = useMeshData(
    meshQueryEnabled ? packName : null,
    meshQueryEnabled ? resourceId : null
  )

  useEffect(() => {
    // reset legacy fallback when selection changes
    setLegacyTried(false)
    setLegacyLoading(false)
    setMaterials(null)
  }, [packName, resourceId])

  useEffect(() => {
    if (!shouldLoad) {
      setMeshes(null)
      setError(null)
      setMaterials(null)
      return
    }

    if (!data) {
      return
    }

    try {
      const builtMeshes = buildMeshesFromMeshData(data, resourceName)
      setMeshes(builtMeshes)
      setError(null)
      console.log('[useMeshLoader] Built meshes from API v2:', builtMeshes.length, builtMeshes)
    } catch (err) {
      console.error('[useMeshLoader] Error building mesh:', err)
      setError(err as Error)
      setMeshes(null)
    }
  }, [data, shouldLoad, resourceName])

  useEffect(() => {
    if (queryError) {
      // Apenas sinaliza erro; não limpa meshes pois fallback/filhos podem preencher
      setError(queryError)
    }
  }, [queryError])

  useEffect(() => {
    if (!shouldLoad || legacyTried || !packName || !resourceId) return
    let cancelled = false

    const message = queryError ? (queryError as Error).message || '' : ''
    const status = queryError ? (queryError as Error & { status?: number }).status : undefined

    const tryLegacy = async () => {
      setLegacyLoading(true)
      try {
        const url = `${LEGACY_BASE_URL}/json/pack/${encodeURIComponent(packName)}/${encodeURIComponent(resourceId)}`
        if (queryError) {
          console.warn('[useMeshLoader] API v2 failed, trying legacy endpoint:', url, 'status:', status, 'message:', message)
        } else if (FORCE_LEGACY) {
          console.info('[useMeshLoader] FORCE_LEGACY enabled, using legacy endpoint:', url)
        }
        const res = await fetch(url)
        if (!res.ok) {
          const err = new Error(`Legacy HTTP ${res.status}`) as Error & { status?: number }
          err.status = res.status
          throw err
        }
        const json = await res.json()
        const rawMesh: RawMesh | undefined = (json as any)?.Meshes?.[0] || (json as any)?.Data || (json as any)?.data
        if (!rawMesh) {
          throw new Error('No mesh data in legacy response')
        }

        const built = buildMeshesFromRaw(rawMesh)
        if (!cancelled) {
          if (built.length) {
            setMeshes(built)
            setError(null)
            console.log('[useMeshLoader] Loaded meshes from legacy API:', built.length)
          } else {
            console.warn('[useMeshLoader] Legacy mesh endpoint returned no geometry')
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[useMeshLoader] Legacy mesh load failed:', err)
          setError(err as Error)
        }
      } finally {
        if (!cancelled) {
          setLegacyLoading(false)
          setLegacyTried(true)
        }
      }
    }

    const shouldTryLegacy =
      FORCE_LEGACY ||
      !!queryError ||
      status === 500 ||
      status === 404 ||
      message.includes('404') ||
      message.includes('500') ||
      message.toLowerCase().includes('not found')

    if (shouldTryLegacy) {
      void tryLegacy()
    }

    return () => {
      cancelled = true
    }
  }, [shouldLoad, queryError, legacyTried, packName, resourceId])

  // Fetch materiais/ texturas do legado para mapear por materialId
  useEffect(() => {
    const isMesh = shouldLoad
    if (!isMesh || !packName || !resourceId) return

    let cancelled = false
    const url = `${LEGACY_BASE_URL}/json/pack/${encodeURIComponent(packName)}/${encodeURIComponent(resourceId)}`
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json) => {
        if (cancelled) return
        const mats = buildMaterialsFromLegacyResponse(json)
        if (mats.length) {
          setMaterials((prev) => {
            const combined = [...(prev ?? []), ...mats]
            return combined.length ? combined : null
          })
        }

        // Se houver mesh raw no payload legado, reconstrói geometrias com materialId por objeto
        const rawMesh: RawMesh | undefined = (json as any)?.Meshes?.[0] || (json as any)?.Data || (json as any)?.data
        if (rawMesh) {
          const builtFromRaw = buildMeshesFromRaw(rawMesh)
          if (builtFromRaw.length) {
            setMeshes((prev) => {
              const base = prev ?? []
              return base.length ? [...base, ...builtFromRaw] : builtFromRaw
            })
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          // keep existing materials on error
        }
      })

    return () => {
      cancelled = true
    }
  }, [shouldLoad, packName, resourceId])

  // Carrega meshes/materiais dos filhos (ex: MDL wrapper -> submeshes + MAT_*)
  useEffect(() => {
    if (!shouldLoad || !packName || !childResources?.length) return
    let cancelled = false

    const loadChildren = async () => {
      const aggregatedMeshes: BuiltMesh[] = []
      const aggregatedMaterials: BuiltMaterial[] = []

      for (const child of childResources) {
        const url = `${LEGACY_BASE_URL}/json/pack/${encodeURIComponent(packName)}/${encodeURIComponent(child.id)}`
        try {
          const res = await fetch(url)
          if (!res.ok) continue
          const json = await res.json()

          if (isMeshType(child.type)) {
            const rawMesh: RawMesh | undefined = (json as any)?.Meshes?.[0] || (json as any)?.Data || (json as any)?.data
            if (rawMesh) {
              aggregatedMeshes.push(...buildMeshesFromRaw(rawMesh))
            }
          }

          const mats = buildMaterialsFromLegacyResponse(json)
          aggregatedMaterials.push(...mats)
        } catch (err) {
          console.warn('[useMeshLoader] Child load failed:', child.id, err)
        }
      }

      if (cancelled) return

      if (aggregatedMeshes.length) {
        setMeshes((prev) => {
          const base = prev ?? []
          return base.length ? [...base, ...aggregatedMeshes] : aggregatedMeshes
        })
      }

      if (aggregatedMaterials.length) {
        setMaterials((prev) => {
          const base = prev ?? []
          const combined = [...base, ...aggregatedMaterials]
          return combined.length ? combined : null
        })
      }
    }

    void loadChildren()

    return () => {
      cancelled = true
    }
  }, [shouldLoad, packName, childResources])

  return { meshes, materials, isLoading: shouldLoad && (isLoading || legacyLoading), error }
}
