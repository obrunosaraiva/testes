import { useRef, useState } from 'react'
import { OrbitControls, SoftShadows, Line } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import { Room } from './Room'
import { Field, FIELD_RADIUS } from './Field'
import { Doll } from './Doll'
import { Anchor } from './Anchor'
import { Incense } from './Incense'

const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const HIT = new THREE.Vector3()

type DragTarget = { kind: 'doll' | 'anchor'; id: string }

/** Linhas de vínculo entre representantes. */
function Links() {
  const dolls = useStore((s) => s.dolls)
  const links = useStore((s) => s.links)
  return (
    <>
      {links.map((l) => {
        const a = dolls.find((d) => d.id === l.a)
        const b = dolls.find((d) => d.id === l.b)
        if (!a || !b) return null
        return (
          <Line
            key={l.id}
            points={[
              [a.x, 0.35, a.z],
              [b.x, 0.35, b.z],
            ]}
            color="#ffb765"
            lineWidth={2.5}
            transparent
            opacity={0.8}
          />
        )
      })}
    </>
  )
}

function Lights({ mode }: { mode: 'warm' | 'neutral' | 'penumbra' }) {
  if (mode === 'neutral') {
    return (
      <>
        <ambientLight intensity={0.7} />
        <directionalLight position={[6, 10, 6]} intensity={1.1} castShadow />
      </>
    )
  }
  if (mode === 'penumbra') {
    return (
      <>
        <ambientLight intensity={0.18} color="#ffd9a8" />
        <pointLight position={[0, 5, 2]} intensity={22} distance={16} color="#ffb066" castShadow />
        <pointLight position={[-4, 2, -3]} intensity={8} distance={8} color="#ff8a4a" />
      </>
    )
  }
  // warm (default)
  return (
    <>
      <ambientLight intensity={0.4} color="#ffe8c9" />
      <hemisphereLight args={['#fff1dc', '#5a4636', 0.6]} />
      <pointLight position={[2, 6, 3]} intensity={30} distance={20} color="#ffd7a0" castShadow />
      <directionalLight position={[-6, 8, -4]} intensity={0.5} color="#ffcaa0" />
    </>
  )
}

export function Scene() {
  const dolls = useStore((s) => s.dolls)
  const anchors = useStore((s) => s.anchors)
  const selectedId = useStore((s) => s.selectedId)
  const pendingLink = useStore((s) => s.pendingLink)
  const ambiance = useStore((s) => s.ambiance)
  const updateDoll = useStore((s) => s.updateDoll)
  const updateAnchor = useStore((s) => s.updateAnchor)
  const select = useStore((s) => s.select)

  const [dragging, setDragging] = useState<DragTarget | null>(null)
  const draggingRef = useRef<DragTarget | null>(null)

  const startDrag = (e: ThreeEvent<PointerEvent>, id: string, kind: 'doll' | 'anchor' = 'doll') => {
    e.stopPropagation()
    const st = useStore.getState()
    // modo de ligar vínculos: clicar em bonecos cria/remove um vínculo em vez de arrastar
    if (kind === 'doll' && st.linkMode && st.canEdit()) {
      st.pickForLink(id)
      return
    }
    select(id)
    if (!st.canEdit()) return // cliente sem permissão só observa/seleciona
    const target: DragTarget = { kind, id }
    draggingRef.current = target
    setDragging(target)
    document.body.style.cursor = 'grabbing'
    ;(e.target as Element)?.setPointerCapture?.(e.pointerId)
  }

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const target = draggingRef.current
    if (!target) return
    e.ray.intersectPlane(GROUND, HIT)
    // mantém dentro do campo
    const r = Math.hypot(HIT.x, HIT.z)
    const max = FIELD_RADIUS - 0.3
    let { x, z } = HIT
    if (r > max) {
      x = (HIT.x / r) * max
      z = (HIT.z / r) * max
    }
    if (target.kind === 'doll') updateDoll(target.id, { x, z })
    else updateAnchor(target.id, { x, z })
  }

  const endDrag = () => {
    draggingRef.current = null
    setDragging(null)
    document.body.style.cursor = 'auto'
  }

  return (
    <>
      <SoftShadows size={12} samples={8} />
      <color attach="background" args={[ambiance.light === 'penumbra' ? '#1c140e' : '#2a201a']} />
      <fog attach="fog" args={[ambiance.light === 'penumbra' ? '#1c140e' : '#2a201a', 18, 40]} />

      <Lights mode={ambiance.light} />

      <group onPointerMove={onMove} onPointerUp={endDrag}>
        <Room />
        <Field mode={ambiance.field} />
        {ambiance.incense && <Incense />}

        {/* superfície de captura para arrastar e para clicar no vazio */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0, 0]}
          onPointerDown={(e) => {
            if (!draggingRef.current) select(null)
          }}
        >
          <planeGeometry args={[60, 60]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        {anchors.map((a) => (
          <Anchor key={a.id} anchor={a} selected={a.id === selectedId} onPointerDown={startDrag} />
        ))}

        <Links />

        {dolls.map((d) => (
          <Doll
            key={d.id}
            doll={d}
            selected={d.id === selectedId || d.id === pendingLink}
            onPointerDown={startDrag}
          />
        ))}
      </group>

      <OrbitControls
        enabled={!dragging}
        enablePan={false}
        minDistance={5}
        maxDistance={22}
        maxPolarAngle={Math.PI / 2.15}
        target={[0, 0.4, 0]}
      />
    </>
  )
}
