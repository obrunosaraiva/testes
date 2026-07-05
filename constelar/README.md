# Constelar — Campo de Constelação Sistêmica

Protótipo funcional (v0.1) do **núcleo** da plataforma de constelação familiar por teleterapia
descrita em [`../docs/prd-constelacao-telemedicina.md`](../docs/prd-constelacao-telemedicina.md).

Este módulo entrega o **coração do produto**: a sala virtual e o campo 3D com bonecos
manipuláveis **sincronizados em tempo real** entre terapeuta e cliente, rodando 100% no
navegador (sem instalar nada).

## O que já funciona

- **Sala virtual** com iluminação (Quente / Neutra / Penumbra), incenso animado, tapete, plantas e cortina.
- **Campo** em madeira ou **espelho d'água** (campo de água, ao estilo Cristina Florentino).
- **Bonecos/avatares**: masculino, feminino, unissex; idade (criança/adulto/idoso); cor; rótulo livre
  (ex.: "Mãe", "O excluído", "A doença").
- **Manipulação**: arrastar para posicionar, girar a **direção do olhar** (elemento central da constelação),
  deitar o boneco, remover.
- **Sessão online em tempo real**: o terapeuta inicia a sala e envia um **link**; o cliente entra pelo
  navegador (sem instalar nada) e vê os bonecos, o campo e as frases se moverem ao vivo. O terapeuta
  controla se **o cliente pode mover** os bonecos ("terapeuta conduz").
- **Áudio e vídeo na sala** (WebRTC 1:1): falar durante a sessão, com microfone e câmera opcional
  (mudo/desligar câmera), sem depender de Zoom por fora.
- **Frases sistêmicas** (baralho de frases de solução).
- **Imagem de solução**: captura em PNG do estado atual do campo — e, se o terapeuta estiver logado,
  a imagem é salva automaticamente na sessão (aparece na galeria do painel).
- **Painel do terapeuta** 🆕 (backend real): cadastro/login, **clientes**, **agenda de sessões**,
  **prontuário** (anotações privadas por sessão) e **galeria de imagens de solução**. Cada terapeuta
  só vê os próprios dados. A sala/campo abre a partir da sessão (`▶ Abrir campo` para o terapeuta,
  `🔗 link do cliente` para o consulente).

## Rodar localmente

```bash
cd constelar
npm install
npm run dev      # sobe o app (5173) + a API/tempo real (8787) juntos
```

Abra `http://localhost:5173`, **crie sua conta de terapeuta**, cadastre um cliente e agende uma sessão.
Na sessão, use **▶ Abrir campo** (você entra como terapeuta) e **🔗 Copiar link do cliente** (abra em
outra aba/dispositivo para ver a sincronização ao vivo). Capture a **imagem de solução** no campo e ela
aparece na galeria da sessão.

Scripts: `npm run dev:web` (só o app) · `npm run dev:server` (só a API/tempo real) ·
`npm run build` → `dist/` (o servidor serve o build em produção).

> Requer **Node 22+** (usa o SQLite embutido `node:sqlite`, com a flag `--experimental-sqlite` já nos scripts).

## Rotas do app

- `/` → **painel do terapeuta** (login, clientes, agenda, prontuário, imagens de solução).
- `/?sala=CÓDIGO` → entra no **campo** como **cliente**.
- `/?sala=CÓDIGO&host=1` → entra no **campo** como **terapeuta** (host), vinculado à sessão.

## Backend (API + tempo real)

Servidor único em `server/` (Node puro, sem dependências nativas):

- **API REST** (`server/api.mjs`): `/api/auth/*`, `/api/clients`, `/api/sessions`, prontuário
  (`/sessions/:id/notes`), imagens de solução (`/sessions/:id/snapshots`) e `/rooms/:code`.
- **Autenticação** (`server/auth.mjs`): senha com `scrypt`, token tipo-JWT assinado por HMAC — sem libs externas.
- **Banco de dados**: **SQLite embutido do Node** (`node:sqlite`, `server/db.mjs`) — arquivo em `server/data/`.
- **Tempo real** (`server/realtime.mjs`): WebSocket com estado autoritativo por sala + broadcast (também
  canal de sinalização do WebRTC). Isolamento por terapeuta (cada um só acessa os próprios dados).

## Stack

- **React + TypeScript + Vite** (frontend: campo 3D + painel)
- **Three.js** via **@react-three/fiber** + **@react-three/drei** (cena 3D no navegador)
- **Zustand** (estado do campo)
- **Express** + **ws** + **node:sqlite** (backend: API, tempo real e banco)

## Arquitetura de tempo real

```
Terapeuta (host) ─┐                        ┌─ aplica no estado da sala
Cliente (guest) ──┼─ WebSocket /ws ─► servidor ─┤
                  ┘   (JSON patches)         └─ retransmite aos demais
```

Mensagens: `state` (snapshot ao entrar), `doll:add/update/remove`, `ambiance`, `phrase`, `clear`,
`presence`. Os `doll:update` do arraste são coalescidos por animation frame (`src/net.ts`).

## Próximos passos (do roadmap do PRD)

1. ✅ **Sincronização em tempo real** terapeuta ↔ cliente.
2. ✅ **Áudio/vídeo** na sala (WebRTC 1:1) — falar durante a sessão.
3. ✅ **Backend**: contas, clientes, agenda, prontuário e imagens de solução persistidas.
4. **Assinatura/pagamento** do terapeuta e cobrança do cliente.
5. **Sala de espera** e consentimento informado digital antes da sessão.
6. **Editor de sala** avançado (móveis, texturas, branding) e cenários salvos.
7. Acessórios e mais variedade de bonecos; âncoras de chão e papéis com nome; linhas de vínculo.
8. **Robustez**: reconexão automática, TURN server (hoje só STUN), migração do SQLite para Postgres em produção.
9. **Grupo**: chamada com mais de 2 participantes (SFU) para constelação em grupo.

> ⚠️ Ferramenta de apoio a práticas integrativas/terapêuticas. Constelação familiar não é reconhecida
> pelo CFP/CFM como prática de eficácia comprovada. Ver seção de riscos e LGPD no PRD.
