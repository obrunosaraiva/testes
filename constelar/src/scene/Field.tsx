import * as THREE from 'three'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { FieldMode } from '../store'

const RADIUS = 5

/** O campo — a base do trabalho. Chão de madeira ou espelho d'água (campo de água). */
export function Field({ mode }: { mode: FieldMode }) {
  const water = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (mode === 'water' && water.current) {
      const mat = water.current.material as THREE.MeshStandardMaterial
      mat.opacity = 0.72 + Math.sin(state.clock.elapsedTime * 0.8) * 0.05
    }
  })

  return (
    <group>
      {/* disco do campo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[RADIUS, 64]} />
        {mode === 'wood' ? (
          <meshStandardMaterial color="#b08a5f" roughness={0.75} />
        ) : (
          <meshStandardMaterial color="#3f6f88" roughness={0.08} metalness={0.6} transparent opacity={0.75} />
        )}
      </mesh>

      {/* borda suave do campo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[RADIUS, RADIUS + 0.18, 64]} />
        <meshStandardMaterial color={mode === 'wood' ? '#8a6a45' : '#2c5266'} />
      </mesh>
    </group>
  )
}

export const FIELD_RADIUS = RADIUS
