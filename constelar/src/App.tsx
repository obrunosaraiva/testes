import { Canvas } from '@react-three/fiber'
import { Scene } from './scene/Scene'
import { LeftPanel, RightPanel } from './ui/Panel'
import { PhraseCards } from './ui/PhraseCards'
import { SessionBar } from './ui/SessionBar'
import { useStore } from './store'

export default function App() {
  const role = useStore((s) => s.role)
  const isGuest = role === 'guest'

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">✦</span> Constelar
          <span className="tag">campo de constelação sistêmica</span>
        </div>
        <SessionBar />
      </header>

      <div className="stage">
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 7, 11], fov: 42 }}
          gl={{ preserveDrawingBuffer: true, antialias: true }}
        >
          <Scene />
        </Canvas>

        {!isGuest && <LeftPanel />}
        <RightPanel />
        {!isGuest && <PhraseCards />}
      </div>
    </div>
  )
}
