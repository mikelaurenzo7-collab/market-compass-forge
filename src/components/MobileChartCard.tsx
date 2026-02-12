import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from "recharts";

type ChartType = "bar" | "line";

interface MobileChartCardProps {
  title: string;
  metric: string;
  change?: string;
  data: any[];
  type?: ChartType;
  dataKeys?: { key: string; name: string; color: string }[];
}

export default function MobileChartCard({
  title,
  metric,
  change,
  data,
  type = "bar",
  dataKeys = [{ key: "value", name: "Value", color: "#hsl(270, 60%, 55%)" }],
}: MobileChartCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => setExpanded(true)}
        className="w-full text-left rounded-lg border border-border bg-card p-4 space-y-3 hover:border-primary/50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {change && (
            <span className="text-xs font-medium text-success flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {change}
            </span>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-xl font-mono font-bold text-foreground">{metric}</p>
        </div>

        {data.length > 0 && (
          <div className="h-32 -mx-4">
            <ResponsiveContainer width="100%" height="100%">
              {type === "bar" ? (
                <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  {dataKeys.map((dk) => (
                    <Bar key={dk.key} dataKey={dk.key} name={dk.name} fill={dk.color} isAnimationActive={false} />
                  ))}
                </BarChart>
              ) : (
                <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  {dataKeys.map((dk) => (
                    <Line key={dk.key} type="monotone" dataKey={dk.key} name={dk.name} stroke={dk.color} isAnimationActive={false} />
                  ))}
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">Tap to expand</p>
      </motion.button>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">{title}</p>
              <p className="text-2xl font-mono font-bold text-foreground">{metric}</p>
              {change && <p className="text-xs text-success mt-1">↑ {change}</p>}
            </div>

            {data.length > 0 && (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  {type === "bar" ? (
                    <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Legend />
                      {dataKeys.map((dk) => (
                        <Bar key={dk.key} dataKey={dk.key} name={dk.name} fill={dk.color} />
                      ))}
                    </BarChart>
                  ) : (
                    <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Legend />
                      {dataKeys.map((dk) => (
                        <Line key={dk.key} type="monotone" dataKey={dk.key} name={dk.name} stroke={dk.color} />
                      ))}
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
