import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  Plus,
  Lock,
  Globe,
  MessageSquare,
  Handshake,
  Calendar,
  ArrowRight,
  Search,
} from "lucide-react";
import PageTransition from "@/components/PageTransition";
import EmptyState from "@/components/EmptyState";

// Placeholder rooms data — will be wired to Supabase when the rooms table exists
const PLACEHOLDER_ROOMS = [
  {
    id: "room-1",
    name: "Series B Syndicate",
    description: "Co-investment circle for late-stage B2B SaaS deals",
    memberCount: 8,
    activeDealCount: 3,
    isPrivate: true,
    lastActivity: "2h ago",
  },
  {
    id: "room-2",
    name: "Distressed Credit Club",
    description: "Sourcing and diligence for distressed debt opportunities",
    memberCount: 12,
    activeDealCount: 5,
    isPrivate: true,
    lastActivity: "4h ago",
  },
  {
    id: "room-3",
    name: "Climate Tech Scouts",
    description: "Early-stage climate and energy transition deal flow",
    memberCount: 6,
    activeDealCount: 2,
    isPrivate: false,
    lastActivity: "1d ago",
  },
];

const RoomCard = ({ room, onClick }: { room: typeof PLACEHOLDER_ROOMS[0]; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="w-full text-left rounded-lg border border-border bg-card p-5 hover:border-primary/30 hover:bg-primary/[0.02] transition-all group"
  >
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg bg-grape/10 flex items-center justify-center shrink-0">
          <Users className="h-4 w-4 text-grape" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
            {room.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            {room.isPrivate ? (
              <Lock className="h-3 w-3 text-muted-foreground" />
            ) : (
              <Globe className="h-3 w-3 text-muted-foreground" />
            )}
            <span className="text-[10px] text-muted-foreground">
              {room.isPrivate ? "Private" : "Open"}
            </span>
          </div>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
    </div>

    <p className="text-xs text-muted-foreground leading-relaxed mb-4">{room.description}</p>

    <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1">
        <Users className="h-3 w-3" /> {room.memberCount} members
      </span>
      <span className="flex items-center gap-1">
        <Handshake className="h-3 w-3" /> {room.activeDealCount} active deals
      </span>
      <span className="flex items-center gap-1">
        <MessageSquare className="h-3 w-3" /> {room.lastActivity}
      </span>
    </div>
  </button>
);

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
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-grape" /> Rooms
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              High-trust circles for deal sourcing and collaboration
            </p>
          </div>
          <button className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
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
            onAction={() => {}}
          />
        )}
      </div>
    </PageTransition>
  );
};

export default Rooms;
