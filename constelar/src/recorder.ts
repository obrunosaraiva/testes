import { getActiveRtc } from './webrtc'

/**
 * Grava a sessão: vídeo do campo (canvas) + áudio das vozes (terapeuta + cliente),
 * misturados via WebAudio, em um único arquivo .webm.
 */
export interface ActiveRecording {
  stop: () => Promise<Blob>
  startedAt: number
}

function pickMime(): string {
  const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
  for (const m of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) return m
  }
  return 'video/webm'
}

export async function startFieldRecording(): Promise<ActiveRecording> {
  const canvas = document.querySelector('canvas') as HTMLCanvasElement | null
  if (!canvas) throw new Error('Campo não encontrado')

  const canvasStream = canvas.captureStream(30)

  // mistura de áudio das vozes da chamada; se não houver chamada, tenta o microfone
  const audioContext = new AudioContext()
  const dest = audioContext.createMediaStreamDestination()
  let hasAudio = false

  const rtc = getActiveRtc()
  const streams = rtc?.audioStreams() ?? []
  for (const s of streams) {
    audioContext.createMediaStreamSource(s).connect(dest)
    hasAudio = true
  }
  if (!hasAudio) {
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioContext.createMediaStreamSource(mic).connect(dest)
      hasAudio = true
    } catch {
      /* grava só o vídeo se não houver áudio disponível */
    }
  }

  const tracks = [...canvasStream.getVideoTracks(), ...(hasAudio ? dest.stream.getAudioTracks() : [])]
  const mixed = new MediaStream(tracks)

  const mimeType = pickMime()
  const rec = new MediaRecorder(mixed, { mimeType, videoBitsPerSecond: 2_500_000 })
  const chunks: BlobPart[] = []
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data)
  }
  rec.start(1000) // um chunk por segundo

  const startedAt = Date.now()

  return {
    startedAt,
    stop: () =>
      new Promise<Blob>((resolve) => {
        rec.onstop = () => {
          audioContext.close().catch(() => {})
          resolve(new Blob(chunks, { type: mimeType }))
        }
        rec.stop()
      }),
  }
}
