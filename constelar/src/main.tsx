import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { useStore } from './store'
import './styles.css'

// expõe o store em desenvolvimento (facilita testes automatizados)
if (import.meta.env.DEV) {
  ;(window as unknown as { useStore: typeof useStore }).useStore = useStore
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
