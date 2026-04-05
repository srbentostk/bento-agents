<h1 align="center">
  🕵️ Bento Agents
</h1>

<p align="center">
  <strong>Agência B.E.N.T.O. — seu escritório de agentes secretos no VSCode</strong><br>
  Visualize seus agentes do Claude Code como espiões de terno e gravata operando em tempo real
</p>

<p align="center">
  <img src="https://img.shields.io/badge/VSCode-Extension-007ACC?style=flat-square&logo=visual-studio-code" />
  <img src="https://img.shields.io/badge/Claude%20Code-Compatible-orange?style=flat-square" />
  <img src="https://img.shields.io/badge/version-1.5.0-gold?style=flat-square" />
</p>

---

## O que é?

**Bento Agents** é uma extensão para VSCode que transforma suas sessões do [Claude Code](https://claude.ai/code) em uma sala de operações secreta em pixel art. Cada agente vira um espião animado — de terno, gravata e óculos escuros — trabalhando em tempo real no escritório da **Agência B.E.N.T.O.**

Fork do [pixel-agents](https://github.com/pablodelucca/pixel-agents), completamente reimaginado com tema de agência de inteligência.

---

## Funcionalidades

### 🕵️ Agentes com Codinomes
Cada sessão do Claude Code recebe automaticamente um codinome único, determinístico a partir do ID da sessão:

> **Agente Falcão · Sombra · Cobra · Lobo · Raposa · Águia · Touro · Fera · Raven · Cipher · Ghost · Viper · Nova · Storm · Lynx · Rook · Fox · Jade · Echo · Steel · Titan · Blaze · Shade · Frost · Hawk · Wolf · Onyx · Kite**

O mesmo agente sempre recebe o mesmo codinome — não é aleatório por sessão, é determinístico pelo ID da sessão do Claude Code.

```javascript
// Função de codinome determinístico
const NAMES = ["Falcão","Sombra","Cobra","Lobo","Raposa","Águia","Touro","Fera",
  "Raven","Cipher","Ghost","Viper","Nova","Storm","Lynx","Rook",
  "Fox","Jade","Echo","Steel","Titan","Blaze","Shade","Frost","Hawk","Wolf","Onyx","Kite"];

function bentoName(id) {
  let s = 0;
  for (let i = 0; i < (id||'').length; i++) s = (s*31 + id.charCodeAt(i)) >>> 0;
  return 'Agente ' + NAMES[s % NAMES.length];
}
```

### 🏢 Escritório da Agência — 5 Zonas
O mapa tem **54×34 tiles** dividido em zonas temáticas:

| Zona | Localização | Descrição |
|------|-------------|-----------|
| **Sala de Operações** | Cols 1–26, Rows 1–16 | Workstations dos agentes — piso âmbar quente |
| **Datacenter** | Cols 28–52, Rows 1–16 | Torres de servidor — piso azul-petróleo frio |
| **Corredor** | Rows 18–19 | Passagem central entre as salas |
| **Sala de Briefing** | Cols 1–22, Rows 21–31 | Mesa de conferência, sofás, TV de missões |
| **Sala de Descanso** | Cols 24–52, Rows 21–31 | Sofás, plantas, cafeteira — descompressão |

### 🎯 Comportamentos dos Agentes

**Trabalhando em computador** — o agente senta na estação de trabalho e digita enquanto o Claude Code está ativo.

**📱 Trabalhando no telefone** — agentes sem computador disponível puxam um telefone e trabalham nele. O overlay exibe `📱` antes do status da tarefa atual.

**💤 Timeout de ociosidade (5 min)** — após 5 minutos sem atividade, o agente caminha até a porta e desaparece. Servidores ociosos também somem automaticamente.

**🔔 Solicitação de aprovação** — quando o Claude Code precisa de aprovação do usuário:
- Um som toca imediatamente
- O overlay exibe `Needs approval`

**😠 Escalada de aprovação** — se a aprovação não chega:
- Após 60 segundos: toca um som de escalada (notas ascendentes mais altas)
- Após 120 segundos: o agente fica **visivelmente com raiva** — o overlay exibe `😠 APROVAÇÃO!!!` em vermelho pulsante com glow, e toca um barulho urgente e irritado (buzzer sawtooth)

### 🖥️ Datacenter com Servidores Node.js
- Detecta automaticamente servidores Node.js iniciados pelos agentes ou pelo terminal
- Cada servidor aparece como uma **torre de PC** no datacenter, **organizada em grade** (não em linha reta)
- LED de status: 🟢 online · 🔴 erro · ⚫ parado
- **Clique na torre** para abrir o painel de logs em tempo real
- Painel lateral com lista de todos os servidores, portas e PIDs

```
Datacenter (cols 28–52)
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│ 🟢  │ │ 🟢  │ │ 🔴  │ │ 🟢  │   ← linha 1
│:3000│ │:8080│ │:5432│ │:6379│
└─────┘ └─────┘ └─────┘ └─────┘
┌─────┐ ┌─────┐
│ 🟢  │ │ ⚫  │                      ← linha 2
│:4000│ │:9000│
└─────┘ └─────┘
```

### 🎨 Editor de Layout
- Pinte tiles de piso com texturas e cores personalizadas
- Adicione, mova e rotacione móveis (mesas, cadeiras, plantas, PCs, sofás, relógios, quadros...)
- Salve e exporte o layout como JSON para compartilhar com a equipe
- `Ctrl+Z` / `Ctrl+Y` — desfaz/refaz

### 🔄 Atualizações Automáticas
- Botão de atualização no painel — verifica se há nova versão no repositório git
- Pulsa em dourado quando uma atualização está disponível
- Abre `releases/latest/` para instalar o novo VSIX sem sair do VSCode

---

## Instalação

1. Baixe `bento-agents-1.5.0.vsix` de `releases/latest/` neste repositório
2. No VSCode: `Extensions (Ctrl+Shift+X)` → `···` → **Install from VSIX**
3. Selecione o arquivo `.vsix`
4. Abra o painel: `Ctrl+Shift+P` → **Bento Agents: Show Panel**

---

## Como usar

### Visualizar agentes
Abra qualquer projeto com Claude Code ativo. Os agentes aparecem no painel automaticamente como espiões animados caminhando pelo escritório e sentando em suas workstations.

### Aprovações do Claude Code
Quando o Claude Code precisar de permissão para executar um comando, o agente acende o alerta. Se você demorar para aprovar:

1. **Imediato** — som de notificação + overlay `Needs approval`
2. **60 seg** — som mais intenso
3. **120 seg** — agente fica com raiva 😠, overlay vermelho pulsante, buzzer urgente

### Monitor de Servidores
Quando um servidor Node.js sobe (ex: `npm run dev`), ele aparece como torre no datacenter. Clique para ver os logs.

### Editor de Layout
Clique no ícone ✏️ no painel para editar o escritório. Salve com **Save Layout**.

---

## Estrutura do Projeto

```
src/
├── extension.ts                  # Entry point VSCode
├── agentManager.ts               # Detecta e rastreia sessões Claude Code
├── serverManager.ts              # Detecta servidores Node.js rodando
├── BentoAgentsViewProvider.ts    # Webview provider (ponte extension↔webview)
├── transcriptParser.ts           # Parseia logs JSONL do Claude Code
└── fileWatcher.ts                # Monitora arquivos de sessão

webview-ui/src/
├── office/
│   ├── engine/                   # Game loop, personagens, renderizador canvas
│   ├── layout/                   # Catálogo de móveis, serialização de layout
│   └── sprites/                  # Sprites pixel art dos personagens
├── components/
│   ├── ServerPanel.tsx           # Painel lateral de servidores
│   ├── ServerRackOverlay.tsx     # Torres de PC renderizadas no mapa (grade)
│   └── ServerRackLogModal.tsx    # Modal flutuante de logs
├── notificationSound.ts          # Sons de notificação e escalada
└── App.tsx

releases/
├── latest/                       # VSIX da versão mais recente
└── archive/                      # Versões anteriores
```

---

## Desenvolvimento

```bash
npm install
cd webview-ui && npm install && cd ..

# Build completo
npm run package

# Gerar novo VSIX
npx vsce package --out bento-agents-X.Y.Z.vsix

# Mover versão anterior para arquivo
mv releases/latest/bento-agents-*.vsix releases/archive/
mv bento-agents-X.Y.Z.vsix releases/latest/

# Tag de versão
git tag vX.Y.Z && git push origin vX.Y.Z
```

---

## Créditos

- Fork de [pixel-agents](https://github.com/pablodelucca/pixel-agents) por Pablo de Lucca
- Customizado por **mechamedebento** para o projeto B.E.N.T.O.
- Sprites pixel art originais do pixel-agents, modificados com terno, gravata e óculos escuros

---

<p align="center"><em>Agência B.E.N.T.O. — Operação em andamento 🕵️</em></p>
