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
  Loader2,
  Plus,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageTransition from "@/components/PageTransition";
import { useRooms, RoomMember, RoomMessage, RoomDeal, RoomEvent } from "@/hooks/useRooms";
import { formatDistanceToNow, format } from "date-fns";

// ── Feed Tab ────────────────────────────────────────────────────────────
const FeedTab = ({
  messages,
  onSend,
  isSaving,
}: {
  messages: RoomMessage[];
  onSend: (content: string) => Promise<void>;
  isSaving: boolean;
}) => {
  const [message, setMessage] = useState("");

  const handleSend = async () => {
    if (!message.trim() || isSaving) return;
    await onSend(message.trim());
    setMessage("");
  };

  const formatTime = (iso: string) => {
    try {
      return formatDistanceToNow(new Date(iso), { addSuffix: true });
    } catch {
      return "recently";
    }
  };

  return (
    <div className="space-y-3">
      {messages.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-3 text-muted-foreground/20" />
          <p className="text-sm font-medium text-foreground">No messages yet</p>
          <p className="text-xs mt-1">Start the conversation — share deal updates, analysis, or questions.</p>
        </div>
      ) : (
        messages
          .slice()
          .reverse()
          .map((item) => (
            <div key={item.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-foreground">{item.author}</span>
                  {item.verified && <ShieldCheck className="h-3 w-3 text-primary" />}
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">{formatTime(item.createdAt)}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.content}</p>
            </div>
          ))
      )}
      <div className="flex gap-2 mt-4">
        <input
          type="text"
          placeholder="Share an update with the room..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          className="flex-1 h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || isSaving}
          className="h-9 w-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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

const ActiveDealsTab = ({ deals, navigate }: { deals: RoomDeal[]; navigate: (path: string) => void }) => (
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
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded ${STAGE_COLORS[deal.stage] ?? "bg-muted text-muted-foreground"}`}
            >
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
const MembersTab = ({
  members,
  onInvite,
  isSaving,
}: {
  members: RoomMember[];
  onInvite: (name: string) => Promise<void>;
  isSaving: boolean;
}) => {
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");

  const handleInvite = async () => {
    if (!inviteName.trim()) return;
    await onInvite(inviteName.trim());
    setInviteName("");
    setShowInvite(false);
  };

  return (
    <div className="space-y-2">
      {members.map((member) => (
        <div key={member.id} className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-grape/10 flex items-center justify-center text-xs font-semibold text-grape">
              {member.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-foreground">{member.name}</p>
                {member.verified && <ShieldCheck className="h-3 w-3 text-primary" />}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[10px] text-muted-foreground capitalize">{member.role}</p>
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
          {member.role === "lead" && (
            <span className="text-[9px] font-medium uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              Lead
            </span>
          )}
        </div>
      ))}

      {showInvite ? (
        <div className="rounded-lg border border-primary/20 bg-primary/[0.02] p-4 space-y-3">
          <input
            type="text"
            placeholder="Contact name..."
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleInvite();
            }}
            className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowInvite(false);
                setInviteName("");
              }}
              className="h-8 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleInvite}
              disabled={!inviteName.trim() || isSaving}
              className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
              Invite
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowInvite(true)}
          className="w-full rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground hover:text-foreground hover:border-primary/20 transition-all flex items-center justify-center gap-2"
        >
          <UserPlus className="h-4 w-4" /> Invite Member
        </button>
      )}
    </div>
  );
};

// ── Events Tab ──────────────────────────────────────────────────────────
const EVENT_TYPE_LABELS: Record<RoomEvent["type"], string> = {
  ic_review: "IC Review",
  presentation: "Presentation",
  call: "Group Call",
  other: "Event",
};

const EventsTab = ({
  events,
  onSchedule,
  isSaving,
}: {
  events: RoomEvent[];
  onSchedule: (data: { title: string; date: string; type: RoomEvent["type"] }) => Promise<void>;
  isSaving: boolean;
}) => {
  const [showSchedule, setShowSchedule] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState<RoomEvent["type"]>("call");

  const handleSchedule = async () => {
    if (!title.trim() || !date) return;
    await onSchedule({ title: title.trim(), date, type });
    setTitle("");
    setDate("");
    setType("call");
    setShowSchedule(false);
  };

  return (
    <div className="space-y-3">
      {events.length > 0 ? (
        events.map((event) => (
          <div key={event.id} className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{event.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground">
                  {(() => {
                    try {
                      return format(new Date(event.date), "MMM d, yyyy");
                    } catch {
                      return event.date;
                    }
                  })()}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                  {EVENT_TYPE_LABELS[event.type]}
                </span>
              </div>
            </div>
            <Calendar className="h-4 w-4 text-muted-foreground/40" />
          </div>
        ))
      ) : !showSchedule ? (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="h-8 w-8 mx-auto mb-3 text-muted-foreground/20" />
          <p className="text-sm font-medium text-foreground">No upcoming events</p>
          <p className="text-xs mt-1">Schedule IC reviews, deal presentations, and group calls.</p>
        </div>
      ) : null}

      {showSchedule ? (
        <div className="rounded-lg border border-primary/20 bg-primary/[0.02] p-4 space-y-3">
          <input
            type="text"
            placeholder="Event title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as RoomEvent["type"])}
              className="h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="call">Group Call</option>
              <option value="ic_review">IC Review</option>
              <option value="presentation">Presentation</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowSchedule(false)}
              className="h-8 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSchedule}
              disabled={!title.trim() || !date || isSaving}
              className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
              Schedule
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowSchedule(true)}
          className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" /> Schedule Event
        </button>
      )}
    </div>
  );
};

// ── Main ────────────────────────────────────────────────────────────────
const RoomDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("feed");
  const { getRoomById, addMessage, addMember, addEvent, isLoading, isSaving } = useRooms();

  const room = id ? getRoomById(id) : undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate("/rooms")}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Rooms
        </button>
        <div className="rounded-lg border border-border bg-card p-16 text-center max-w-md mx-auto">
          <h2 className="text-lg font-semibold text-foreground">Room not found</h2>
          <p className="text-sm text-muted-foreground mt-1">
            This room may have been removed or you may not have access.
          </p>
          <button
            onClick={() => navigate("/rooms")}
            className="mt-5 h-9 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Go to Rooms
          </button>
        </div>
      </div>
    );
  }

  const verifiedMemberCount = room.members.filter((m) => m.verified).length;

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
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">{room.name}</h1>
              {room.isVerified && <ShieldCheck className="h-4 w-4 text-primary shrink-0" />}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              {room.isPrivate ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
              <span>{room.isPrivate ? "Private" : "Open"}</span>
              <span>·</span>
              <span>{room.members.length} members</span>
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
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Handshake className="h-3 w-3" /> {room.deals.length} active deals
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" /> {room.messages.length} updates
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" /> {verifiedMemberCount} verified members
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
            <FeedTab
              messages={room.messages}
              onSend={(content) => addMessage(room.id, content)}
              isSaving={isSaving}
            />
          </TabsContent>
          <TabsContent value="deals" className="mt-5">
            <ActiveDealsTab deals={room.deals} navigate={navigate} />
          </TabsContent>
          <TabsContent value="members" className="mt-5">
            <MembersTab
              members={room.members}
              onInvite={(name) => addMember(room.id, name)}
              isSaving={isSaving}
            />
          </TabsContent>
          <TabsContent value="events" className="mt-5">
            <EventsTab
              events={room.events}
              onSchedule={(data) => addEvent(room.id, data)}
              isSaving={isSaving}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
};

export default RoomDetail;
