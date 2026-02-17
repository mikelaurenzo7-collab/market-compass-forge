import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Contact,
  computeRelationshipStrength,
  findWarmIntroPaths,
  inferSegment,
  getRelationshipHealth,
  type RelationshipEdge,
} from "@/lib/relationshipScoring";
import { toast } from "sonner";

export function useRelationshipIntel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ── Fetch relationship edges ─────────────────────────────────────
  const { data: edges = [] } = useQuery({
    queryKey: ["relationship-edges", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("relationship_edges")
        .select("*")
        .limit(500);
      if (error) throw error;
      return (data ?? []) as RelationshipEdge[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // ── Fetch key personnel as contacts ──────────────────────────────
  const { data: rawContacts = [], isLoading } = useQuery({
    queryKey: ["contacts-intel", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("key_personnel")
        .select("id, name, title, company_id, companies(name, sector)")
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // ── Fetch intro requests for success rate ────────────────────────
  const { data: introRequests = [] } = useQuery({
    queryKey: ["intro-requests-all", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intro_requests")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  // ── Derive enriched contacts ─────────────────────────────────────
  const contacts: Contact[] = rawContacts.map((person: any) => {
    const company = person.companies as { name?: string; sector?: string } | null;
    const personEdges = edges.filter(
      (e) => e.source_id === person.id || e.target_id === person.id,
    );
    const avgConfidence = personEdges.length > 0
      ? personEdges.reduce((sum, e) => sum + (e.confidence ?? 0.5), 0) / personEdges.length
      : 0.3;

    const personIntros = introRequests.filter((ir: any) => ir.entity_id === person.id);
    const acceptedIntros = personIntros.filter((ir: any) => ir.status === "accepted");
    const introRate = personIntros.length > 0 ? acceptedIntros.length / personIntros.length : 0;

    const strength = computeRelationshipStrength({
      interaction_count: personEdges.length,
      days_since_last_interaction: null, // Would come from activity events
      deal_overlap_count: Math.floor(personEdges.length / 2),
      intro_success_rate: introRate,
      is_verified: avgConfidence > 0.7,
      shared_room_count: 0,
    });

    const sectors: string[] = [];
    if (company?.sector) sectors.push(company.sector);

    return {
      id: person.id,
      name: person.name ?? "Unknown",
      title: person.title,
      firm: company?.name ?? null,
      sectors,
      relationship_strength: strength,
      last_interaction: null,
      interaction_count: personEdges.length,
      deal_overlap_count: Math.floor(personEdges.length / 2),
      intro_success_rate: introRate,
      is_verified: avgConfidence > 0.7,
      source: "deal_room" as const,
      tags: [inferSegment(person.title, company?.name)],
    };
  });

  // ── Find warm intro paths ────────────────────────────────────────
  const findIntroPaths = (targetId: string) => {
    if (!user) return [];
    const nodeNames: Record<string, { name: string; firm?: string | null }> = {};
    nodeNames[user.id] = { name: "You" };
    for (const c of contacts) {
      nodeNames[c.id] = { name: c.name, firm: c.firm };
    }
    return findWarmIntroPaths(user.id, targetId, edges, nodeNames);
  };

  // ── Request intro ────────────────────────────────────────────────
  const requestIntro = useMutation({
    mutationFn: async ({ contactId, contactName, message }: { contactId: string; contactName: string; message: string }) => {
      const { error } = await supabase.from("intro_requests").insert({
        user_id: user!.id,
        entity_type: "contact",
        entity_id: contactId,
        entity_name: contactName,
        message,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intro-requests-all", user?.id] });
      toast.success("Intro request submitted");
    },
    onError: () => toast.error("Failed to submit intro request"),
  });

  // ── Stats ────────────────────────────────────────────────────────
  const stats = {
    totalContacts: contacts.length,
    verifiedCount: contacts.filter((c) => c.is_verified).length,
    strongRelationships: contacts.filter((c) => c.relationship_strength >= 80).length,
    warmRelationships: contacts.filter((c) => c.relationship_strength >= 60 && c.relationship_strength < 80).length,
    coolingRelationships: contacts.filter((c) => c.relationship_strength >= 40 && c.relationship_strength < 60).length,
    atRiskCount: contacts.filter((c) => {
      const health = getRelationshipHealth(c.relationship_strength, null);
      return health === "cooling" || health === "cold" || health === "dormant";
    }).length,
    avgStrength: contacts.length > 0
      ? Math.round(contacts.reduce((sum, c) => sum + c.relationship_strength, 0) / contacts.length)
      : 0,
    pendingIntros: introRequests.filter((ir: any) => ir.status === "pending").length,
  };

  return {
    contacts,
    edges,
    isLoading,
    stats,
    findIntroPaths,
    requestIntro: requestIntro.mutate,
    isRequestingIntro: requestIntro.isPending,
  };
}
