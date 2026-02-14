import { motion } from "framer-motion";
import { useMemo } from "react";

/**
 * Cinematic ambient background with floating particles, aurora gradients,
 * and layered depth. Creates an immersive "control room" atmosphere.
 */

const Particle = ({ delay, x, y, size, duration }: { delay: number; x: string; y: string; size: number; duration: number }) => (
  <motion.div
    className="absolute rounded-full"
    style={{
      width: size,
      height: size,
      left: x,
      top: y,
      background: `radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)`,
    }}
    animate={{
      y: [0, -30, 10, -20, 0],
      x: [0, 15, -10, 5, 0],
      opacity: [0, 0.6, 0.3, 0.8, 0],
      scale: [0.8, 1.2, 1, 1.1, 0.8],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

export default function AmbientGrid() {
  const particles = useMemo(() => 
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      delay: i * 0.7,
      x: `${(i * 17 + 5) % 95}%`,
      y: `${(i * 23 + 10) % 90}%`,
      size: 2 + (i % 4) * 1.5,
      duration: 8 + (i % 5) * 3,
    })),
  []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Fine dot grid with reduced opacity */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "radial-gradient(circle, hsl(var(--primary)) 0.4px, transparent 0.4px)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* Aurora layers */}
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full"
        style={{
          background: "radial-gradient(ellipse, hsl(var(--primary) / 0.05) 0%, transparent 70%)",
          filter: "blur(80px)",
          left: "-10%",
          top: "-20%",
        }}
        animate={{
          x: [0, 200, 100, 0],
          y: [0, 100, 200, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          background: "radial-gradient(ellipse, hsl(var(--chart-2) / 0.04) 0%, transparent 70%)",
          filter: "blur(100px)",
          right: "-5%",
          top: "30%",
        }}
        animate={{
          x: [0, -150, -50, 0],
          y: [0, -80, 100, 0],
          scale: [1, 0.85, 1.15, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          background: "radial-gradient(ellipse, hsl(var(--chart-4) / 0.03) 0%, transparent 70%)",
          filter: "blur(120px)",
          left: "40%",
          bottom: "-10%",
        }}
        animate={{
          x: [0, 100, -80, 0],
          y: [0, -120, -40, 0],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating particles */}
      {particles.map((p) => (
        <Particle key={p.id} {...p} />
      ))}

      {/* Top edge light leak */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.1) 30%, hsl(var(--primary) / 0.2) 50%, hsl(var(--primary) / 0.1) 70%, transparent 100%)",
        }}
      />
    </div>
  );
}
