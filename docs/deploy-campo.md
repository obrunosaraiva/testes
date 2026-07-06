# Publicar o campo (a "sala") na internet

O botão **"Abrir campo"** do painel (Lovable) aponta para uma URL configurável
(`BASE_URL/?sala=CODIGO`). Enquanto o campo não estiver publicado, essa URL não existe —
por isso o link "não abre". Este guia publica o campo e dá a você a `BASE_URL` real.

## O que é o campo

Tudo em `constelar/`. É **um único serviço Node** que serve:
- o app 3D (frontend buildado),
- a **API** (`/api`),
- o **tempo real** e a **sinalização de áudio/vídeo** (`/ws`).

Ou seja: **um deploy só** resolve. Requer **Node 22+** (usa o SQLite embutido `node:sqlite`)
e um host que aceite **WebSocket** (a maioria aceita).

## Opção A — Render (mais simples, tem plano grátis)

1. Suba o repositório no GitHub (já está).
2. No [Render](https://render.com): **New +** → **Blueprint** → conecte o repositório.
   O `constelar/render.yaml` já está pronto (usa o `Dockerfile`).
3. O Render builda e sobe. Você recebe uma URL, ex.: `https://constelar-campo.onrender.com`.
4. Essa URL é a sua **BASE_URL**.

> Plano Free dorme após inatividade e **não persiste** o SQLite/gravações entre reinícios.
> Para produção, use um plano com **disco** (descomentado no `render.yaml`) ou migre para Postgres + storage.

## Opção B — Docker em qualquer lugar (Fly.io, Railway, VPS)

```bash
cd constelar
docker build -t constelar-campo .
docker run -p 8787:8787 -e CONSTELAR_SECRET="troque-isto" constelar-campo
# abre em http://localhost:8787
```

Em Fly.io/Railway: aponte para a pasta `constelar/` e use o `Dockerfile`. Defina a env
`CONSTELAR_SECRET`. O host injeta a `PORT` automaticamente (o servidor a respeita).

## Depois de publicar: conectar o painel do Lovable

Com a `BASE_URL` em mãos (ex.: `https://constelar-campo.onrender.com`), configure o painel
para os botões apontarem para o campo real:

- **"Abrir campo"** (terapeuta) → `BASE_URL/?sala=CODIGO&host=1`
- **"link do cliente"** → `BASE_URL/?sala=CODIGO`

No Lovable, basta pedir ao agente: *"troque a BASE_URL do campo para https://SEU-ENDERECO"*.

## Teste rápido de produção (local)

```bash
cd constelar
npm ci
npm run build
npm start          # serve tudo em http://localhost:8787
```

Abra `http://localhost:8787`, crie a conta, agende uma sessão e clique em **Abrir campo**.
