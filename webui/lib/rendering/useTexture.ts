import { useEffect, useState, useCallback, useRef } from 'react'
import * as THREE from 'three'
import type { RenderTexture } from './material-types'

/**
 * Texture loader singleton to avoid creating multiple loaders
 */
const textureLoader = new THREE.TextureLoader()

/**
 * Cache for loaded textures to avoid duplicate loads
 */
const textureCache = new Map<string, THREE.Texture>()

/**
 * Hook to load a single texture from URL
 * @param url - Texture URL (can be data: URL for base64 images)
 * @param isFontTexture - Whether this is a font texture (affects filtering)
 * @returns Texture object or null if not loaded
 */
export function useTexture(url: string | null, isFontTexture = false): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!url) {
      setTexture(null)
      return
    }

    // Check cache first
    if (textureCache.has(url)) {
      const cached = textureCache.get(url)!
      setTexture(cached)
      return
    }

    // Load texture
    const loadTexture = async () => {
      try {
        const loadedTexture = await textureLoader.loadAsync(url)

        // Apply texture parameters based on type
        if (isFontTexture) {
          // Font textures: clamp + linear filtering
          loadedTexture.wrapS = THREE.ClampToEdgeWrapping
          loadedTexture.wrapT = THREE.ClampToEdgeWrapping
          loadedTexture.minFilter = THREE.LinearFilter
          loadedTexture.magFilter = THREE.LinearFilter
        } else {
          // Regular textures: repeat + mipmapped linear
          loadedTexture.wrapS = THREE.RepeatWrapping
          loadedTexture.wrapT = THREE.RepeatWrapping
          loadedTexture.minFilter = THREE.LinearMipmapLinearFilter
          loadedTexture.magFilter = THREE.LinearFilter
          loadedTexture.generateMipmaps = true
        }

        loadedTexture.needsUpdate = true

        // Cache the texture
        textureCache.set(url, loadedTexture)
        setTexture(loadedTexture)
        setError(null)
      } catch (err) {
        console.error(`Failed to load texture: ${url}`, err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setTexture(null)
      }
    }

    loadTexture()

    // Cleanup on unmount
    return () => {
      // Note: We don't dispose textures here because they're cached
      // Textures are disposed when the cache is cleared or app unmounts
    }
  }, [url, isFontTexture])

  return texture
}

/**
 * Hook to load multiple textures (for texture sheet animations)
 * @param urls - Array of texture URLs
 * @param isFontTexture - Whether these are font textures
 * @returns Array of textures (null for not yet loaded)
 */
export function useTextures(
  urls: string[],
  isFontTexture = false
): (THREE.Texture | null)[] {
  const [textures, setTextures] = useState<(THREE.Texture | null)[]>([])

  useEffect(() => {
    if (!urls || urls.length === 0) {
      setTextures([])
      return
    }

    const loadTextures = async () => {
      const loadPromises = urls.map(async (url) => {
        if (!url) return null

        // Check cache
        if (textureCache.has(url)) {
          return textureCache.get(url)!
        }

        try {
          const loadedTexture = await textureLoader.loadAsync(url)

          // Apply texture parameters
          if (isFontTexture) {
            loadedTexture.wrapS = THREE.ClampToEdgeWrapping
            loadedTexture.wrapT = THREE.ClampToEdgeWrapping
            loadedTexture.minFilter = THREE.LinearFilter
            loadedTexture.magFilter = THREE.LinearFilter
          } else {
            loadedTexture.wrapS = THREE.RepeatWrapping
            loadedTexture.wrapT = THREE.RepeatWrapping
            loadedTexture.minFilter = THREE.LinearMipmapLinearFilter
            loadedTexture.magFilter = THREE.LinearFilter
            loadedTexture.generateMipmaps = true
          }

          loadedTexture.needsUpdate = true

          // Cache the texture
          textureCache.set(url, loadedTexture)
          return loadedTexture
        } catch (err) {
          console.error(`Failed to load texture: ${url}`, err)
          return null
        }
      })

      const loadedTextures = await Promise.all(loadPromises)
      setTextures(loadedTextures)
    }

    loadTextures()
  }, [JSON.stringify(urls), isFontTexture]) // Use JSON.stringify to compare array contents

  return textures
}

/**
 * Hook to create RenderTexture objects from URLs
 * @param urls - Array of texture URLs (can be data: URLs for base64)
 * @param isFontTexture - Whether these are font textures
 * @returns Array of RenderTexture objects
 */
export function useRenderTextures(
  urls: string[],
  isFontTexture = false
): RenderTexture[] {
  const textures = useTextures(urls, isFontTexture)

  return urls.map((url, index) => ({
    url,
    texture: textures[index] || null,
    loaded: textures[index] !== null,
    isFontTexture,
  }))
}

/**
 * Clear the texture cache (useful for memory management)
 */
export function clearTextureCache(): void {
  textureCache.forEach((texture) => {
    texture.dispose()
  })
  textureCache.clear()
}

/**
 * Get cache size for debugging
 */
export function getTextureCacheSize(): number {
  return textureCache.size
}

/**
 * Hook to preload textures without using them immediately
 * Useful for loading screen or progressive loading
 */
export function usePreloadTextures(urls: string[]): {
  loaded: number
  total: number
  progress: number
  isComplete: boolean
} {
  const [loaded, setLoaded] = useState(0)
  const total = urls.length

  useEffect(() => {
    if (urls.length === 0) {
      setLoaded(0)
      return
    }

    let mounted = true
    let loadedCount = 0

    const preload = async () => {
      for (const url of urls) {
        if (!mounted) break

        // Check if already in cache
        if (textureCache.has(url)) {
          loadedCount++
          setLoaded(loadedCount)
          continue
        }

        try {
          const texture = await textureLoader.loadAsync(url)
          texture.needsUpdate = true
          textureCache.set(url, texture)
        } catch (err) {
          console.warn(`Failed to preload texture: ${url}`)
        }

        loadedCount++
        if (mounted) {
          setLoaded(loadedCount)
        }
      }
    }

    preload()

    return () => {
      mounted = false
    }
  }, [JSON.stringify(urls)])

  return {
    loaded,
    total,
    progress: total > 0 ? loaded / total : 0,
    isComplete: loaded === total && total > 0,
  }
}
