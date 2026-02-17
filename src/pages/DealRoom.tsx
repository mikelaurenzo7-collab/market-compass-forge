import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft,
  FileText,
  MessageSquare,
  Clock,
  DollarSign,
  Bell,
  Upload,
  Building2,
  Briefcase,
  TrendingUp,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import PageTransition from "@/components/PageTransition";
import { format } from "date-fns";
import { DealComments, DecisionLog } from "@/components/DealCollaboration";
import SharedNotes from "@/components/SharedNotes";
import PipelineTasks from "@/components/PipelineTasks";

const STAGE_LABELS: Record<string, string> = {
  sourced: "Sourced",
  screening: "Screening",
  due_diligence: "Due Diligence",
  ic_review: "IC Review",
  committed: "Committed",
  passed: "Passed",
};

const STAGE_COLORS: Record<string, string> = {
  sourced: "bg-muted-foreground/20 text-muted-foreground",
  screening: "bg-primary/15 text-primary",
  due_diligence: "bg-warning/15 text-warning",
  ic_review: "bg-chart-4/15 text-chart-4",
  committed: "bg-success/15 text-success",
  passed: "bg-destructive/15 text-destructive",
};

const useDealRoom = (dealId: string | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["deal-room", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_pipeline")
        .select("*, companies(id, name, sector, stage, founded_year, hq_location, description, employee_count, total_funding, latest_valuation)")
        .eq("id", dealId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!dealId && !!user,
  });
};

