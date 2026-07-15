"use client";

import { useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Abstract, faceted stand-ins for pantry staples — not literal food models,
// just enough shape variety (ring, gem, berry, jar, root) to read as
// "kitchen" without needing sculpted assets. Colors are pulled straight
// from the site palette so the scene never looks like a bolted-on widget.
const SHAPES: {
  geometry: "icosahedron" | "torus" | "sphere" | "box" | "cone";
  color: string;
  position: [number, number, number];
  scale: number;
  speed: number;
  phase: number;
  rotSpeed: [number, number];
}[] = [
  { geometry: "icosahedron", color: "#b34a2f", position: [-3.4, 0.6, -0.5], scale: 0.62, speed: 0.6, phase: 0, rotSpeed: [0.15, 0.22] },
  { geometry: "torus", color: "#5c6b47", position: [-1.7, -0.9, 0.6], scale: 0.55, speed: 0.8, phase: 1.3, rotSpeed: [0.25, 0.1] },
  { geometry: "sphere", color: "#6b2417", position: [0.2, 1.1, -0.3], scale: 0.48, speed: 0.5, phase: 2.4, rotSpeed: [0.1, 0.18] },
  { geometry: "box", color: "#fffdf6", position: [1.9, -0.5, 0.9], scale: 0.58, speed: 0.7, phase: 0.7, rotSpeed: [0.12, 0.2] },
  { geometry: "cone", color: "#5c6b47", position: [3.3, 0.8, -0.8], scale: 0.5, speed: 0.65, phase: 3.1, rotSpeed: [0.2, 0.14] },
  { geometry: "icosahedron", color: "#d9cca9", position: [0.6, -1.3, -1.1], scale: 0.4, speed: 0.9, phase: 1.9, rotSpeed: [0.3, 0.25] },
];

function FloatingShape({
  geometry,
  color,
  position,
  scale,
  speed,
  phase,
  rotSpeed,
}: (typeof SHAPES)[number]) {
  const ref = useRef<THREE.Mesh>(null);
  const baseY = position[1];

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    mesh.position.y = baseY + Math.sin(t * speed + phase) * 0.25;
    mesh.rotation.x = t * rotSpeed[0];
    mesh.rotation.y = t * rotSpeed[1];
  });

  return (
    <mesh ref={ref} position={position} scale={scale}>
      {geometry === "icosahedron" && <icosahedronGeometry args={[1, 0]} />}
      {geometry === "torus" && <torusGeometry args={[0.75, 0.3, 8, 24]} />}
      {geometry === "sphere" && <sphereGeometry args={[1, 8, 6]} />}
      {geometry === "box" && <boxGeometry args={[1.3, 1.3, 1.3]} />}
      {geometry === "cone" && <coneGeometry args={[0.75, 1.6, 6]} />}
      <meshStandardMaterial color={color} roughness={1} metalness={0} flatShading />
    </mesh>
  );
}

const PARTICLE_COUNT = 160;

// Generated once at module load, not during render — Math.random() inside
// a component/hook body trips React's "components must be pure" rule.
function createDustField() {
  const pos = new Float32Array(PARTICLE_COUNT * 3);
  const spd = new Float32Array(PARTICLE_COUNT);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 11;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 6;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 4;
    spd[i] = 0.05 + Math.random() * 0.1;
  }
  return { pos, spd };
}

const DUST_FIELD = createDustField();

function Dust() {
  const ref = useRef<THREE.Points>(null);
  const { pos: positions, spd: speeds } = DUST_FIELD;

  useFrame(() => {
    const points = ref.current;
    if (!points) return;
    const attr = points.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      let y = attr.getY(i) + speeds[i] * 0.016;
      if (y > 3.2) y = -3.2;
      attr.setY(i, y);
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#d9cca9" size={0.035} transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

function Rig({ pointer }: { pointer: { current: { x: number; y: number } } }) {
  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.rotation.y += (pointer.current.x * 0.28 - g.rotation.y) * 0.04;
    g.rotation.x += (-pointer.current.y * 0.16 - g.rotation.x) * 0.04;
  });

  return (
    <group ref={group}>
      {SHAPES.map((shape, i) => (
        <FloatingShape key={i} {...shape} />
      ))}
    </group>
  );
}

export default function HeroScene() {
  const pointer = useRef({ x: 0, y: 0 });

  // Tracked on window rather than the canvas: the canvas sits under a
  // pointer-events-none wrapper so header links and hero CTAs stay
  // clickable through it, which also means it never receives its own
  // pointer events.
  useEffect(() => {
    function onMove(e: PointerEvent) {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    }
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ alpha: true, antialias: true }}
      camera={{ position: [0, 0, 7.5], fov: 42 }}
    >
      <ambientLight intensity={0.9} color="#fff2df" />
      <directionalLight position={[3, 4, 5]} intensity={0.8} color="#fff8ee" />
      <directionalLight position={[-4, -2, 2]} intensity={0.3} color="#e4e0c7" />
      <Dust />
      <Rig pointer={pointer} />
    </Canvas>
  );
}
