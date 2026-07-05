import { useState } from 'react'
import { useStore } from '../store'
import { api, getToken } from '../api'

/** Baralho de frases sistêmicas / frases de solução usadas na condução. */
const PHRASES = [
  'Eu honro você.',
  'Você é minha mãe, eu sou o(a) filho(a).',
  'Você é meu pai, eu sou o(a) filho(a).',
  'Eu te vejo.',
  'Você tem um lugar no meu coração.',
  'Eu deixo você em paz.',
  'Por favor, olhe por mim com bons olhos.',
  'Eu recebo a vida de vocês, e faço algo bom com ela.',
  'O que foi pesado, agora pode descansar.',
  'Eu fico, você parte. No tempo certo, eu também vou.',
  'Eu respeito o seu destino.',
  'Agora eu assumo o meu lugar.',
]

export function PhraseCards() {
  const currentPhrase = useStore((s) => s.currentPhrase)
  const setPhrase = useStore((s) => s.setPhrase)
  const dolls = useStore((s) => s.dolls)
  const clearField = useStore((s) => s.clearField)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  const draw = () => {
    // sorteio sem depender de Math.random (varia pelo estado atual do campo)
    const seed = dolls.length + Date.now()
    setPhrase(PHRASES[seed % PHRASES.length])
  }

  const snapshot = async () => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    const url = (canvas as HTMLCanvasElement).toDataURL('image/png')
    // download local
    const a = document.createElement('a')
    a.href = url
    a.download = 'imagem-de-solucao.png'
    a.click()

    // se o terapeuta está logado e a sala pertence a uma sessão, salva no prontuário
    const code = new URLSearchParams(location.search).get('sala')
    if (getToken() && code) {
      try {
        const room = await api.room(code)
        await api.addSnapshot(room.id, url, 'imagem de solução')
        setSavedMsg('✓ salva na sessão')
      } catch {
        setSavedMsg('baixada (sessão não vinculada)')
      }
      setTimeout(() => setSavedMsg(null), 2600)
    }
  }

  return (
    <div className="bottombar">
      {currentPhrase && (
        <div className="phrase-banner" onClick={() => setPhrase(null)}>
          <span>“{currentPhrase}”</span>
          <button className="phrase-close" aria-label="fechar">
            ×
          </button>
        </div>
      )}
      <div className="bottombar-actions">
        <button className="btn-ghost" onClick={draw}>
          🃏 Frase sistêmica
        </button>
        <button className="btn-ghost" onClick={snapshot}>
          📸 {savedMsg || 'Imagem de solução'}
        </button>
        <button className="btn-ghost danger" onClick={clearField}>
          Limpar campo
        </button>
      </div>
    </div>
  )
}
