"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthContext";
import { Layout } from "@/components/Layout";
import Link from "next/link";
import { motion } from "framer-motion";
import { Activity as ActivityIcon } from "lucide-react";

export default function ActivityPage() {
  const { api, user } = useAuth();
  const { data: events } = useQuery({
    queryKey: ["audit-events"],
    queryFn: () => api.getAuditEvents(50),
    enabled: !!user,
  });

  if (!user) {
    return (
      <Layout>
        <Link href="/login" className="text-primary">Sign in</Link>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold text-foreground mb-2">Activity Feed</h1>
      <p className="text-muted-foreground mb-10">Audit events across your organization</p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card overflow-hidden"
      >
        {!events?.length && (
          <div className="p-16 text-center">
            <ActivityIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No activity yet</p>
          </div>
        )}
        {events && events.length > 0 && (
          <ul className="divide-y divide-white/10">
            {events.map((e: any, i: number) => (
              <motion.li
                key={e.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className="p-5 flex justify-between items-start hover:bg-white/[0.02] transition-colors"
              >
                <div>
                  <p className="font-medium text-foreground capitalize">{e.event_type?.replace(/_/g, " ")}</p>
                  {e.entity_type && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {e.entity_type} {e.entity_id ? `#${e.entity_id.slice(0, 8)}` : ""}
                    </p>
                  )}
                  {e.metadata && Object.keys(e.metadata).length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono">{JSON.stringify(e.metadata)}</p>
                  )}
                </div>
                <span className="text-sm text-muted-foreground shrink-0">{e.created_at ? new Date(e.created_at).toLocaleString() : ""}</span>
              </motion.li>
            ))}
          </ul>
        )}
      </motion.div>
    </Layout>
  );
}
