import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import type { Anchor as AnchorData } from '../store'

interface Props {
  anchor: AnchorData
  selected: boolean
  onPointerDown: (e: ThreeEvent<PointerEvent>, id: string, kind: 'anchor') => void
}

/** Âncora de chão / papel com nome — deitado no campo, arrastável. */
export function Anchor({ anchor, selected, onPointerDown }: Props) {
  return (
    <group position={[anchor.x, 0, anchor.z]}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.015, 0]}
        onPointerDown={(e) => onPointerDown(e, anchor.id, 'anchor')}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'grab'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto'
        }}
      >
        <planeGeometry args={[0.7, 0.5]} />
        <meshStandardMaterial color={anchor.color} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.42, 0.5, 40]} />
          <meshBasicMaterial color="#ffb765" side={THREE.DoubleSide} transparent opacity={0.9} />
        </mesh>
      )}

      {anchor.label && (
        <Html position={[0, 0.05, 0]} center distanceFactor={9} pointerEvents="none">
          <div className="anchor-label">{anchor.label}</div>
        </Html>
      )}
    </group>
  )
}
