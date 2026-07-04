# Constelar — Campo de Constelação Sistêmica

Protótipo funcional (v0.1) do **núcleo** da plataforma de constelação familiar por teleterapia
descrita em [`../docs/prd-constelacao-telemedicina.md`](../docs/prd-constelacao-telemedicina.md).

Este primeiro módulo entrega o **coração do produto**: a sala virtual e o campo 3D com bonecos
manipuláveis, rodando 100% no navegador (sem instalar nada).

## O que já funciona

- **Sala virtual** com iluminação (Quente / Neutra / Penumbra), incenso animado, tapete, plantas e cortina.
- **Campo** em madeira ou **espelho d'água** (campo de água, ao estilo Cristina Florentino).
- **Bonecos/avatares**: masculino, feminino, unissex; idade (criança/adulto/idoso); cor; rótulo livre
  (ex.: "Mãe", "O excluído", "A doença").
- **Manipulação**: arrastar para posicionar, girar a **direção do olhar** (elemento central da constelação),
  deitar o boneco, remover.
- **Frases sistêmicas** (baralho de frases de solução).
- **Imagem de solução**: captura em PNG do estado atual do campo.

## Rodar localmente

```bash
cd constelar
npm install
npm run dev      # abre em http://localhost:5173
```

Build de produção: `npm run build` → gera `dist/` (deploy estático em qualquer CDN).

## Stack

- **React + TypeScript + Vite**
- **Three.js** via **@react-three/fiber** + **@react-three/drei** (cena 3D no navegador)
- **Zustand** (estado do campo)

## Próximos passos (do roadmap do PRD)

1. **Sincronização em tempo real** terapeuta ↔ cliente (Colyseus/Yjs + WebSocket).
2. **Áudio/vídeo** na sala (WebRTC).
3. **Editor de sala** avançado (móveis, texturas, branding) e cenários salvos.
4. **Backend**: contas, agenda, sala de espera, prontuário, snapshots persistidos, assinatura.
5. Acessórios e mais variedade de bonecos; âncoras de chão e papéis com nome; linhas de vínculo.

> ⚠️ Ferramenta de apoio a práticas integrativas/terapêuticas. Constelação familiar não é reconhecida
> pelo CFP/CFM como prática de eficácia comprovada. Ver seção de riscos e LGPD no PRD.
