"use client";

import { Canvas } from "@react-three/fiber";
import * as THREE from "three";

interface Chart3DProps {
  data: { quantile: string; irr: number }[];
  max?: number;
}

function Bars({ data, max }: { data: { quantile: string; irr: number }[]; max: number }) {
  const scale = max > 0 ? 2.5 / max : 1;
  const n = data.length;
  const startX = -((n - 1) * 0.3) / 2;
  return (
    <group position={[0, -1.2, 0]}>
      {data.map((d, i) => {
        const h = Math.max(0.08, Math.abs(d.irr) * scale);
        return (
          <mesh
            key={d.quantile}
            position={[startX + i * 0.3, h / 2, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.22, h, 0.22]} />
            <meshStandardMaterial
              color={d.irr >= 0 ? "#10b981" : "#ef4444"}
              roughness={0.7}
              metalness={0.3}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export function Chart3D({ data, max }: Chart3DProps) {
  const maxVal = max ?? Math.max(...data.map((d) => Math.abs(d.irr)), 1);

  if (data.length === 0) return null;

  return (
    <div className="w-full h-64 rounded-2xl overflow-hidden glass-card border border-white/10">
      <Canvas camera={{ position: [0, 0, 6], fov: 50 }} gl={{ alpha: true }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <pointLight position={[-5, 5, 5]} color="#06b6d4" intensity={0.3} />
        <group>
          <Bars data={data} max={maxVal} />
        </group>
      </Canvas>
    </div>
  );
}
