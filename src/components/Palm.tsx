/** A stylized sugar palm: a slender trunk with a drooping crown of fronds. */
export function Palm({
  position,
  scale = 1,
  spin = 0,
}: {
  position: [number, number, number];
  scale?: number;
  spin?: number;
}) {
  const fronds = 9;
  return (
    <group position={position} rotation={[0, spin, 0]} scale={scale}>
      {/* trunk */}
      <mesh castShadow position={[0, 2.15, 0]}>
        <cylinderGeometry args={[0.08, 0.16, 4.3, 7]} />
        <meshStandardMaterial color="#7c6748" roughness={1} />
      </mesh>
      {/* crown of drooping fronds */}
      {Array.from({ length: fronds }).map((_, i) => (
        <group key={i} position={[0, 4.25, 0]} rotation={[0, (i / fronds) * Math.PI * 2, 0]}>
          <mesh castShadow position={[0.75, -0.1, 0]} rotation={[0, 0, -0.5]}>
            <boxGeometry args={[1.5, 0.05, 0.28]} />
            <meshStandardMaterial color="#3f6f2f" roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
