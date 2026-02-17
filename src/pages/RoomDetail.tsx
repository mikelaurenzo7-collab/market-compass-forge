import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  Handshake,
  MessageSquare,
  Calendar,
  Lock,
  Plus,
  Send,
  UserPlus,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageTransition from "@/components/PageTransition";

// Placeholder room data — will be wired to Supabase when rooms table exists
const ROOMS_DATA: Record<string, any> = {
  "room-1": {
    name: "Series B Syndicate",
    description: "Co-investment circle for late-stage B2B SaaS deals",
    memberCount: 8,
    isPrivate: true,
    members: [
      { id: "m1", name: "Alex Chen", role: "Lead" },
      { id: "m2", name: "Sarah Kim", role: "Member" },
      { id: "m3", name: "James Wright", role: "Member" },
    ],
    deals: [
      { id: "d1", name: "Acme Corp", stage: "Due Diligence", sector: "B2B SaaS" },
      { id: "d2", name: "DataFlow Inc", stage: "IC Review", sector: "Data Infrastructure" },
      { id: "d3", name: "CloudSecure", stage: "Screening", sector: "Cybersecurity" },
    ],
    feed: [
      { id: "f1", author: "Alex Chen", content: "Shared new term sheet for Acme Corp. Take a look.", time: "2h ago" },
      { id: "f2", author: "Sarah Kim", content: "DataFlow IC deck updated — financials look solid.", time: "5h ago" },
      { id: "f3", author: "James Wright", content: "Added CloudSecure to the pipeline. Early stage but promising TAM.", time: "1d ago" },
    ],
  },
  "room-2": {
    name: "Distressed Credit Club",
    description: "Sourcing and diligence for distressed debt opportunities",
    memberCount: 12,
    isPrivate: true,
    members: [
      { id: "m1", name: "Morgan Taylor", role: "Lead" },
      { id: "m2", name: "Casey Brown", role: "Member" },
    ],
    deals: [
      { id: "d1", name: "Retail Holdings LLC", stage: "Sourced", sector: "Retail" },
    ],
    feed: [
      { id: "f1", author: "Morgan Taylor", content: "New distressed retail opportunity — 40% discount to NAV.", time: "4h ago" },
    ],
  },
  "room-3": {
    name: "Climate Tech Scouts",
    description: "Early-stage climate and energy transition deal flow",
    memberCount: 6,
    isPrivate: false,
    members: [
      { id: "m1", name: "Jordan Lee", role: "Lead" },
    ],
    deals: [
      { id: "d1", name: "GreenGrid Energy", stage: "Screening", sector: "Clean Energy" },
      { id: "d2", name: "CarbonCapture Co", stage: "Sourced", sector: "Climate Tech" },
    ],
    feed: [
      { id: "f1", author: "Jordan Lee", content: "GreenGrid raised $5M seed — worth a deeper look.", time: "1d ago" },
    ],
  },
};

const FeedTab = ({ feed }: { feed: any[] }) => (
  <div className="space-y-3">
    {feed.map((item) => (
      <div key={item.id} className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">{item.author}</span>
          <span className="text-[10px] text-muted-foreground">{item.time}</span>
        </div>
        <p className="text-sm text-muted-foreground">{item.content}</p>
      </div>
    ))}
    <div className="flex gap-2 mt-4">
      <input
        type="text"
        placeholder="Share an update..."
        className="flex-1 h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <button className="h-9 w-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors">
        <Send className="h-4 w-4" />
      </button>
    </div>
  </div>
);

const ActiveDealsTab = ({ deals, navigate }: { deals: any[]; navigate: (path: string) => void }) => (
  <div className="space-y-2">
    {deals.length > 0 ? (
      deals.map((deal) => (
        <button
          key={deal.id}
          onClick={() => navigate("/deals/flow")}
          className="w-full text-left rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors flex items-center justify-between group"
        >
          <div>
            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              {deal.name}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{deal.sector}</p>
          </div>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-primary/10 text-primary">
            {deal.stage}
          </span>
        </button>
      ))
    ) : (
      <div className="text-center py-8 text-muted-foreground">
        <Handshake className="h-6 w-6 mx-auto mb-2 text-muted-foreground/40" />
        <p className="text-sm">No active deals in this room</p>
      </div>
    )}
  </div>
);

const MembersTab = ({ members }: { members: any[] }) => (
  <div className="space-y-2">
    {members.map((member) => (
      <div key={member.id} className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-grape/10 flex items-center justify-center text-xs font-semibold text-grape">
            {member.name.split(" ").map((n: string) => n[0]).join("")}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{member.name}</p>
            <p className="text-[10px] text-muted-foreground">{member.role}</p>
          </div>
        </div>
      </div>
    ))}
    <button className="w-full rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors flex items-center justify-center gap-2">
      <UserPlus className="h-4 w-4" /> Invite Member
    </button>
  </div>
);

const EventsTab = () => (
  <div className="text-center py-12 text-muted-foreground">
    <Calendar className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
    <p className="text-sm font-medium">No upcoming events</p>
    <p className="text-xs mt-1">Schedule IC reviews, deal presentations, and group calls.</p>
    <button className="mt-4 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
      Schedule Event
    </button>
  </div>
);

const RoomDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("feed");

  const room = id ? ROOMS_DATA[id] : null;

  if (!room) {
    return (
      <div className="p-6">
        <button onClick={() => navigate("/rooms")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Rooms
        </button>
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <h2 className="text-lg font-semibold text-foreground">Room not found</h2>
          <p className="text-sm text-muted-foreground mt-1">This room may have been removed or you may not have access.</p>
          <button onClick={() => navigate("/rooms")} className="mt-4 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Go to Rooms
          </button>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="p-3 sm:p-6 space-y-4">
        {/* Breadcrumb + Header */}
        <div>
          <button
            onClick={() => navigate("/rooms")}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Rooms
          </button>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-grape" />
                {room.name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Lock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {room.isPrivate ? "Private" : "Open"} · {room.memberCount} members
                </span>
              </div>
              {room.description && (
                <p className="text-sm text-muted-foreground mt-1">{room.description}</p>
              )}
            </div>
            <button className="h-9 px-3 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-2">
              <UserPlus className="h-4 w-4" /> Invite
            </button>
          </div>
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
                className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground hover:text-foreground transition-colors"
              >
                <tab.icon className="h-3.5 w-3.5 mr-1.5 inline-block" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="feed" className="mt-4">
            <FeedTab feed={room.feed} />
          </TabsContent>
          <TabsContent value="deals" className="mt-4">
            <ActiveDealsTab deals={room.deals} navigate={navigate} />
          </TabsContent>
          <TabsContent value="members" className="mt-4">
            <MembersTab members={room.members} />
          </TabsContent>
          <TabsContent value="events" className="mt-4">
            <EventsTab />
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
};

export default RoomDetail;
