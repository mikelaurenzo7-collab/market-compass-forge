import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const edges: {
      source_id: string;
      source_type: string;
      target_id: string;
      target_type: string;
      relationship_type: string;
      confidence: string;
    }[] = [];

    // 1. investor_company → invested_in edges
    const { data: investorCompanyLinks } = await supabase
      .from("investor_company")
      .select("investor_id, company_id");

    for (const link of investorCompanyLinks ?? []) {
      edges.push({
        source_id: link.investor_id,
        source_type: "investor",
        target_id: link.company_id,
        target_type: "company",
        relationship_type: "invested_in",
        confidence: "high",
      });
    }

    // 2. key_personnel → executive/board_member edges
    const { data: personnel } = await supabase
      .from("key_personnel")
      .select("id, company_id, title");

    for (const p of personnel ?? []) {
      const titleLower = (p.title ?? "").toLowerCase();
      const relType =
        titleLower.includes("board") || titleLower.includes("director")
          ? "board_member"
          : "executive";
      edges.push({
        source_id: p.id,
        source_type: "person",
        target_id: p.company_id,
        target_type: "company",
        relationship_type: relType,
        confidence: "high",
      });
    }

    // 3. fund_commitments → committed_to edges
    const { data: commitments } = await supabase
      .from("fund_commitments")
      .select("lp_id, fund_id");

    for (const c of commitments ?? []) {
      edges.push({
        source_id: c.lp_id,
        source_type: "lp",
        target_id: c.fund_id,
        target_type: "fund",
        relationship_type: "committed_to",
        confidence: "high",
      });
    }

    // 4. Co-investor discovery: investors sharing 2+ portfolio companies
    const investorMap = new Map<string, Set<string>>();
    for (const link of investorCompanyLinks ?? []) {
      if (!investorMap.has(link.investor_id)) {
        investorMap.set(link.investor_id, new Set());
      }
      investorMap.get(link.investor_id)!.add(link.company_id);
    }

    const investorIds = Array.from(investorMap.keys());
    for (let i = 0; i < investorIds.length; i++) {
      for (let j = i + 1; j < investorIds.length; j++) {
        const setA = investorMap.get(investorIds[i])!;
        const setB = investorMap.get(investorIds[j])!;
        let overlap = 0;
        for (const id of setA) {
          if (setB.has(id)) overlap++;
        }
        if (overlap >= 2) {
          edges.push({
            source_id: investorIds[i],
            source_type: "investor",
            target_id: investorIds[j],
            target_type: "investor",
            relationship_type: "co_investor",
            confidence: overlap >= 4 ? "high" : "medium",
          });
        }
      }
    }

    // Clear existing edges and insert fresh
    await supabase.from("relationship_edges").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Insert in batches of 500
    const batchSize = 500;
    let inserted = 0;
    for (let i = 0; i < edges.length; i += batchSize) {
      const batch = edges.slice(i, i + batchSize);
      const { error } = await supabase.from("relationship_edges").insert(batch);
      if (error) {
        console.error("Insert batch error:", error);
      } else {
        inserted += batch.length;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        edges_created: inserted,
        breakdown: {
          invested_in: edges.filter((e) => e.relationship_type === "invested_in").length,
          executive: edges.filter((e) => e.relationship_type === "executive").length,
          board_member: edges.filter((e) => e.relationship_type === "board_member").length,
          committed_to: edges.filter((e) => e.relationship_type === "committed_to").length,
          co_investor: edges.filter((e) => e.relationship_type === "co_investor").length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
