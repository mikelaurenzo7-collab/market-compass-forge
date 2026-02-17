import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ResearchThread = {
  id: string;
  user_id: string;
  title: string;
  company_id: string | null;
  deal_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ResearchMessage = {
  id: string;
  thread_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export function useResearchThreads(companyId?: string, dealId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["research-threads", user?.id, companyId, dealId],
    queryFn: async () => {
      let q = supabase
        .from("research_threads")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false })
        .limit(50);
      if (companyId) q = q.eq("company_id", companyId);
      if (dealId) q = q.eq("deal_id", dealId);
      const { data, error } = await q;
      if (error) throw error;
      return data as ResearchThread[];
    },
    enabled: !!user,
  });
}

export function useResearchMessages(threadId: string | null) {
  return useQuery({
    queryKey: ["research-messages", threadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("research_messages")
        .select("*")
        .eq("thread_id", threadId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ResearchMessage[];
    },
    enabled: !!threadId,
  });
}

export function useCreateThread() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { title: string; company_id?: string; deal_id?: string }) => {
      const { data, error } = await supabase
        .from("research_threads")
        .insert({
          user_id: user!.id,
          title: params.title,
          company_id: params.company_id ?? null,
          deal_id: params.deal_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ResearchThread;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["research-threads"] }),
  });
}

export function useSaveMessage() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (params: { thread_id: string; role: "user" | "assistant"; content: string }) => {
      const { error } = await supabase.from("research_messages").insert({
        thread_id: params.thread_id,
        user_id: user!.id,
        role: params.role,
        content: params.content,
      });
      if (error) throw error;
      // Touch thread updated_at
      await supabase
        .from("research_threads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", params.thread_id);
    },
  });
}

export function useUpdateThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; title?: string; company_id?: string | null; deal_id?: string | null }) => {
      const updates: Record<string, any> = {};
      if (params.title !== undefined) updates.title = params.title;
      if (params.company_id !== undefined) updates.company_id = params.company_id;
      if (params.deal_id !== undefined) updates.deal_id = params.deal_id;
      const { error } = await supabase
        .from("research_threads")
        .update(updates)
        .eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["research-threads"] }),
  });
}

export function useDeleteThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("research_threads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["research-threads"] }),
  });
}

export type SearchResearchResult = {
  threads: ResearchThread[];
  messages: (ResearchMessage & { research_threads: { id: string; title: string; company_id: string | null } })[];
};

export function useSearchResearch(query: string) {
  const { user } = useAuth();
  return useQuery<SearchResearchResult>({
    queryKey: ["research-search", query],
    queryFn: async () => {
      const tsq = query.split(/\s+/).filter(Boolean).join(" & ");
      // Search threads
      const { data: threads } = await supabase
        .from("research_threads")
        .select("*")
        .eq("user_id", user!.id)
        .textSearch("search_vector", tsq)
        .limit(10);
      // Search messages
      const { data: messages } = await supabase
        .from("research_messages")
        .select("*, research_threads!inner(id, title, company_id)")
        .eq("user_id", user!.id)
        .textSearch("search_vector", tsq)
        .limit(20);
      return {
        threads: (threads ?? []) as ResearchThread[],
        messages: (messages ?? []) as (ResearchMessage & { research_threads: { id: string; title: string; company_id: string | null } })[],
      };
    },
    enabled: !!user && query.length >= 2,
    staleTime: 15_000,
  });
}
