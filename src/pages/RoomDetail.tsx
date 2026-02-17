import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  Handshake,
  MessageSquare,
  Calendar,
  Lock,
  Globe,
  Send,
  UserPlus,
  ShieldCheck,
  Star,
  ExternalLink,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageTransition from "@/components/PageTransition";

// ── Placeholder room data ───────────────────────────────────────────────
const ROOMS_DATA: Record<string, any> = {
  "room-1": {
    name: "Series B Syndicate",
    description: "Co-investment circle for late-stage B2B SaaS deals. Verified operators and repeat allocators only.",
    memberCount: 8,
    isPrivate: true,
    isVerified: true,
    trustScore: 94,
    members: [
      { id: "m1", name: "Alex Chen", role: "Lead", verified: true, dealCount: 12 },
      { id: "m2", name: "Sarah Kim", role: "Member", verified: true, dealCount: 8 },
      { id: "m3", name: "James Wright", role: "Member", verified: false, dealCount: 3 },
    ],
    deals: [
      { id: "d1", name: "Acme Corp", stage: "Diligencing", sector: "B2B SaaS" },
      { id: "d2", name: "DataFlow Inc", stage: "Soft Commit", sector: "Data Infrastructure" },
      { id: "d3", name: "CloudSecure", stage: "Interested", sector: "Cybersecurity" },
    ],
    feed: [
      { id: "f1", author: "Alex Chen", content: "Shared new term sheet for Acme Corp. Take a look at the updated cap table.", time: "2h ago", verified: true },
      { id: "f2", author: "Sarah Kim", content: "DataFlow IC deck updated — financials are solid. Ready for soft circle.", time: "5h ago", verified: true },
      { id: "f3", author: "James Wright", content: "Added CloudSecure to the pipeline. Early stage but the TAM thesis is compelling.", time: "1d ago", verified: false },
    ],
  },
  "room-2": {
    name: "Distressed Credit Club",
    description: "Sourcing and diligence for distressed debt opportunities. Institutional members with minimum AUM $50M.",
    memberCount: 12,
    isPrivate: true,
    isVerified: true,
    trustScore: 97,
    members: [
      { id: "m1", name: "Morgan Taylor", role: "Lead", verified: true, dealCount: 24 },
      { id: "m2", name: "Casey Brown", role: "Member", verified: true, dealCount: 15 },
    ],
    deals: [
      { id: "d1", name: "Retail Holdings LLC", stage: "Watching", sector: "Retail" },
    ],
    feed: [
      { id: "f1", author: "Morgan Taylor", content: "New distressed retail opportunity — 40% discount to NAV. Worth a deeper look.", time: "4h ago", verified: true },
    ],
  },
  "room-3": {
    name: "Climate Tech Scouts",
    description: "Early-stage climate and energy transition deal flow. Open to accredited investors with cleantech thesis.",
    memberCount: 6,
    isPrivate: false,
    isVerified: false,
    trustScore: 82,
    members: [
      { id: "m1", name: "Jordan Lee", role: "Lead", verified: true, dealCount: 6 },
    ],
    deals: [
      { id: "d1", name: "GreenGrid Energy", stage: "Interested", sector: "Clean Energy" },
      { id: "d2", name: "CarbonCapture Co", stage: "Watching", sector: "Climate Tech" },
    ],
    feed: [
      { id: "f1", author: "Jordan Lee", content: "GreenGrid raised $5M seed — worth a deeper look at unit economics.", time: "1d ago", verified: true },
    ],
  },
  "room-4": {
    name: "GP/LP Exchange",
    description: "Direct communication channel between GPs and their LP base. Fund updates, co-invest opportunities, and reporting.",
    memberCount: 24,
    isPrivate: true,
    isVerified: true,
    trustScore: 99,
    members: [
      { id: "m1", name: "Diana Mitchell", role: "Lead", verified: true, dealCount: 31 },
      { id: "m2", name: "Henry Roberts", role: "Member", verified: true, dealCount: 18 },
    ],
    deals: [
      { id: "d1", name: "Fund VII Co-Invest", stage: "Soft Commit", sector: "Multi-sector" },
    ],
    feed: [
      { id: "f1", author: "Diana Mitchell", content: "Fund VII co-invest opportunity — allocation closes Friday.", time: "30m ago", verified: true },
    ],
  },
  "room-5": {
    name: "Infrastructure Secondaries",
    description: "Secondary market opportunities in infrastructure and real assets. LP transfers and GP-led restructurings.",
    memberCount: 9,
    isPrivate: true,
    isVerified: true,
    trustScore: 91,
    members: [
      { id: "m1", name: "Paul Kim", role: "Lead", verified: true, dealCount: 14 },
      { id: "m2", name: "Rachel Wu", role: "Member", verified: true, dealCount: 9 },
    ],
    deals: [
      { id: "d1", name: "InfraCo LP Stake", stage: "Diligencing", sector: "Infrastructure" },
    ],
    feed: [
      { id: "f1", author: "Paul Kim", content: "InfraCo LP stake — diligence materials uploaded to data room.", time: "6h ago", verified: true },
    ],
  },
};