const useDealTimeline = (dealId: string | undefined) => {
  return useQuery({
    queryKey: ["deal-timeline", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decision_journal")
        .select("*")
        .eq("deal_id", dealId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!dealId,
  });
};

// Summary Tab
const SummaryTab = ({ deal }: { deal: any }) => {
  const company = deal.companies;
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Company Overview */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{company?.name ?? "Unknown Company"}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {[company?.sector, company?.hq_location].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
          {company?.id && (
            <button
              onClick={() => navigate(`/companies/${company.id}`)}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              Full Profile <ExternalLink className="h-3 w-3" />
            </button>
          )}
        </div>

        {company?.description && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">{company.description}</p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MiniStat label="Stage" value={company?.stage ?? "—"} />
          <MiniStat label="Founded" value={company?.founded_year ?? "—"} />
          <MiniStat label="Employees" value={company?.employee_count ? company.employee_count.toLocaleString() : "—"} />
          <MiniStat label="Total Funding" value={company?.total_funding ? formatValuation(company.total_funding) : "—"} />
        </div>
      </div>

      {/* Deal Status */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Deal Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MiniStat
            label="Pipeline Stage"
            value={STAGE_LABELS[deal.stage] ?? deal.stage}
            badge
            badgeClass={STAGE_COLORS[deal.stage]}
          />
          <MiniStat label="Priority" value={deal.priority ?? "Normal"} />
          <MiniStat label="Added" value={deal.created_at ? format(new Date(deal.created_at), "MMM d, yyyy") : "—"} />
          <MiniStat label="Last Updated" value={deal.updated_at ? format(new Date(deal.updated_at), "MMM d, yyyy") : "—"} />
        </div>
        {deal.notes && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
            <p className="text-sm text-foreground">{deal.notes}</p>
          </div>
        )}
      </div>

      {/* Valuation Snapshot */}
      {company?.latest_valuation && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" /> Valuation
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <MiniStat label="Latest Valuation" value={formatValuation(company.latest_valuation)} />
            <MiniStat label="Total Funding" value={company.total_funding ? formatValuation(company.total_funding) : "—"} />
          </div>
          <div className="mt-3">
            <button
              onClick={() => navigate("/valuations")}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Open Valuation Toolkit <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Tasks */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Tasks</h3>
        <PipelineTasks dealId={deal.id} />
      </div>
    </div>
  );
};

// Data Room Tab
const DataRoomTab = ({ dealId, companyName }: { dealId: string; companyName: string }) => (
  <div className="space-y-4">
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" /> Data Room
        </h3>
        <button
          onClick={() => window.location.href = "/data-room"}
          className="text-xs text-primary hover:underline"
        >
          Open Full Data Room
        </button>
      </div>
      <div className="text-center py-12 text-muted-foreground">
        <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-sm font-medium">Deal documents for {companyName}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Upload term sheets, financials, legal docs, and diligence materials.
        </p>
        <button className="mt-4 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          Upload Documents
        </button>
      </div>
    </div>
  </div>
);

// Discussion Tab
const DiscussionTab = ({ dealId }: { dealId: string }) => (
  <div className="space-y-4">
    <div className="rounded-lg border border-border bg-card">
      <div className="px-5 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" /> Discussion
        </h3>
      </div>
      <div className="p-4">
        <DealComments dealId={dealId} />
      </div>
    </div>
    <div className="rounded-lg border border-border bg-card">
      <div className="px-5 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Shared Notes</h3>
      </div>
      <div className="p-4">
        <SharedNotes entityType="deal" entityId={dealId} />
      </div>
    </div>
  </div>
);

// Timeline Tab
const TimelineTab = ({ dealId }: { dealId: string }) => {
  const { data: timeline, isLoading } = useDealTimeline(dealId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-4 w-48 mb-1" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="px-5 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Timeline
        </h3>
      </div>
      {timeline && timeline.length > 0 ? (
        <div className="p-4">
          <div className="relative space-y-4">
            <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
            {timeline.map((entry: any) => (
              <div key={entry.id} className="relative flex gap-4 pl-2">
                <div className="relative z-10 h-5 w-5 rounded-full bg-card border-2 border-primary/40 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium capitalize">{entry.decision_type?.replace("_", " ")}</span>
                    {entry.from_state && entry.to_state && (
                      <span className="text-muted-foreground">
                        {" "}{STAGE_LABELS[entry.from_state] ?? entry.from_state} → {STAGE_LABELS[entry.to_state] ?? entry.to_state}
                      </span>
                    )}
                  </p>
                  {entry.rationale && (
                    <p className="text-xs text-muted-foreground mt-0.5">{entry.rationale}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {entry.created_at && format(new Date(entry.created_at), "MMM d, yyyy · h:mm a")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-muted-foreground">
          <Clock className="h-6 w-6 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm">No timeline events yet</p>
          <p className="text-xs mt-1">Activity and decisions will be tracked here.</p>
        </div>
      )}
    </div>
  );
};

// Allocation Tab
const AllocationTab = ({ deal }: { deal: any }) => {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-primary" /> Allocation
        </h3>
        <div className="text-center py-8">
          <Briefcase className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Manage allocation for {deal.companies?.name ?? "this deal"}.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Set target allocation, track commitments, and link to portfolio positions.
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={() => navigate("/portfolio")}
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              View Portfolio
            </button>
          </div>
        </div>
      </div>

      {/* Decision Log */}
      <div className="rounded-lg border border-border bg-card">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Decision Log</h3>
        </div>
        <div className="p-4">
          <DecisionLog dealId={deal.id} />
        </div>
      </div>
    </div>
  );
};

// Updates Tab
const UpdatesTab = ({ deal }: { deal: any }) => (
  <div className="rounded-lg border border-border bg-card p-5">
    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
      <Bell className="h-4 w-4 text-primary" /> Updates
    </h3>
    <div className="text-center py-8">
      <Bell className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">
        Deal updates and notifications for {deal.companies?.name ?? "this deal"}.
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        Track funding rounds, news mentions, filings, and status changes.
      </p>
    </div>
  </div>
);

// Main Deal Room Page
const DealRoom = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: deal, isLoading, error } = useDealRoom(id);
  const [activeTab, setActiveTab] = useState("summary");

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="p-6">
        <button onClick={() => navigate("/deals")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Deals
        </button>
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <h2 className="text-lg font-semibold text-foreground">Deal not found</h2>
          <p className="text-sm text-muted-foreground mt-1">This deal may have been removed or you may not have access.</p>
          <button
            onClick={() => navigate("/deals")}
            className="mt-4 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Go to Deals
          </button>
        </div>
      </div>
    );
  }

  const companyName = deal.companies?.name ?? "Unknown";

  return (
    <PageTransition>
      <div className="p-3 sm:p-6 space-y-4">
        {/* Breadcrumb + Header */}
        <div>
          <button
            onClick={() => navigate("/deals")}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Deals
          </button>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {companyName}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${STAGE_COLORS[deal.stage] ?? "bg-muted text-muted-foreground"}`}>
                  {STAGE_LABELS[deal.stage] ?? deal.stage}
                </span>
                {deal.companies?.sector && (
                  <span className="text-xs text-muted-foreground">{deal.companies.sector}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-auto p-0 gap-0">
            {[
              { value: "summary", label: "Summary", icon: FileText },
              { value: "data-room", label: "Data Room", icon: Upload },
              { value: "discussion", label: "Discussion", icon: MessageSquare },
              { value: "timeline", label: "Timeline", icon: Clock },
              { value: "allocation", label: "Allocation", icon: DollarSign },
              { value: "updates", label: "Updates", icon: Bell },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground hover:text-foreground transition-colors"
              >
                <tab.icon className="h-3.5 w-3.5 mr-1.5 inline-block" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="summary" className="mt-4">
            <SummaryTab deal={deal} />
          </TabsContent>
          <TabsContent value="data-room" className="mt-4">
            <DataRoomTab dealId={deal.id} companyName={companyName} />
          </TabsContent>
          <TabsContent value="discussion" className="mt-4">
            <DiscussionTab dealId={deal.id} />
          </TabsContent>
          <TabsContent value="timeline" className="mt-4">
            <TimelineTab dealId={deal.id} />
          </TabsContent>
          <TabsContent value="allocation" className="mt-4">
            <AllocationTab deal={deal} />
          </TabsContent>
          <TabsContent value="updates" className="mt-4">
            <UpdatesTab deal={deal} />
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
};

function MiniStat({ label, value, badge, badgeClass }: {
  label: string;
  value: string | number;
  badge?: boolean;
  badgeClass?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
      {badge ? (
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${badgeClass ?? "bg-muted text-muted-foreground"}`}>
          {value}
        </span>
      ) : (
        <p className="text-sm font-medium text-foreground">{value}</p>
      )}
    </div>
  );
}

function formatValuation(val: number): string {
  if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  if (Math.abs(val) >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

export default DealRoom;
