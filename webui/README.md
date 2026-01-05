# God of War Browser - Nova UI Next.js

## 🚀 Como Rodar

### 1. Instalar Dependências

```bash
cd webui
pnpm install
```

### 2. Iniciar Backend Go (Porta 8000)

Em um terminal, na raiz do projeto:

```bash
go run god_of_war_browser.go -iso "C:\path\to\game.iso" -ps ps2 -gowversion 2
```

Ou com WAD files:

```bash
go run god_of_war_browser.go -dir "C:\path\to\wad\folder" -ps ps2 -gowversion 2
```

### 3. Iniciar Next.js Dev Server (Porta 3000)

Em outro terminal:

```bash
cd webui
pnpm dev
```

### 4. Acessar as UIs

- **UI Antiga**: http://localhost:8000
- **UI Nova**: http://localhost:3000

## 🔧 Arquitetura

```
┌─────────────────┐         ┌──────────────────┐
│   Next.js UI    │  HTTP   │   Backend Go     │
│   Port 3000     │ ───────>│   Port 8000      │
│                 │ <─────  │                  │
│  - React Query  │  JSON   │  - VFS System    │
│  - Three.js     │         │  - WAD Parser    │
│  - shadcn/ui    │         │  - API v2        │
└─────────────────┘         └──────────────────┘
```

## 📡 Endpoints da API

### Filesystem
- `GET /api/v2/filesystem` - Lista árvore de arquivos

### Pack Contents
- `GET /api/v2/pack/{file}/contents` - Lista conteúdo do WAD

### Resources
- `GET /api/v2/pack/{file}/resource/{id}` - Info detalhada do recurso

## 🐛 Troubleshooting

### Erro de CORS
Se você ver erros de CORS no console, certifique-se que o backend está rodando na porta 8000.

### "No files found"
Verifique se você passou o caminho correto do ISO ou diretório de WADs para o backend.

### Erro ao instalar dependências
```bash
# Limpar e reinstalar
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## 📦 Build para Produção

```bash
cd webui
pnpm build

# O build será gerado em webui/out
# Configure o Go para servir esses arquivos estáticos
```

## 🎯 Próximos Passos

- [ ] Implementar loader de meshes 3D
- [ ] Adicionar suporte para texturas
- [ ] Implementar player de animações
- [ ] Upload de arquivos
- [ ] Export GLB/FBX
- [ ] WebSocket para status em tempo real
