# Spike — Evolution → Groq → WhatsApp

Validação end-to-end do pipeline de transcrição **sem precisar de banco, fila ou
painel**. Roda em ~5 minutos.

## O que valida

1. Subir Evolution API local via Docker
2. Criar instância de WhatsApp e parear via QR
3. Receber webhook quando chega um áudio
4. Baixar áudio (base64) da Evolution
5. Transcrever via Groq Whisper Large v3
6. Responder na conversa do WhatsApp citando o áudio original

## Pré-requisitos

- Docker + Docker Compose
- Node 20+ e pnpm 10+
- API key da Groq (gratuita em https://console.groq.com — free tier basta)
- Celular com WhatsApp ativo (vamos usar **um número de teste**, não o pessoal — para evitar risco de ban)

## ✅ Status atual da validação (smoke test)

Já foi rodado um smoke test isolado contra a Groq Whisper Large v3:

```
✓ OK in 404ms
  language: russian   (alucinação esperada para áudio sem fala)
  duration: 1s
  text: "..."
✅ Groq integration works. Key is valid.
```

Ou seja: a integração com Groq está funcionando. Falta só você rodar
**na sua máquina local** o spike completo (Evolution + WhatsApp pareado).

## Passo a passo

### 1. Subir a stack local

```bash
# Na raiz do monorepo (ziptalk/)
cp .env.example .env
# editar .env: preencher EVOLUTION_API_KEY (qualquer string segura) e GROQ_API_KEY

pnpm evolution:up
# aguarda ~10s até a Evolution responder em http://localhost:8080
```

Verificar saúde:
```bash
curl http://localhost:8080
# deve responder com info da Evolution
```

### 2. Instalar deps do spike

```bash
pnpm install
```

### 3. Expor o webhook para a Evolution alcançar

A Evolution roda em Docker e precisa chamar nosso servidor de spike (Node, fora
do Docker). Duas opções:

**Opção A — `host.docker.internal`** (Mac/Windows funciona out-of-the-box):
```bash
# nada a fazer; default já usa host.docker.internal:4000
```

**Opção B — ngrok** (Linux ou se a opção A falhar):
```bash
ngrok http 4000
# copia a URL https://xxxx.ngrok.app e exporta:
export SPIKE_PUBLIC_URL=https://xxxx.ngrok.app
```

### 4. Rodar o spike

```bash
pnpm --filter @ziptalk/worker-stt spike
```

Saída esperada:
```
▶ Webhook server: http://localhost:4000/webhook
▶ Setting up Evolution instance "ziptalk_spike"…

📱 Scan this QR code with your WhatsApp:
   Or visit: http://localhost:8080/instance/connect/ziptalk_spike

✓ Spike ready. Send an audio to the connected number.
```

### 5. Parear o WhatsApp

A forma mais fácil é usar o **Manager UI** que vem na Evolution:

1. Abra `http://localhost:8080/manager` no navegador
2. Cole sua `EVOLUTION_API_KEY` (a do `.env`) no campo de login
3. Encontre a instância `ziptalk_spike` na lista
4. Clique em "Connect" → vai mostrar o QR
5. Escaneie com o celular (WhatsApp → Aparelhos conectados → Conectar aparelho)

### 6. Testar

Mande um áudio (ou peça pra alguém te mandar) pro número conectado.

Saída esperada no terminal:
```
📥 Audio received: msg=XXXX from=5511999999999@s.whatsapp.net fromMe=false dur=12s
⬇️  Downloading audio from Evolution…
   28.4 KB / audio/ogg; codecs=opus
🧠 Transcribing with Groq Whisper…
   ✓ 1247ms · lang=portuguese · 89 chars
   "Oi, beleza? Só passando pra confirmar nossa reunião de amanhã às 14h."
💬 Replying on WhatsApp…
   ✓ Sent
```

E no WhatsApp aparece a resposta com o texto + footer `⚡ Transcrição com IA por
Ziptalk`, citando o áudio original.

## Métricas a observar

- **Latência total** (áudio recebido → resposta enviada): deve ficar < 5s para áudios de até 1min
- **Latência Groq**: ~800–1500ms para áudios de 10–30s
- **Custo Groq Whisper Large v3**: ~$0.04 por hora de áudio ≈ R$ 0.20

## Próximos passos (após o spike validar)

1. Substituir o servidor HTTP do spike por endpoint em `apps/web/src/app/api/webhook/evolution/route.ts`
2. Substituir processamento síncrono por enfileiramento BullMQ (`stt-queue`)
3. Persistir transcrição + usage record no Supabase
4. Aplicar `word_corrections` antes de enviar
5. Bifurcar pipeline: se duração > 2min OU plano >= Pro → enfileirar `summarize-queue`

## Limpeza

```bash
# parar Evolution
pnpm evolution:down

# remover instância (se quiser começar do zero)
curl -X DELETE http://localhost:8080/instance/delete/ziptalk_spike \
  -H "apikey: $EVOLUTION_API_KEY"
```
