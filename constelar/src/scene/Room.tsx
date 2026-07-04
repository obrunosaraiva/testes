/** Sala/escritório virtual: piso, paredes, tapete, plantas e cortina. Cenário base decorável. */
export function Room() {
  return (
    <group>
      {/* piso da sala */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[26, 26]} />
        <meshStandardMaterial color="#7d6350" roughness={0.9} />
      </mesh>

      {/* tapete sob o campo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
        <circleGeometry args={[6.4, 48]} />
        <meshStandardMaterial color="#9c6b57" roughness={0.95} />
      </mesh>

      {/* parede fundo */}
      <mesh position={[0, 4, -9]} receiveShadow>
        <planeGeometry args={[26, 12]} />
        <meshStandardMaterial color="#e9ddcf" roughness={1} />
      </mesh>
      {/* parede lateral */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-11, 4, 0]} receiveShadow>
        <planeGeometry args={[20, 12]} />
        <meshStandardMaterial color="#e2d4c3" roughness={1} />
      </mesh>

      {/* cortina */}
      <mesh position={[6, 4.5, -8.85]}>
        <planeGeometry args={[4, 7]} />
        <meshStandardMaterial color="#c98b6d" roughness={1} />
      </mesh>

      {/* plantas */}
      <Plant position={[-8, 0, -7]} />
      <Plant position={[8.5, 0, -6]} scale={0.8} />
    </group>
  )
}

function Plant({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.35, 0.45, 1, 12]} />
        <meshStandardMaterial color="#8a5a3c" />
      </mesh>
      <mesh position={[0, 1.6, 0]} castShadow>
        <sphereGeometry args={[0.9, 16, 16]} />
        <meshStandardMaterial color="#5f7d4f" roughness={1} />
      </mesh>
      <mesh position={[0.5, 1.2, 0.2]} castShadow>
        <sphereGeometry args={[0.55, 16, 16]} />
        <meshStandardMaterial color="#6d8a58" roughness={1} />
      </mesh>
    </group>
  )
}
