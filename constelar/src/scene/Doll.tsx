import { useRef } from 'react'
import { Html } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { Doll as DollData, Age } from '../store'

const AGE_SCALE: Record<Age, number> = {
  crianca: 0.68,
  adulto: 1,
  idoso: 0.92,
}

const SKIN = '#f0c9a6'

interface Props {
  doll: DollData
  selected: boolean
  onPointerDown: (e: ThreeEvent<PointerEvent>, id: string) => void
}

/**
 * Boneco estilizado ("peça de madeira" acolhedora, inspirado no Playmobil).
 * A ponta no peito indica a DIREÇÃO DO OLHAR — elemento central da constelação.
 */
export function Doll({ doll, selected, onPointerDown }: Props) {
  const group = useRef<THREE.Group>(null)
  const scale = AGE_SCALE[doll.age]

  return (
    <group
      ref={group}
      position={[doll.x, 0, doll.z]}
      rotation={[doll.laying ? -Math.PI / 2 : 0, doll.rotation, 0]}
    >
      <group
        scale={scale}
        onPointerDown={(e) => onPointerDown(e, doll.id)}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'grab'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto'
        }}
      >
        {/* base / pés */}
        <mesh position={[0, 0.06, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.22, 0.12, 24]} />
          <meshStandardMaterial color={doll.color} roughness={0.6} />
        </mesh>
        {/* corpo */}
        <mesh position={[0, 0.42, 0]} castShadow>
          <cylinderGeometry args={[0.13, 0.21, 0.6, 24]} />
          <meshStandardMaterial color={doll.color} roughness={0.55} />
        </mesh>
        {/* pescoço */}
        <mesh position={[0, 0.74, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.08, 0.08, 16]} />
          <meshStandardMaterial color={SKIN} roughness={0.5} />
        </mesh>
        {/* cabeça */}
        <mesh position={[0, 0.86, 0]} castShadow>
          <sphereGeometry args={[0.15, 24, 24]} />
          <meshStandardMaterial color={SKIN} roughness={0.45} />
        </mesh>
        {/* marcador de direção do olhar (frente) */}
        <mesh position={[0, 0.5, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.05, 0.14, 12]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffd9a0" emissiveIntensity={0.4} />
        </mesh>
      </group>

      {/* anel de seleção */}
      {selected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.26, 0.34, 40]} />
          <meshBasicMaterial color="#ffb765" side={THREE.DoubleSide} transparent opacity={0.9} />
        </mesh>
      )}

      {/* etiqueta / rótulo */}
      {doll.label && (
        <Html position={[0, 1.2 * scale, 0]} center distanceFactor={9} pointerEvents="none">
          <div className="doll-label">{doll.label}</div>
        </Html>
      )}
    </group>
  )
}
