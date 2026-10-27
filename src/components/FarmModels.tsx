import { Component, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Color, Mesh, Object3D, type BufferGeometry, type Material, type MeshStandardMaterial, type InstancedMesh, type Group } from 'three';
import layout from '../farmVisualLayout.json';
import { farmModelUrl, farmPlantInstances, riceLook } from '../farmAppearance';

export class FarmModelBoundary extends Component<{children: ReactNode; fallback: ReactNode; onUnavailable: () => void}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() { return {failed: true}; }
  componentDidCatch() { this.props.onUnavailable(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
type Part = {name: string; geometry: BufferGeometry; material: Material | Material[]};
const tuple = (n: number[]): [number, number, number] => [n[0],n[1],n[2]];

export function FarmModels({ detailed, growth, stageId, tasks, motion, pulse }: {
  detailed: boolean; growth: number; stageId?: string; tasks: number[]; motion: boolean; pulse: number;
}) {
  const {scene} = useGLTF(farmModelUrl(detailed), false, true);
  const parts = useMemo(() => {
    scene.updateMatrixWorld(true);
    const out: Part[] = [];
    scene.traverse(o => {
      if (o instanceof Mesh) out.push({name: o.name, geometry: o.geometry.clone().applyMatrix4(o.matrixWorld), material: o.material});
    });
    for (const prefix of ['Env_', 'Buffalo_', 'Farmer_', 'Rice_', 'Grain_']) {
      if (!out.some(p => p.name.startsWith(prefix))) throw new Error(`Incomplete farm asset: ${prefix}`);
    }
    return out;
  }, [scene]);
  useEffect(() => () => parts.forEach(p => p.geometry.dispose()), [parts]);
  const buffalo = useRef<Group>(null), pulseAt = useRef(0);
  useEffect(() => { pulseAt.current = .35; }, [pulse]);
  useFrame((_, dt) => {
    pulseAt.current = Math.max(0, pulseAt.current - dt);
    if (buffalo.current) buffalo.current.position.x = layout.buffalo[0] + (motion ? pulseAt.current * .20 : 0);
  });
  const group = (prefix: string) => parts.filter(p => p.name.startsWith(prefix)).map(p =>
    <mesh key={p.name} geometry={p.geometry} material={p.material} castShadow={detailed} receiveShadow={detailed} dispose={null} />);
  const rice = parts.find(p => p.name.startsWith('Rice_'))!, grain = parts.find(p => p.name.startsWith('Grain_'))!;
  return <group dispose={null}>
    {group('Env_')}
    {growth >= 0 && growth < .06 && <group ref={buffalo} position={tuple(layout.buffalo)}>{group('Buffalo_')}</group>}
    {growth >= 0 && <group position={tuple(layout.farmer)} rotation={[0,-.65,0]}>{group('Farmer_')}</group>}
    <AuthoredRice rice={rice} grain={grain} growth={growth} stageId={stageId} tasks={tasks} detailed={detailed} />
    <group position={tuple(layout.granary)}>
      {stageId === 'store' && tasks.map((task) => <mesh key={task} position={[-.36+task%2*.7, layout.granaryFloor+.23, -.1+Math.floor(task/2)*.55]} castShadow={detailed}>
        <capsuleGeometry args={[.18,.16,detailed ? 6 : 3,detailed ? 10 : 5]} /><meshStandardMaterial color="#d3bd84" roughness={1} />
      </mesh>)}
    </group>
  </group>;
}

function AuthoredRice({rice, grain, growth, stageId, tasks, detailed}: {
  rice: Part; grain: Part; growth: number; stageId?: string; tasks: number[]; detailed: boolean;
}) {
  const leaves = useRef<InstancedMesh>(null), heads = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const material = useMemo(() => (rice.material as MeshStandardMaterial).clone(), [rice.material]);
  useEffect(() => () => material.dispose(), [material]);
  const plants = useMemo(() => farmPlantInstances(growth, stageId, tasks), [growth, stageId, tasks]);
  useLayoutEffect(() => {
    if (!leaves.current || !heads.current) return;
    material.color.set(riceLook(growth).color);
    let n = 0, g = 0;
    const green = new Color(riceLook(growth).color), stubble = new Color('#aa8c4c');
    plants.forEach(plant => {
      // Geometry starts at y=0. Growth scales from roots, not the field centre.
      dummy.position.set(plant.x,.05,plant.z); dummy.rotation.set(0,plant.angle,0);
      dummy.scale.set(plant.cut ? .35 : .8,plant.height,plant.cut ? .35 : .8); dummy.updateMatrix();
      leaves.current!.setMatrixAt(n,dummy.matrix);
      // Keep the material white so per-instance colours are not multiplied twice.
      leaves.current!.setColorAt(n++,plant.cut ? stubble : green);
      if (plant.grain) heads.current!.setMatrixAt(g++,dummy.matrix);
    });
    material.color.set('#ffffff');
    for (const [mesh,count] of [[leaves.current,n],[heads.current,g]] as const) {
      mesh.count=count; mesh.instanceMatrix.needsUpdate=true;
      if(mesh.instanceColor) mesh.instanceColor.needsUpdate=true;
      mesh.computeBoundingSphere();
    }
  }, [plants, dummy, material, growth]);
  return <group dispose={null}>
    <instancedMesh ref={leaves} args={[rice.geometry,material,layout.riceColumns**2]} castShadow={detailed} receiveShadow={detailed} />
    <instancedMesh ref={heads} args={[grain.geometry,grain.material,layout.riceColumns**2]} castShadow={detailed} />
  </group>;
}
