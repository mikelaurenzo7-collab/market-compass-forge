import { motion } from "framer-motion";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center relative overflow-hidden">
      {/* Ambient glow effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_40%,hsl(var(--primary)/0.08),transparent)]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.03] blur-3xl" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center gap-8 px-6"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="h-20 w-20 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20"
        >
          <span className="text-2xl font-bold text-primary-foreground tracking-tight">GV</span>
        </motion.div>

        {/* Company name */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground"
        >
          Grapevine
        </motion.h1>

        {/* Divider line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.6, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="w-16 h-px bg-primary/40"
        />

        {/* Coming Soon */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-lg sm:text-xl font-medium tracking-[0.25em] uppercase text-muted-foreground"
        >
          Coming Soon
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Landing;
