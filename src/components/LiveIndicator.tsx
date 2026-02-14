import { motion } from "framer-motion";
import { Zap } from "lucide-react";

export const LiveIndicator = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 text-success border border-success/20 relative overflow-hidden"
  >
    {/* Shimmer sweep */}
    <div className="absolute inset-0 holo-shimmer opacity-50" />
    <div className="relative flex items-center gap-1.5">
      <div className="relative h-2 w-2">
        <motion.div
          className="absolute inset-0 rounded-full bg-success"
          animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 rounded-full bg-success" />
      </div>
      <span className="text-xs font-bold uppercase tracking-wider text-glow-intense">LIVE</span>
    </div>
  </motion.div>
);
