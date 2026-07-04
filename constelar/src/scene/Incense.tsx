import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const COUNT = 60

/** Fumaça de incenso subindo suavemente num canto da sala. */
export function Incense({ position = [-4, 0, -3] as [number, number, number] }) {
  const points = useRef<THREE.Points>(null)

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3)
    const speeds = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3 + 0] = (Math.sin(i * 12.9898) * 0.5) % 0.2
      positions[i * 3 + 1] = (i / COUNT) * 3
      positions[i * 3 + 2] = (Math.cos(i * 78.233) * 0.5) % 0.2
      speeds[i] = 0.2 + ((i % 7) / 7) * 0.3
    }
    return { positions, speeds }
  }, [])

  useFrame((_, delta) => {
    const geo = points.current?.geometry
    if (!geo) return
    const arr = geo.attributes.position.array as Float32Array
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3 + 1] += speeds[i] * delta
      arr[i * 3 + 0] += Math.sin(arr[i * 3 + 1] * 2 + i) * delta * 0.08
      if (arr[i * 3 + 1] > 3) arr[i * 3 + 1] = 0
    }
    geo.attributes.position.needsUpdate = true
  })

  return (
    <group position={position}>
      {/* base do incensário */}
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.06, 12]} />
        <meshStandardMaterial color="#6b4a2f" />
      </mesh>
      <points ref={points}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#d9d2c7" size={0.09} transparent opacity={0.35} depthWrite={false} sizeAttenuation />
      </points>
    </group>
  )
}
