# God of War Rendering System

Sistema completo de renderização portado da UI antiga para Next.js com Three.js e React Three Fiber.

## Estrutura de Arquivos

```
webui/
├── public/shaders/                    # Arquivos de shaders GLSL
│   ├── SkinnedTextured.vs            # Vertex shader (animação esquelética + texturização)
│   └── SkinnedTextured.fs            # Fragment shader (multi-layer + envmap)
├── lib/rendering/                     # Biblioteca de renderização
│   ├── material-types.ts             # Tipos TypeScript para materiais
│   ├── useTexture.ts                 # Hooks para gerenciamento de texturas
│   ├── shader-utils.ts               # Utilitários de shaders
│   └── README.md                     # Esta documentação
└── components/rendering/              # Componentes React
    └── GOWMaterial.tsx               # Componente de material customizado
```

## Conceitos Principais

### 1. Material System

O sistema de materiais é hierárquico:

```typescript
Material {
  color: [r, g, b, a]        // Cor base (multiplicada em todas as camadas)
  layers: MaterialLayer[]     // Camadas de renderização
  animations: []              // Animações de UV e texturas
}
```

### 2. Material Layers

Cada material pode ter múltiplas camadas renderizadas em sequência:

```typescript
MaterialLayer {
  color: [r, g, b, a]         // Cor da camada
  uvOffset: [u, v]            // Offset para animação de UV
  textureIndex: number        // Índice da textura atual (para sprite sheets)
  textures: RenderTexture[]   // Array de texturas
  method: BlendMethod         // Modo de blending (Normal, Additive, Subtract)
  hasAlpha: boolean          // Tem transparência
  isEnvMap: boolean          // É um environment map
}
```

### 3. Blend Methods

```typescript
enum BlendMethod {
  Normal = 0,     // Alpha blending normal
  Additive = 1,   // Blending aditivo (luzes, brilhos)
  Subtract = 2,   // Blending subtrativo
  Unknown = 3,    // Método especial
}
```

## Uso Básico

### 1. Carregar e Usar Texturas

```typescript
import { useTexture, useRenderTextures } from '@/lib/rendering/useTexture'

// Carregar uma textura
function MyComponent() {
  const texture = useTexture('data:image/png;base64,...')

  return <mesh>
    <planeGeometry />
    <meshBasicMaterial map={texture} />
  </mesh>
}

// Carregar múltiplas texturas (para sprite sheets)
function AnimatedTexture() {
  const urls = [
    'data:image/png;base64,...',
    'data:image/png;base64,...',
  ]
  const textures = useRenderTextures(urls)

  // textures[0].loaded, textures[0].texture, etc.
}
```

### 2. Criar Material God of War

```typescript
import { GOWMaterial } from '@/components/rendering/GOWMaterial'
import type { Material } from '@/lib/rendering/material-types'

function MyModel() {
  // Definir material
  const material: Material = {
    color: [1.0, 1.0, 1.0, 1.0],
    layers: [
      {
        color: [1.0, 1.0, 1.0, 1.0],
        uvOffset: [0, 0],
        textureIndex: 0,
        textures: [
          {
            url: 'data:image/png;base64,...',
            texture: null,
            loaded: false,
          }
        ],
        method: BlendMethod.Normal,
        hasAlpha: true,
      }
    ],
  }

  return (
    <mesh>
      <boxGeometry />
      <GOWMaterial
        material={material}
        activeLayerIndex={0}
        useVertexColors={false}
      />
    </mesh>
  )
}
```

### 3. Usar Shaders Manualmente

```typescript
import { loadGOWShaders, createGOWShaderMaterial } from '@/lib/rendering/shader-utils'
import { BlendMethod } from '@/lib/rendering/material-types'

async function createCustomMaterial() {
  // Carregar shaders
  const { vertexShader, fragmentShader } = await loadGOWShaders()

  // Criar material
  const material = createGOWShaderMaterial(
    vertexShader,
    fragmentShader,
    BlendMethod.Additive
  )

  return material
}
```

### 4. Atualizar Uniforms Dinamicamente

```typescript
import {
  updateLayerUniforms,
  updateMaterialColor,
  updateCameraUniforms
} from '@/lib/rendering/shader-utils'
import { useFrame } from '@react-three/fiber'

function AnimatedMaterial({ material }) {
  const { camera } = useThree()

  useFrame((state, delta) => {
    // Animar UV offset
    const layer = material.layers[0]
    layer.uvOffset[0] += delta * 0.1

    // Atualizar uniforms
    updateLayerUniforms(
      material.uniforms,
      layer.color,
      layer.uvOffset,
      layer.textures[0]?.texture
    )

    // Atualizar camera
    updateCameraUniforms(material.uniforms, camera)

    material.uniformsNeedUpdate = true
  })

  return <primitive object={material} attach="material" />
}
```

## Recursos Avançados

### Skeletal Animation

O sistema suporta animação esquelética com até 12 joints:

