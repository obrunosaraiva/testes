import { useEffect, useState } from 'react'
import { api, getToken, setToken, type Therapist } from '../api'
import { Auth } from './Auth'
import { Dashboard } from './Dashboard'
import './panel.css'

/** Painel do terapeuta (raiz do app). O campo 3D abre via ?sala=CÓDIGO. */
export default function PanelApp() {
  const [therapist, setTherapist] = useState<Therapist | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getToken()) {
      setLoading(false)
      return
    }
    api
      .me()
      .then(setTherapist)
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [])

  const logout = () => {
    setToken(null)
    setTherapist(null)
  }

  if (loading) return <div className="panel-loading">Carregando…</div>
  if (!therapist) return <Auth onAuth={setTherapist} />
  return <Dashboard therapist={therapist} onLogout={logout} />
}
