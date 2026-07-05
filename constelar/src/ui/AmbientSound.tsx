import { useEffect } from 'react'
import { useStore } from '../store'
import { startAmbient, stopAmbient, resumeAmbient } from '../ambient'

/** Liga/desliga a trilha ambiente conforme o toggle "Som ambiente" (sincronizado na sala). */
export function AmbientSound() {
  const music = useStore((s) => s.ambiance.music)

  useEffect(() => {
    if (music) {
      startAmbient()
      resumeAmbient()
      // retoma o áudio na primeira interação (política de autoplay do navegador)
      const resume = () => resumeAmbient()
      window.addEventListener('pointerdown', resume, { once: true })
      return () => {
        window.removeEventListener('pointerdown', resume)
        stopAmbient()
      }
    }
    stopAmbient()
  }, [music])

  return null
}