```typescript
import { updateJointMatrices } from '@/lib/rendering/shader-utils'

function SkinnedModel({ material, skeleton }) {
  useFrame(() => {
    // Atualizar matrizes dos joints
    const jointMatrices = skeleton.joints.map(j => j.renderMatrix)
    updateJointMatrices(material.uniforms, jointMatrices)

    material.uniformsNeedUpdate = true
  })
}
```

### Environment Mapping

Adicionar reflexos usando environment maps:

```typescript
const material: Material = {
  color: [1, 1, 1, 1],
  layers: [
    // Camada difusa
    {
      color: [1, 1, 1, 0.7],
      textures: [{ url: 'diffuse.png', ... }],
      method: BlendMethod.Normal,
      hasAlpha: true,
    },
    // Camada de environment map
    {
      color: [1, 1, 1, 1],
      textures: [{ url: 'envmap.png', ... }],
      method: BlendMethod.Normal,
      hasAlpha: false,
      isEnvMap: true,  // Marca como environment map
    }
  ]
}
```

### Vertex Colors

Habilitar cores por vértice:

```typescript
<GOWMaterial
  material={material}
  useVertexColors={true}  // Ativa multiplicação por vertex color
/>
```

## Vertex Buffer Attributes

Para criar geometrias customizadas com todos os atributos:

```typescript
const geometry = new THREE.BufferGeometry()

// Atributos obrigatórios
geometry.setAttribute('aVertexPos', new THREE.BufferAttribute(positions, 3))
geometry.setAttribute('aVertexUV', new THREE.BufferAttribute(uvs, 2))

// Atributos opcionais
geometry.setAttribute('aVertexColor', new THREE.BufferAttribute(colors, 4, true))
geometry.setAttribute('aVertexJointID1', new THREE.BufferAttribute(jointIds1, 1))
geometry.setAttribute('aVertexJointID2', new THREE.BufferAttribute(jointIds2, 1))
geometry.setAttribute('aVertexWeight', new THREE.BufferAttribute(weights, 1))

geometry.setIndex(new THREE.BufferAttribute(indices, 1))
```

## Shader Uniforms Reference

### Matrices
- `umProjection`: Projection matrix
- `umView`: View matrix
- `umModelTransform`: Model transform matrix
- `umJoints[12]`: Joint matrices para skeletal animation

### Colors
- `uMaterialColor`: Cor base do material (vec4)
- `uLayerColor`: Cor da camada ativa (vec4)

### Textures
- `uLayerDiffuseSampler`: Textura difusa (sampler2D)
- `uLayerEnvmapSampler`: Environment map (sampler2D)
- `uLayerOffset`: UV offset para animação (vec2)

### Flags
- `uUseLayerDiffuseSampler`: Usar textura difusa (bool)
- `uUseEnvmapSampler`: Usar environment map (bool)
- `uUseVertexColor`: Usar cores de vértice (bool)
- `uUseJoints`: Usar skeletal animation (bool)
- `uUseModelTransform`: Usar transform do modelo (bool)

## Performance Tips

1. **Texture Caching**: Texturas são automaticamente cacheadas. Use `clearTextureCache()` para limpar.

2. **Shader Caching**: Shaders são carregados uma vez e cacheados.

3. **Batch Rendering**: Agrupe meshes com o mesmo material para reduzir draw calls.

4. **Texture Preloading**: Use `usePreloadTextures()` para pré-carregar texturas:

```typescript
const { progress, isComplete } = usePreloadTextures(textureUrls)
```

5. **Dispose Resources**: Sempre dispose materiais e texturas quando não forem mais necessários.

## Troubleshooting

### Texturas não aparecem
- Verifique se as texturas estão em formato base64 data: URL válido
- Confirme que `uUseLayerDiffuseSampler` está `true`
- Verifique console para erros de carregamento

### Cores muito escuras/claras
- Verifique `uMaterialColor` e `uLayerColor`
- Cores são multiplicadas: material * layer * vertex
- Vertex colors usam fator 256/128 no shader

### Skeletal animation não funciona
- Máximo de 12 joints
- Verifique se `uUseJoints` está `true`
- Confirme que `jointIds` e `weights` estão corretos

### Alpha blending incorreto
- Verifique `BlendMethod` da camada
- Confirme `hasAlpha` está correto
- Para transparência, use `BlendMethod.Normal`

## Migração da UI Antiga

### Diferenças Principais

1. **WebGL → Three.js**: API de mais alto nível
2. **Callbacks → Hooks**: Usar `useFrame` ao invés de loop manual
3. **Manual Buffers → BufferGeometry**: Three.js gerencia buffers
4. **DOM → React**: Componentes declarativos

### Exemplo de Migração

Antes (UI antiga):
```javascript
const mesh = new RenderMesh()
mesh.bufferVertex = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, mesh.bufferVertex)
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
```

Depois (Next.js):
```typescript
const geometry = new THREE.BufferGeometry()
geometry.setAttribute('aVertexPos',
  new THREE.BufferAttribute(vertices, 3))
```

## Exemplos Completos

Ver `/examples` (TODO: criar pasta de exemplos)

## Suporte

Para issues e dúvidas, consulte a documentação do Three.js e React Three Fiber.
