// Trilha ambiente calma sintetizada (WebAudio) — sem arquivos de áudio/licença.
// Um pad suave (acorde) com filtro passa-baixa e respiração lenta de volume.

let ctx: AudioContext | null = null
let master: GainNode | null = null
let nodes: OscillatorNode[] = []
let lfo: OscillatorNode | null = null

// acorde tranquilo (Lá menor pentatônico grave), em Hz
const CHORD = [110.0, 164.81, 220.0, 277.18, 329.63]

export function startAmbient() {
  if (ctx) return
  ctx = new AudioContext()
  master = ctx.createGain()
  master.gain.value = 0
  master.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 4) // fade-in lento

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 700
  filter.Q.value = 0.6
  filter.connect(master)
  master.connect(ctx.destination)

  // respiração lenta do volume (LFO)
  lfo = ctx.createOscillator()
  lfo.frequency.value = 0.07
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 0.04
  lfo.connect(lfoGain)
  lfoGain.connect(master.gain)
  lfo.start()

  nodes = CHORD.map((freq, i) => {
    const osc = ctx!.createOscillator()
    osc.type = i % 2 === 0 ? 'sine' : 'triangle'
    osc.frequency.value = freq
    osc.detune.value = (i - 2) * 4 // leve desafinação para calor
    const g = ctx!.createGain()
    g.gain.value = 0.5 / CHORD.length
    osc.connect(g)
    g.connect(filter)
    osc.start()
    return osc
  })
}

export function stopAmbient() {
  if (!ctx || !master) return
  const c = ctx
  const t = c.currentTime
  master.gain.cancelScheduledValues(t)
  master.gain.setValueAtTime(master.gain.value, t)
  master.gain.linearRampToValueAtTime(0, t + 1.5) // fade-out
  const toStop = [...nodes, lfo]
  setTimeout(() => {
    toStop.forEach((n) => n?.stop())
    c.close().catch(() => {})
  }, 1700)
  ctx = null
  master = null
  nodes = []
  lfo = null
}

/** garante retomada caso o contexto esteja suspenso (política de autoplay). */
export function resumeAmbient() {
  ctx?.resume().catch(() => {})
}
