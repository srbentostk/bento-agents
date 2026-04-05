# CLAUDE.md — Bento Agents (fork de pixel-agents)

## Contexto
Fork da extensão pixel-agents customizada para o projeto B.E.N.T.O.
Tema: **agentes secretos de terno, gravata e óculos escuros** — sala de operações da Agência B.E.N.T.O.
Publisher: `mechamedebento` | Versão atual: `1.5.0`

## Build e Deploy
```bash
cd C:/Users/luiz_/bento-agents-build
npm run package          # compila dist/
# VSIX final: bento-agents-1.5.0.vsix (reempacotar com PowerShell — ver Scripts)
```

Para instalar no VSCode: `Extensions > ... > Install from VSIX`

## Arquitetura

### Extension (Node.js / VSCode API)
| Arquivo | Função |
|---------|--------|
| `src/extension.ts` | Entry point, registra comandos e provider |
| `src/agentManager.ts` | Detecta sessões Claude Code, rastreia agentes + `folderName` |
| `src/PixelAgentsViewProvider.ts` | Webview provider — ponte extension↔webview |
| `src/transcriptParser.ts` | Parseia JSONL dos logs do Claude Code |
| `src/fileWatcher.ts` | Monitora arquivos JSONL de agentes |

### Webview (React + Canvas)
| Arquivo | Função |
|---------|--------|
| `webview-ui/src/office/` | Engine canvas (personagens, móveis, animações) |
| `webview-ui/src/components/` | Painel lateral React |
| `webview-ui/src/App.tsx` | Root component |

### Sprites pixel art
- `webview-ui/public/characters/char_0.png` a `char_5.png` — 112×96px cada
- **Formato:** 7 colunas × 6 linhas = 42 frames de 16×16px
- Linhas: 0=frente, 1=direita, 2=costas, 3=esquerda, 4-5=animações
- **Frames com face visível:** linhas 0 e 4 (detectar por pixels de pele em rows rel. 12-14)
- Outline = `r+g+b < 110` — preservar
- Pele = hue 5-45°, sat 15-80%, lum 30-88% — preservar

## Nome Determinístico por Agente (função injetada no bundle)
```javascript
const NAMES = ["Falcão","Sombra","Cobra","Lobo","Raposa","Águia","Touro","Fera",
  "Raven","Cipher","Ghost","Viper","Nova","Storm","Lynx","Rook",
  "Fox","Jade","Echo","Steel","Titan","Blaze","Shade","Frost","Hawk","Wolf","Onyx","Kite"];
function bentoName(id) {
  let s = 0;
  for (let i = 0; i < (id||'').length; i++) s = (s*31 + id.charCodeAt(i)) >>> 0;
  return 'Agente ' + NAMES[s % NAMES.length];
}
```
**No fonte:** procurar por `mr(` no overlay de status para localizar onde o label é definido.

## Como os Computadores Recebem o Nome do Diretório
`folderName` é rastreado em `src/agentManager.ts` e enviado ao webview via `agentCreated`.
No webview, aparece como linha secundária (dim) abaixo do status de cada agente.
Para renomear computadores, editar o componente que consome `folderName` em `webview-ui/src/components/`.

## CSS — Tema Sala de Operações B.E.N.T.O.
```css
--pixel-bg: #0d0e1a            /* fundo escuro profundo */
--pixel-accent: #c8a020        /* dourado — espionagem */
--pixel-text: #e8dfc0fc        /* texto âmbar-creme */
--pixel-agent-border: #c8a020  /* borda dourada dos agentes */
--pixel-text-dim: #c8b890b3    /* texto secundário âmbar */
```

## Comandos VSCode registrados
```
bento-agents.showPanel
bento-agents.exportDefaultLayout
```

## Scripts

### Reempacotar VSIX após build
```powershell
$src = 'C:\Users\luiz_\bento-agents-build'  # raiz do projeto compilado
$dst = 'C:\Users\luiz_\bento-agents-build\bento-agents-1.5.0.vsix'
Add-Type -Assembly 'System.IO.Compression.FileSystem'
# Extrair VSIX original, substituir dist/, reempacotar
```

### Modificar sprites programaticamente
```javascript
// npm install pngjs (em dir temp com node_modules)
const { PNG } = require('pngjs');
const png = PNG.sync.read(fs.readFileSync('char_N.png'));
// Terno: blend pixel com {r:18,g:22,b:38} em 88% (exceto skin/outline/white)
// Óculos: pintar cols 4-11 das linhas rel. 12-13 de cada frame com face
// Gravata: pintar cols 7-8, linhas rel. 6-11 com {r:100,g:8,b:12}
```

## Workflow de Edição Futuro (Recomendado)
1. Editar fonte em `src/` ou `webview-ui/src/`
2. Bump de versão em `package.json` E neste `CLAUDE.md`
3. `npm run package` → compila `dist/`
4. `npx vsce package --out bento-agents-X.Y.Z.vsix` → gera VSIX novo na raiz
5. Mover o VSIX anterior da raiz para `releases/`
6. Commit + push — o VSIX mais recente fica rastreado no git para distribuição
7. Instalar no VSCode via "Install from VSIX"

> **Preferir sempre o código fonte** sobre editar bundles minificados em `dist/`.

## Regra de Versionamento de VSIX (OBRIGATÓRIO)
- **Sempre** que gerar um novo VSIX:
  1. O VSIX antigo que estiver na raiz deve ser movido para `releases/`
  2. O novo VSIX (`bento-agents-X.Y.Z.vsix`) fica na raiz
  3. Nunca deixar dois VSIXs do bento-agents na raiz ao mesmo tempo
  4. VSIXs de outros projetos (ex: `pixel-agents-*.vsix`) ficam em `releases/`
- O `.gitignore` rastreia `bento-agents-*.vsix` na raiz mas ignora `releases/*.vsix`

## Sala de Servidores no Layout
- Colunas 22-30 do mapa são reservadas para a **Sala de Servidores** (FLOOR_9 = azul-petróleo escuro)
- O `ServerRackOverlay` usa `TOWER_COL_FROM_RIGHT = 2` para posicionar as torres nessa coluna
- Towers do Node.js ficam empilhadas verticalmente a partir da linha 2 da sala
- Para reposicionar a sala de servidores, atualizar `TOWER_COL_FROM_RIGHT` em `ServerRackOverlay.tsx`
