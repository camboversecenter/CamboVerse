import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { DoubleSide, Group, SphereGeometry, RingGeometry, CylinderGeometry } from "three";
import type { Detail } from "./LabOrgans";
import type { LabLayer } from "../lab";
import { LabTissueMaterial } from "./LabTissueMaterial";

function highlight(isSelected: boolean, anySelected: boolean, isHovered: boolean = false) {
  const ghost = anySelected && !isSelected;
  return {
    emissive: isSelected ? "#ffd9a0" : (isHovered ? "#3a251a" : "#000000"),
    emissiveIntensity: isSelected ? 0.42 : (isHovered ? 0.15 : 0),
    transparent: ghost,
    opacity: ghost ? 0.32 : 1,
    depthWrite: !ghost,
  };
}

export function Seasons({
  layer = "whole", detail = "ultra", onPick, selected, knob = 1
}: {
  layer?: LabLayer;
  detail?: Detail;
  onPick?: (partId: string) => void;
  selected?: string | null;
  knob?: number;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  
  const orbitRadius = 35;
  const earthRadius = 6;
  const sunRadius = 12;
  const tiltAngle = (23.5 * Math.PI) / 180; // 23.5 degrees

  const earthPivotRef = useRef<Group>(null);
  const earthRotationRef = useRef<Group>(null);

  const pick = (id: string) => (e: { stopPropagation: () => void }) => {
    if (!onPick) return;
    e.stopPropagation();
    onPick(id);
  };
  const hover = (id: string) => (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setHovered(id);
  };
  const unhover = () => setHovered(null);

  const seg = detail === "ultra" ? 64 : 32;

  // Sun
  const sunGeo = useMemo(() => new SphereGeometry(sunRadius, seg, seg), [seg, sunRadius]);

  // Earth
  const earthGeo = useMemo(() => new SphereGeometry(earthRadius, seg, seg), [seg, earthRadius]);

  // Equator
  const equatorGeo = useMemo(() => new RingGeometry(earthRadius + 0.1, earthRadius + 0.5, 64), [earthRadius]);

  // Axis
  const axisGeo = useMemo(() => {
    const geo = new CylinderGeometry(0.2, 0.2, earthRadius * 3, 8);
    return geo;
  }, [earthRadius]);

  // Orbit path
  const orbitPathGeo = useMemo(() => new RingGeometry(orbitRadius - 0.2, orbitRadius + 0.2, 128), [orbitRadius]);

  // Sunlight Rays (cylinder stretching from sun to earth)
  const raysGeo = useMemo(() => {
    const geo = new CylinderGeometry(sunRadius * 0.9, earthRadius * 1.5, orbitRadius, 16, 1, true);
    geo.rotateZ(Math.PI / 2);
    geo.translate(orbitRadius / 2, 0, 0);
    return geo;
  }, [sunRadius, earthRadius, orbitRadius]);

  useFrame(() => {
    if (earthPivotRef.current && earthRotationRef.current) {
      // Month goes from 1 to 12.
      // Month 1 (January): winter in northern hemisphere, Earth leans AWAY from sun.
      // Month 7 (July): summer in northern hemisphere, Earth leans TOWARD sun.
      // We map Month to an angle: Month 1 = 0 radians, Month 7 = PI radians, etc.
      // 12 months in a year -> each month is 2*PI / 12 = PI/6
      // But knob is continuous (e.g. 1.5), so we map linearly.
      // Month 1 maps to angle 0.
      const monthFloat = knob; 
      // Map 1..13 to 0..2PI (13 because 12 wraps back to 1)
      const angle = ((monthFloat - 1) / 12) * Math.PI * 2;
      
      earthPivotRef.current.position.set(Math.cos(angle) * orbitRadius, 0, Math.sin(angle) * orbitRadius);

      // We need the Earth's tilt to be fixed relative to the world, not relative to the sun.
      // The `earthPivotRef` is translating, but we do NOT rotate the pivot. So the child inherits world orientation.
      // The child `earthRotationRef` has a fixed rotation for the tilt.
      earthRotationRef.current.rotation.set(0, 0, tiltAngle); // tilted around Z axis

      // We can also spin the Earth around its own axis over time, but the seasons are about the orbit.
      // Let's add a slow spin just for effect.
      earthRotationRef.current.rotateY(0.01);
    }
  });

  const showOuter = layer === "whole";
  const showInner = layer === "cutaway";
  const showOptics = layer === "frame";

  return (
    <group>
      {/* The Sun */}
      {(showOuter || showInner || showOptics) && (
        <mesh 
          geometry={sunGeo} 
          onClick={pick("sun")} onPointerOver={hover("sun")} onPointerOut={unhover}
        >
          <meshBasicMaterial
            color="#ffcf4d" // bright yellow-orange
            transparent={!!selected && selected !== "sun"}
            opacity={(!!selected && selected !== "sun") ? 0.3 : 1}
          />
        </mesh>
      )}

      {/* The Orbit Path */}
      {(showInner || showOptics) && (
        <mesh geometry={orbitPathGeo} rotation={[-Math.PI/2, 0, 0]}>
          <meshBasicMaterial color="#ffffff" transparent opacity={0.2} side={DoubleSide} />
        </mesh>
      )}

      {/* Orbiting Group containing the Earth */}
      <group ref={earthPivotRef}>
        
        {/* Sunlight rays dynamically tracking from Sun to Earth */}
        {showOptics && (
          <group>
             {/* The rays actually need to point back at the sun. 
                 Since the earthPivotRef is translating, we can just lookAt the origin! */}
            <mesh 
              geometry={raysGeo} 
              onClick={pick("rays")} onPointerOver={hover("rays")} onPointerOut={unhover}
              onUpdate={self => self.lookAt(0, 0, 0)}
            >
              <meshBasicMaterial 
                color="#fff5b5" 
                transparent opacity={0.3} 
                side={DoubleSide} 
                depthWrite={false}
              />
            </mesh>
          </group>
        )}

        {/* Tilted Earth Group */}
        <group ref={earthRotationRef}>
          
          {/* Earth Sphere */}
          {(showOuter || showInner) && (
            <mesh 
              geometry={earthGeo} 
              onClick={pick("earth")} onPointerOver={hover("earth")} onPointerOut={unhover}
            >
              <LabTissueMaterial detail={detail} kind="water"
                color="#34719e" // Ocean blue
                roughness={0.6}
                {...highlight(selected === "earth", !!selected, hovered === "earth")}
              />
            </mesh>
          )}

          {/* Equator */}
          {(showInner || showOptics) && (
            <mesh 
              geometry={equatorGeo} 
              onClick={pick("equator")} onPointerOver={hover("equator")} onPointerOut={unhover}
              rotation={[-Math.PI/2, 0, 0]} // Ring lies flat relative to Earth's equator
            >
              <meshBasicMaterial
                color="#ffffff"
                side={DoubleSide}
                {...highlight(selected === "equator", !!selected, hovered === "equator")}
              />
            </mesh>
          )}

          {/* 23.5° Axis Line */}
          {showOptics && (
            <mesh 
              geometry={axisGeo} 
              onClick={pick("axis")} onPointerOver={hover("axis")} onPointerOut={unhover}
            >
              <meshBasicMaterial
                color="#ff3366" // Bright red line for visibility
                {...highlight(selected === "axis", !!selected, hovered === "axis")}
              />
            </mesh>
          )}

        </group>
      </group>
    </group>
  );
}
