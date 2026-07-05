import { useState } from 'react'
import { useStore } from '../store'
import { api, getToken } from '../api'
import { useT, useLangStore, phrasesFor } from '../i18n'

export function PhraseCards() {
  const currentPhrase = useStore((s) => s.currentPhrase)
  const setPhrase = useStore((s) => s.setPhrase)
  const dolls = useStore((s) => s.dolls)
  const clearField = useStore((s) => s.clearField)
  const lang = useLangStore((s) => s.lang)
  const t = useT()
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  const draw = () => {
    // sorteio sem depender de Math.random (varia pelo estado atual do campo)
    const phrases = phrasesFor(lang)
    const seed = dolls.length + Date.now()
    setPhrase(phrases[seed % phrases.length])
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
        setSavedMsg(t('bar.saved'))
      } catch {
        setSavedMsg(t('bar.downloaded'))
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
          {t('bar.phrase')}
        </button>
        <button className="btn-ghost" onClick={snapshot}>
          {savedMsg ? `📸 ${savedMsg}` : t('bar.snapshot')}
        </button>
        <button className="btn-ghost danger" onClick={clearField}>
          {t('bar.clear')}
        </button>
      </div>
    </div>
  )
}
