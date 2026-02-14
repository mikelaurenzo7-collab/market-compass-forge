import { motion } from "framer-motion";
import { useMemo } from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showDot?: boolean;
  animated?: boolean;
  className?: string;
}

/**
 * Tiny inline sparkline chart for tables and cards.
 * Renders an SVG path with optional trailing dot and draw animation.
 */
export default function Sparkline({
  data,
  width = 80,
  height = 24,
  color = "hsl(var(--primary))",
  showDot = true,
  animated = true,
  className = "",
}: SparklineProps) {
  const { path, lastPoint, trend } = useMemo(() => {
    if (!data.length) return { path: "", lastPoint: { x: 0, y: 0 }, trend: "flat" as const };

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = 2;
    const w = width - padding * 2;
    const h = height - padding * 2;

    const points = data.map((v, i) => ({
      x: padding + (i / (data.length - 1)) * w,
      y: padding + h - ((v - min) / range) * h,
    }));

    // Smooth curve using cardinal spline
    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
    }

    const last = points[points.length - 1];
    const first = points[0];
    const trend = last.y < first.y ? "up" : last.y > first.y ? "down" : "flat";

    return { path: d, lastPoint: last, trend };
  }, [data, width, height]);

  if (!data.length) return null;

  const strokeColor = trend === "up" ? "hsl(var(--success))" : trend === "down" ? "hsl(var(--destructive))" : color;

  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={`spark-fill-${data.length}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity={0.15} />
          <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* Fill area */}
      <path
        d={`${path} L ${width - 2},${height} L 2,${height} Z`}
        fill={`url(#spark-fill-${data.length})`}
      />
      {/* Line */}
      <motion.path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={animated ? { pathLength: 0 } : undefined}
        animate={animated ? { pathLength: 1 } : undefined}
        transition={animated ? { duration: 1, ease: "easeOut" } : undefined}
      />
      {/* Trailing dot */}
      {showDot && (
        <motion.circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={2.5}
          fill={strokeColor}
          initial={animated ? { opacity: 0, scale: 0 } : undefined}
          animate={animated ? { opacity: 1, scale: 1 } : undefined}
          transition={animated ? { delay: 0.8, duration: 0.3 } : undefined}
        />
      )}
    </svg>
  );
}
