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
  Loader2,
} from "lucide-react";
import PageTransition from "@/components/PageTransition";
import EmptyState from "@/components/EmptyState";
import { useRooms, Room } from "@/hooks/useRooms";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";

// ── Create Room Dialog ──────────────────────────────────────────────────
const CreateRoomDialog = ({
  open,
  onClose,
  onCreate,
  isSaving,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; description: string; isPrivate: boolean }) => Promise<Room>;
  isSaving: boolean;
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    await onCreate({ name: name.trim(), description: description.trim(), isPrivate });
    setName("");
    setDescription("");
    setIsPrivate(true);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Room</DialogTitle>
          <DialogDescription>
            Create a high-trust deal room for sourcing, diligence, and coordination.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Room Name</label>
            <input
              type="text"
              placeholder="e.g. Series B Syndicate"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
            <textarea
              placeholder="Describe the room's focus and membership criteria..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPrivate(true)}
              className={`flex-1 h-9 rounded-md border text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                isPrivate
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Lock className="h-3.5 w-3.5" /> Private
            </button>
            <button
              onClick={() => setIsPrivate(false)}
              className={`flex-1 h-9 rounded-md border text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                !isPrivate
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Globe className="h-3.5 w-3.5" /> Open
            </button>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || isSaving}
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create Room
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ── Room Card ───────────────────────────────────────────────────────────
const RoomCard = ({ room, onClick }: { room: Room; onClick: () => void }) => {
  const memberInitials = room.members.slice(0, 3).map((m) =>
    m.name.split(" ").map((n) => n[0]).join("").toUpperCase()
  );

  const lastActivityLabel = (() => {
    try {
      return formatDistanceToNow(new Date(room.lastActivity), { addSuffix: true });
    } catch {
      return "recently";
    }
  })();

  return (
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
                {room.isPrivate ? "Private" : "Open"} · {room.members.length} members
              </span>
            </div>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">{room.description}</p>

      {/* Trust + Activity bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Handshake className="h-3 w-3" /> {room.deals.length} deals
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {lastActivityLabel}
          </span>
          {room.trustScore >= 90 && (
            <span className="flex items-center gap-1 text-success">
              <Star className="h-3 w-3" /> {room.trustScore}% trust
            </span>
          )}
        </div>

        {/* Member avatars */}
        <div className="flex -space-x-1.5">
          {memberInitials.map((initials, i) => (
            <div
              key={i}
              className="h-5 w-5 rounded-full bg-muted border border-card flex items-center justify-center text-[8px] font-semibold text-muted-foreground"
            >
              {initials}
            </div>
          ))}
          {room.members.length > 3 && (
            <div className="h-5 w-5 rounded-full bg-muted/50 border border-card flex items-center justify-center text-[8px] font-medium text-muted-foreground">
              +{room.members.length - 3}
            </div>
          )}
        </div>
      </div>

      {/* Recent deal signal */}
      {room.deals.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2">
          <TrendingUp className="h-3 w-3 text-primary/50 shrink-0" />
          <p className="text-[10px] text-muted-foreground truncate">
            Latest: <span className="text-foreground font-medium">{room.deals[room.deals.length - 1].name}</span>
          </p>
        </div>
      )}
    </button>
  );
};

// ── Main ────────────────────────────────────────────────────────────────
const Rooms = () => {
  const navigate = useNavigate();
  const { rooms, isLoading, isSaving, createRoom } = useRooms();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const filteredRooms = rooms.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const verifiedCount = rooms.filter((r) => r.isVerified).length;
  const totalDeals = rooms.reduce((sum, r) => sum + r.deals.length, 0);

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
            onClick={() => setShowCreate(true)}
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
          <span className="font-mono text-primary">{rooms.length}</span> rooms
          <span>·</span>
          <span>
            <span className="font-mono text-primary">{verifiedCount}</span> verified
          </span>
          <span>·</span>
          <span>
            <span className="font-mono text-primary">{totalDeals}</span> active deals
          </span>
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredRooms.length > 0 ? (
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
            onAction={() => setShowCreate(true)}
          />
        )}

        <CreateRoomDialog
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onCreate={createRoom}
          isSaving={isSaving}
        />
      </div>
    </PageTransition>
  );
};

export default Rooms;
