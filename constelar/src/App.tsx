import FieldApp from './FieldApp'
import PanelApp from './panel/PanelApp'

/**
 * Roteamento de nível superior:
 * - ?sala=CÓDIGO  → a sala/campo de constelação 3D (terapeuta e cliente entram por aqui)
 * - caso contrário → o painel do terapeuta (login, clientes, agenda, prontuário)
 */
export default function App() {
  const hasRoom = new URLSearchParams(location.search).has('sala')
  return hasRoom ? <FieldApp /> : <PanelApp />
}
