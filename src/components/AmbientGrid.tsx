import { motion } from "framer-motion";

/**
 * Subtle animated dot-grid background overlay.
 * Place inside a relative container for ambient depth.
 */
export default function AmbientGrid() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle, hsl(var(--primary)) 0.5px, transparent 0.5px)",
          backgroundSize: "24px 24px",
        }}
      />
      {/* Slow-moving ambient glow */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full blur-[160px]"
        style={{ background: "hsl(var(--primary) / 0.04)" }}
        animate={{
          x: ["-10%", "60%", "20%", "-10%"],
          y: ["10%", "40%", "70%", "10%"],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full blur-[120px]"
        style={{ background: "hsl(var(--chart-2) / 0.03)" }}
        animate={{
          x: ["70%", "20%", "50%", "70%"],
          y: ["60%", "20%", "50%", "60%"],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
