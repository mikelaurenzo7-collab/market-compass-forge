import { motion } from "framer-motion";

export const LiveIndicator = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20"
  >
    <div className="flex items-center gap-1.5">
      <div className="h-2 w-2 rounded-full bg-primary" />
      <span className="text-xs font-bold uppercase tracking-wider">SYNCED</span>
    </div>
  </motion.div>
);