// ── Feed Tab ────────────────────────────────────────────────────────────
const FeedTab = ({ feed }: { feed: any[] }) => {
  const [message, setMessage] = useState("");
  const handleSend = () => {
    if (!message.trim()) return;
    toast.success("Message sent", { description: "Room messaging is in preview." });
    setMessage("");
  };
  return (
    <div className="space-y-3">
      {feed.map((item) => (
        <div key={item.id} className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-foreground">{item.author}</span>
              {item.verified && <ShieldCheck className="h-3 w-3 text-primary" />}
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">{item.time}</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{item.content}</p>
        </div>
      ))}
      <div className="flex gap-2 mt-4">
        <input
          type="text"
          placeholder="Share an update with the room..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
          className="flex-1 h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button onClick={handleSend} className="h-9 w-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// ── Active Deals Tab ────────────────────────────────────────────────────
const STAGE_COLORS: Record<string, string> = {
  Watching: "bg-muted/50 text-muted-foreground",
  Interested: "bg-primary/10 text-primary",
  Diligencing: "bg-warning/10 text-warning",
  "Soft Commit": "bg-chart-4/10 text-chart-4",
  Committed: "bg-success/10 text-success",
  Passed: "bg-destructive/10 text-destructive",
};

const ActiveDealsTab = ({ deals, navigate }: { deals: any[]; navigate: (path: string) => void }) => (
  <div className="space-y-2">
    {deals.length > 0 ? (
      deals.map((deal) => (
        <button
          key={deal.id}
          onClick={() => navigate("/deals/flow")}
          className="w-full text-left rounded-lg border border-border bg-card p-4 hover:border-primary/20 transition-all flex items-center justify-between group"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              {deal.name}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{deal.sector}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${STAGE_COLORS[deal.stage] ?? "bg-muted text-muted-foreground"}`}>
              {deal.stage}
            </span>
            <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>
      ))
    ) : (
      <div className="text-center py-8 text-muted-foreground">
        <Handshake className="h-6 w-6 mx-auto mb-2 text-muted-foreground/30" />
        <p className="text-sm font-medium">No active deals in this room</p>
        <p className="text-xs mt-1 text-muted-foreground/60">Deals shared to this room will appear here.</p>
      </div>
    )}
  </div>
);

// ── Members Tab ─────────────────────────────────────────────────────────
const MembersTab = ({ members }: { members: any[] }) => (
  <div className="space-y-2">
    {members.map((member) => (
      <div key={member.id} className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-grape/10 flex items-center justify-center text-xs font-semibold text-grape">
            {member.name.split(" ").map((n: string) => n[0]).join("")}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-foreground">{member.name}</p>
              {member.verified && <ShieldCheck className="h-3 w-3 text-primary" />}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[10px] text-muted-foreground">{member.role}</p>
              {member.dealCount > 0 && (
                <>
                  <span className="text-[10px] text-muted-foreground/30">·</span>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Handshake className="h-2.5 w-2.5" /> {member.dealCount} deals
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
        {member.role === "Lead" && (
          <span className="text-[9px] font-medium uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
            Lead
          </span>
        )}
      </div>
    ))}
    <button
      onClick={() => toast.info("Member invitations coming soon")}
      className="w-full rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground hover:text-foreground hover:border-primary/20 transition-all flex items-center justify-center gap-2"
    >
      <UserPlus className="h-4 w-4" /> Invite Member
    </button>
  </div>
);

// ── Events Tab ──────────────────────────────────────────────────────────
const EventsTab = () => (
  <div className="text-center py-12 text-muted-foreground">
    <Calendar className="h-8 w-8 mx-auto mb-3 text-muted-foreground/20" />
    <p className="text-sm font-medium text-foreground">No upcoming events</p>
    <p className="text-xs mt-1">Schedule IC reviews, deal presentations, and group calls.</p>
    <button
      onClick={() => toast.info("Scheduling coming soon", { description: "IC reviews, deal presentations, and group calls." })}
      className="mt-4 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
    >
      Schedule Event
    </button>
  </div>
);

// ── Main ────────────────────────────────────────────────────────────────
const RoomDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("feed");

  const room = id ? ROOMS_DATA[id] : null;

  if (!room) {
    return (
      <div className="p-6">
        <button onClick={() => navigate("/rooms")} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Rooms
        </button>
        <div className="rounded-lg border border-border bg-card p-16 text-center max-w-md mx-auto">
          <h2 className="text-lg font-semibold text-foreground">Room not found</h2>
          <p className="text-sm text-muted-foreground mt-1">This room may have been removed or you may not have access.</p>
          <button onClick={() => navigate("/rooms")} className="mt-5 h-9 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Go to Rooms
          </button>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="p-3 sm:p-6 space-y-4">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate("/rooms")}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Rooms
        </button>

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
                {room.name}
              </h1>
              {room.isVerified && (
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              {room.isPrivate ? (
                <Lock className="h-3 w-3" />
              ) : (
                <Globe className="h-3 w-3" />
              )}
              <span>{room.isPrivate ? "Private" : "Open"}</span>
              <span>·</span>
              <span>{room.memberCount} members</span>
              {room.trustScore >= 90 && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-0.5 text-success">
                    <Star className="h-3 w-3" /> {room.trustScore}% trust
                  </span>
                </>
              )}
            </div>
            {room.description && (
              <p className="text-xs text-muted-foreground mt-2 max-w-xl leading-relaxed">{room.description}</p>
            )}
          </div>
          <button
            onClick={() => toast.info("Invitations coming soon", { description: "You'll be able to invite verified contacts to this room." })}
            className="h-8 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-2"
          >
            <UserPlus className="h-3.5 w-3.5" /> Invite
          </button>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Handshake className="h-3 w-3" /> {room.deals.length} active deals
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" /> {room.feed.length} updates
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" /> {room.members.filter((m: any) => m.verified).length} verified members
          </span>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-auto p-0 gap-0">
            {[
              { value: "feed", label: "Feed", icon: MessageSquare },
              { value: "deals", label: "Active Deals", icon: Handshake },
              { value: "members", label: "Members", icon: Users },
              { value: "events", label: "Events", icon: Calendar },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium text-muted-foreground data-[state=active]:text-foreground hover:text-foreground transition-colors whitespace-nowrap"
              >
                <tab.icon className="h-3.5 w-3.5 mr-1.5 inline-block" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="feed" className="mt-5">
            <FeedTab feed={room.feed} />
          </TabsContent>
          <TabsContent value="deals" className="mt-5">
            <ActiveDealsTab deals={room.deals} navigate={navigate} />
          </TabsContent>
          <TabsContent value="members" className="mt-5">
            <MembersTab members={room.members} />
          </TabsContent>
          <TabsContent value="events" className="mt-5">
            <EventsTab />
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
};

export default RoomDetail;
