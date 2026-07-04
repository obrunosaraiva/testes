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
- **Sessão online em tempo real** 🆕: o terapeuta inicia a sala e envia um **link**; o cliente entra pelo
  navegador (sem instalar nada) e vê os bonecos, o campo e as frases se moverem ao vivo. O terapeuta
  controla se **o cliente pode mover** os bonecos ("terapeuta conduz").
- **Frases sistêmicas** (baralho de frases de solução).
- **Imagem de solução**: captura em PNG do estado atual do campo.

## Rodar localmente

```bash
cd constelar
npm install
npm run dev      # sobe o app (5173) + o servidor de tempo real (8787) juntos
```

Abra `http://localhost:5173`, clique em **"Iniciar sessão online"** e copie o link do cliente
(abra em outra aba/dispositivo para ver a sincronização).

Scripts: `npm run dev:web` (só o app) · `npm run dev:server` (só o tempo real) ·
`npm run build` → `dist/` (deploy estático).

## Stack

- **React + TypeScript + Vite**
- **Three.js** via **@react-three/fiber** + **@react-three/drei** (cena 3D no navegador)
- **Zustand** (estado do campo)
- **ws** (servidor WebSocket de tempo real, `server/index.mjs`) — estado autoritativo por sala + broadcast

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
2. **Áudio/vídeo** na sala (WebRTC) — falar durante a sessão.
3. **Backend**: contas, agenda, sala de espera, prontuário, snapshots persistidos, assinatura.
4. **Editor de sala** avançado (móveis, texturas, branding) e cenários salvos.
5. Acessórios e mais variedade de bonecos; âncoras de chão e papéis com nome; linhas de vínculo.
6. **Robustez do tempo real**: reconexão automática, persistência da sala, autenticação do link.

> ⚠️ Ferramenta de apoio a práticas integrativas/terapêuticas. Constelação familiar não é reconhecida
> pelo CFP/CFM como prática de eficácia comprovada. Ver seção de riscos e LGPD no PRD.
