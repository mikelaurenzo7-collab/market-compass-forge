import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import TiltCard from "@/components/TiltCard";
import { motion } from "framer-motion";

interface MetricCardProps {
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "flat";
  subtitle?: React.ReactNode;
  index?: number;
}

const MetricCard = ({ label, value, change, trend = "flat", subtitle, index = 0 }: MetricCardProps) => {
  return (
    <TiltCard intensity={4} className="group">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
        className="glass-premium rounded-lg p-4 hover:glow-primary-intense transition-all duration-500 relative overflow-hidden"
      >
        {/* Subtle accent line at top */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: "linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.5) 50%, transparent 100%)",
          }}
        />

        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 font-medium">{label}</p>
        <div className="flex items-end justify-between gap-2">
          <motion.p
            className="text-2xl font-bold font-mono tracking-tight text-foreground tabular-nums"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.08 + 0.2, ease: "easeOut" }}
          >
            {value}
          </motion.p>
          {change && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.08 + 0.4 }}
              className={`flex items-center gap-0.5 text-xs font-mono px-1.5 py-0.5 rounded-md ${
                trend === "up"
                  ? "text-success bg-success/10"
                  : trend === "down"
                  ? "text-destructive bg-destructive/10"
                  : "text-muted-foreground bg-muted/50"
              }`}
            >
              {trend === "up" ? (
                <TrendingUp className="h-3 w-3" />
              ) : trend === "down" ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              {change}
            </motion.div>
          )}
        </div>
        {subtitle && <p className="text-[11px] text-muted-foreground/70 mt-1.5">{subtitle}</p>}
      </motion.div>
    </TiltCard>
  );
};

export default MetricCard;
