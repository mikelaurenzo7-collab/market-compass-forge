"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthContext";
import { Layout } from "@/components/Layout";
import Link from "next/link";

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
        <Link href="/login" className="text-slate-600">Sign in</Link>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Activity Feed</h1>
      <div className="bg-white rounded-lg border">
        {!events?.length && <p className="p-6 text-slate-600">No activity yet</p>}
        {events?.length > 0 && (
          <ul className="divide-y">
            {events.map((e: any) => (
              <li key={e.id} className="p-4 flex justify-between items-start">
                <div>
                  <p className="font-medium">{e.event_type?.replace(/_/g, " ")}</p>
                  {e.entity_type && (
                    <p className="text-sm text-slate-600">
                      {e.entity_type} {e.entity_id ? `#${e.entity_id.slice(0, 8)}` : ""}
                    </p>
                  )}
                  {e.metadata && Object.keys(e.metadata).length > 0 && (
                    <p className="text-xs text-slate-500 mt-1">{JSON.stringify(e.metadata)}</p>
                  )}
                </div>
                <span className="text-sm text-slate-500">{e.created_at ? new Date(e.created_at).toLocaleString() : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}
