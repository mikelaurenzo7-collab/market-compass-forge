import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  Plus,
  Lock,
  Globe,
  Handshake,
  ArrowRight,
  Search,
  ShieldCheck,
  Star,
  Clock,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import EmptyState from "@/components/EmptyState";

// ── Placeholder rooms data ──────────────────────────────────────────────
const PLACEHOLDER_ROOMS = [
  {
    id: "room-1",
    name: "Series B Syndicate",
    description: "Co-investment circle for late-stage B2B SaaS deals. Verified operators and repeat allocators only.",
    memberCount: 8,
    activeDealCount: 3,
    isPrivate: true,
    isVerified: true,
    trustScore: 94,
    lastActivity: "2h ago",
    topMembers: ["AC", "SK", "JW"],
    recentDeal: "Acme Corp",
  },
  {
    id: "room-2",
    name: "Distressed Credit Club",
    description: "Sourcing and diligence for distressed debt opportunities. Institutional members with minimum AUM $50M.",
    memberCount: 12,
    activeDealCount: 5,
    isPrivate: true,
    isVerified: true,
    trustScore: 97,
    lastActivity: "4h ago",
    topMembers: ["MT", "CB", "RL"],
    recentDeal: "Retail Holdings LLC",
  },
  {
    id: "room-3",
    name: "Climate Tech Scouts",
    description: "Early-stage climate and energy transition deal flow. Open to accredited investors with cleantech thesis.",
    memberCount: 6,
    activeDealCount: 2,
    isPrivate: false,
    isVerified: false,
    trustScore: 82,
    lastActivity: "1d ago",
    topMembers: ["JL", "KP"],
    recentDeal: "GreenGrid Energy",
  },
  {
    id: "room-4",
    name: "GP/LP Exchange",
    description: "Direct communication channel between GPs and their LP base. Fund updates, co-invest opportunities, and reporting.",
    memberCount: 24,
    activeDealCount: 7,
    isPrivate: true,
    isVerified: true,
    trustScore: 99,
    lastActivity: "30m ago",
    topMembers: ["DM", "HR", "AS", "BN"],
    recentDeal: "Fund VII Co-Invest",
  },
  {
    id: "room-5",
    name: "Infrastructure Secondaries",
    description: "Secondary market opportunities in infrastructure and real assets. LP transfers and GP-led restructurings.",
    memberCount: 9,
    activeDealCount: 4,
    isPrivate: true,
    isVerified: true,
    trustScore: 91,
    lastActivity: "6h ago",
    topMembers: ["PK", "RW", "EM"],
    recentDeal: "InfraCo LP Stake",
  },
];

// ── Room Card ───────────────────────────────────────────────────────────
const RoomCard = ({ room, onClick }: { room: typeof PLACEHOLDER_ROOMS[0]; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="w-full text-left rounded-lg border border-border bg-card p-5 hover:border-primary/20 hover:bg-primary/[0.01] transition-all group"
  >
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-lg bg-grape/10 flex items-center justify-center shrink-0">
          <Users className="h-4 w-4 text-grape" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
              {room.name}
            </h3>
            {room.isVerified && (
              <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {room.isPrivate ? (
              <Lock className="h-2.5 w-2.5 text-muted-foreground" />
            ) : (
              <Globe className="h-2.5 w-2.5 text-muted-foreground" />
            )}
            <span className="text-[10px] text-muted-foreground">
              {room.isPrivate ? "Private" : "Open"} · {room.memberCount} members
            </span>
          </div>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
    </div>

    <p className="text-xs text-muted-foreground leading-relaxed mb-4">{room.description}</p>

    {/* Trust + Activity bar */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Handshake className="h-3 w-3" /> {room.activeDealCount} deals
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" /> {room.lastActivity}
        </span>
        {room.trustScore >= 90 && (
          <span className="flex items-center gap-1 text-success">
            <Star className="h-3 w-3" /> {room.trustScore}% trust
          </span>
        )}
      </div>

      {/* Member avatars */}
      <div className="flex -space-x-1.5">
        {room.topMembers.slice(0, 3).map((initials, i) => (
          <div
            key={i}
            className="h-5 w-5 rounded-full bg-muted border border-card flex items-center justify-center text-[8px] font-semibold text-muted-foreground"
          >
            {initials}
          </div>
        ))}
        {room.memberCount > 3 && (
          <div className="h-5 w-5 rounded-full bg-muted/50 border border-card flex items-center justify-center text-[8px] font-medium text-muted-foreground">
            +{room.memberCount - 3}
          </div>
        )}
      </div>
    </div>

    {/* Recent deal signal */}
    {room.recentDeal && (
      <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2">
        <TrendingUp className="h-3 w-3 text-primary/50 shrink-0" />
        <p className="text-[10px] text-muted-foreground truncate">
          Latest: <span className="text-foreground font-medium">{room.recentDeal}</span>
        </p>
      </div>
    )}
  </button>
);

// ── Main ────────────────────────────────────────────────────────────────
const Rooms = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRooms = PLACEHOLDER_ROOMS.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageTransition>
      <div className="p-3 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight flex items-center gap-2">
              Rooms
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              High-trust circles for deal sourcing, diligence, and coordination
            </p>
          </div>
          <button
            onClick={() => toast.info("Room creation coming soon", { description: "Invite-only deal rooms with trust scoring and verification." })}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Create Room
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-md border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="font-mono text-primary">{PLACEHOLDER_ROOMS.length}</span> rooms
          <span>·</span>
          <span>
            <span className="font-mono text-primary">
              {PLACEHOLDER_ROOMS.filter((r) => r.isVerified).length}
            </span> verified
          </span>
          <span>·</span>
          <span>
            <span className="font-mono text-primary">
              {PLACEHOLDER_ROOMS.reduce((sum, r) => sum + r.activeDealCount, 0)}
            </span> active deals
          </span>
        </div>

        {/* Room Grid */}
        {filteredRooms.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                onClick={() => navigate(`/rooms/${room.id}`)}
              />
            ))}
          </motion.div>
        ) : (
          <EmptyState
            icon={Users}
            title="No rooms found"
            description={searchQuery ? "Try a different search term." : "Create your first room to start collaborating on deals."}
            actionLabel="Create Room"
            onAction={() => toast.info("Room creation coming soon", { description: "Invite-only deal rooms with trust scoring and verification." })}
          />
        )}
      </div>
    </PageTransition>
  );
};

export default Rooms;
