import { motion, AnimatePresence } from "framer-motion";
import { ReactNode, useState } from "react";

interface AnimatedTabContentProps {
  activeKey: string;
  children: ReactNode;
}

/** Wraps tab content with a fade+slide micro-animation on switch */
export function AnimatedTabContent({ activeKey, children }: AnimatedTabContentProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeKey}
        initial={{ opacity: 0, x: 6 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -6 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
