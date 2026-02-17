import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  ShieldCheck,
  Star,
  Handshake,
  Search,
  Send,
  UserPlus,
  Clock,
  GitBranch,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowRight,
  Filter,
  BarChart3,
  ChevronRight,
  Heart,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import RelationshipGraph from "@/components/RelationshipGraph";
import { useRelationshipIntel } from "@/hooks/useRelationshipIntel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import {
  getRelationshipHealth,
  HEALTH_COLORS,
  inferSegment,
  SEGMENT_LABELS,
  type Contact,
  type RelationshipHealth,
} from "@/lib/relationshipScoring";

type SortOption = "strength" | "name" | "interactions";

// ── Strength Bar ───────────────────────────────────────────────────────
const StrengthBar = ({ value }: { value: number }) => {
  const health = getRelationshipHealth(value, null);
  const colors = HEALTH_COLORS[health];
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colors.bg.replace("/10", "/60")}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={`text-[10px] font-mono font-medium ${colors.text}`}>{value}</span>
    </div>
  );
};

// ── Contact Card (Enhanced) ────────────────────────────────────────────
const ContactCard = ({
  contact,
  onRequestIntro,
  onViewPaths,
}: {
  contact: Contact;
  onRequestIntro: () => void;
  onViewPaths: () => void;
}) => {
  const health = getRelationshipHealth(contact.relationship_strength, null);
  const healthInfo = HEALTH_COLORS[health];
  const segment = contact.tags[0] ?? "other";
  const segmentInfo = SEGMENT_LABELS[segment as keyof typeof SEGMENT_LABELS] ?? SEGMENT_LABELS.other;

  return (
    <div className="rounded-lg border border-border bg-card p-4 hover:border-primary/20 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-grape/10 flex items-center justify-center text-sm font-semibold text-grape shrink-0">
            {contact.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-foreground truncate">{contact.name}</p>
              {contact.is_verified && <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {contact.title ?? "—"}{contact.firm ? ` · ${contact.firm}` : ""}
            </p>
          </div>
        </div>
        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${segmentInfo.bg} ${segmentInfo.color}`}>
          {segmentInfo.label}
        </span>
      </div>

      {/* Relationship Strength */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-muted-foreground">Relationship Strength</span>
          <span className={`text-[10px] font-medium ${healthInfo.text}`}>{healthInfo.label}</span>
        </div>
        <StrengthBar value={contact.relationship_strength} />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <GitBranch className="h-3 w-3" /> {contact.interaction_count} interactions
        </span>
        <span className="flex items-center gap-1">
          <Handshake className="h-3 w-3" /> {contact.deal_overlap_count} deals
        </span>
      </div>

      {/* Sectors */}
      {contact.sectors.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {contact.sectors.map((s) => (
            <span key={s} className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onRequestIntro}
          className="flex-1 h-7 rounded-md bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors flex items-center justify-center gap-1"
        >
          <Send className="h-3 w-3" /> Request Intro
        </button>
        <button
          onClick={onViewPaths}
          className="h-7 px-2 rounded-md border border-border text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1"
        >
          <GitBranch className="h-3 w-3" /> Paths
        </button>
      </div>
    </div>
  );
};

// ── Warm Intro Path Modal ──────────────────────────────────────────────
const IntroPathView = ({
  contact,
  paths,
  onClose,
  onRequestIntro,
}: {
  contact: Contact;
  paths: { hops: { id: string; name: string; firm?: string | null }[]; path_confidence: number }[];
  onClose: () => void;
  onRequestIntro: () => void;
}) => (
  <div className="rounded-lg border border-primary/20 bg-card p-5">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-primary" /> Warm Intro Paths to {contact.name}
      </h3>
      <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
    </div>
    {paths.length === 0 ? (
      <div className="text-center py-8">
        <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No warm intro paths found</p>
        <p className="text-xs text-muted-foreground mt-1">Try connecting with more people in {contact.firm ? `${contact.firm}'s` : "their"} network</p>
      </div>
    ) : (
      <div className="space-y-3">
        {paths.map((path, pi) => (
          <div key={pi} className="flex items-center gap-2 p-3 rounded-md bg-muted/20 border border-border/50 flex-wrap">
            {path.hops.map((hop, hi) => (
              <div key={hop.id} className="flex items-center gap-2">
                {hi > 0 && <ArrowRight className="h-3 w-3 text-primary/40" />}
                <span className={`text-xs font-medium ${hi === 0 ? "text-primary" : hi === path.hops.length - 1 ? "text-foreground" : "text-muted-foreground"}`}>
                  {hop.name}
                  {hop.firm && <span className="text-muted-foreground/50 ml-1 font-normal">({hop.firm})</span>}
                </span>
              </div>
            ))}
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">{path.path_confidence}% conf</span>
          </div>
        ))}
        <button
          onClick={onRequestIntro}
          className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          <Send className="h-4 w-4" /> Request Introduction
        </button>
      </div>
    )}
  </div>
);

// ── Network Health Dashboard ───────────────────────────────────────────
const NetworkHealthDashboard = ({ stats }: { stats: ReturnType<typeof useRelationshipIntel>["stats"] }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Users className="h-4 w-4" />
        <span className="text-[10px] font-medium uppercase tracking-wider">Contacts</span>
      </div>
      <p className="text-xl font-semibold font-mono text-foreground">{stats.totalContacts}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{stats.verifiedCount} verified</p>
    </div>
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Heart className="h-4 w-4" />
        <span className="text-[10px] font-medium uppercase tracking-wider">Strong</span>
      </div>
      <p className="text-xl font-semibold font-mono text-success">{stats.strongRelationships}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{stats.warmRelationships} warm</p>
    </div>
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-[10px] font-medium uppercase tracking-wider">At Risk</span>
      </div>
      <p className="text-xl font-semibold font-mono text-warning">{stats.atRiskCount}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">need attention</p>
    </div>
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <BarChart3 className="h-4 w-4" />
        <span className="text-[10px] font-medium uppercase tracking-wider">Avg Strength</span>
      </div>
      <p className="text-xl font-semibold font-mono text-primary">{stats.avgStrength}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{stats.pendingIntros} pending intros</p>
    </div>
  </div>
);

// ── Add Contact Dialog ────────────────────────────────────────────────
const AddContactDialog = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [firm, setFirm] = useState("");
  const [email, setEmail] = useState("");
  const [sectors, setSectors] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("key_personnel").insert({
        name: name.trim(),
        title: title.trim() || null,
        linkedin_url: null,
        company_id: null,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["relationship-contacts"] });
      toast.success("Contact added", { description: name.trim() });
      setName("");
      setTitle("");
      setFirm("");
      setEmail("");
      setSectors("");
      onClose();
    } catch (e) {
      toast.error("Failed to add contact");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
          <DialogDescription>Add a contact to your relationship network.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Name *</label>
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
              <input
                type="text"
                placeholder="e.g. Managing Director"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Firm</label>
              <input
                type="text"
                placeholder="e.g. Sequoia Capital"
                value={firm}
                onChange={(e) => setFirm(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
            <input
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Sectors (comma-separated)</label>
            <input
              type="text"
              placeholder="e.g. SaaS, Fintech, Healthcare"
              value={sectors}
              onChange={(e) => setSectors(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
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
              disabled={!name.trim() || saving}
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Add Contact
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ── Main Network Page ──────────────────────────────────────────────────
const Network = () => {
  const navigate = useNavigate();
  const { contacts, stats, isLoading, findIntroPaths, requestIntro } = useRelationshipIntel();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "strong" | "warm" | "at-risk">("all");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("strength");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [introPaths, setIntroPaths] = useState<{ hops: { id: string; name: string; firm?: string | null }[]; path_confidence: number }[]>([]);
  const [showAddContact, setShowAddContact] = useState(false);

  const filteredContacts = useMemo(() => {
    let result = contacts.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.firm ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.sectors.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
      const health = getRelationshipHealth(c.relationship_strength, null);
      const matchesFilter = filter === "all" ||
        (filter === "strong" && (health === "strong" || health === "warm")) ||
        (filter === "warm" && health === "warm") ||
        (filter === "at-risk" && (health === "cooling" || health === "cold" || health === "dormant"));
      const matchesSegment = segmentFilter === "all" || c.tags.includes(segmentFilter);
      return matchesSearch && matchesFilter && matchesSegment;
    });

    // Sort
    if (sortBy === "strength") result.sort((a, b) => b.relationship_strength - a.relationship_strength);
    else if (sortBy === "name") result.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "interactions") result.sort((a, b) => b.interaction_count - a.interaction_count);

    return result;
  }, [contacts, searchQuery, filter, segmentFilter, sortBy]);

  const handleViewPaths = (contact: Contact) => {
    const paths = findIntroPaths(contact.id);
    setIntroPaths(paths);
    setSelectedContact(contact);
  };

  const handleRequestIntro = (contact: Contact) => {
    requestIntro({
      contactId: contact.id,
      contactName: contact.name,
      message: `Requesting introduction to ${contact.name}${contact.firm ? ` at ${contact.firm}` : ""}`,
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-5">
        <Skeleton className="h-7 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="p-3 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight flex items-center gap-2">
              Network Intelligence
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Relationship strength scoring, warm intro routing, and contact intelligence.
            </p>
          </div>
          <button
            onClick={() => setShowAddContact(true)}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" /> Add Contact
          </button>
        </div>

        {/* Health Dashboard */}
        <NetworkHealthDashboard stats={stats} />

        {/* Relationship Graph */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <RelationshipGraph />
        </div>

        {/* Warm Intro Path View */}
        <AnimatePresence>
          {selectedContact && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <IntroPathView
                contact={selectedContact}
                paths={introPaths}
                onClose={() => setSelectedContact(null)}
                onRequestIntro={() => {
                  handleRequestIntro(selectedContact);
                  setSelectedContact(null);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search + Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, firm, or sector..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-md border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Health filter */}
          <div className="flex border border-border rounded-md overflow-hidden">
            {([
              { key: "all", label: "All" },
              { key: "strong", label: "Strong" },
              { key: "warm", label: "Warm" },
              { key: "at-risk", label: "At Risk" },
            ] as const).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`h-9 px-3 text-xs transition-colors ${
                  filter === f.key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Segment filter */}
          <select
            value={segmentFilter}
            onChange={(e) => setSegmentFilter(e.target.value)}
            className="h-9 px-2 rounded-md border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Segments</option>
            <option value="investor">Investors</option>
            <option value="operator">Operators</option>
            <option value="advisor">Advisors</option>
            <option value="lp">LPs</option>
            <option value="service_provider">Service Providers</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="h-9 px-2 rounded-md border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="strength">Sort: Strength</option>
            <option value="name">Sort: Name</option>
            <option value="interactions">Sort: Activity</option>
          </select>
        </div>

        {/* Contacts Grid */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredContacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onRequestIntro={() => handleRequestIntro(contact)}
              onViewPaths={() => handleViewPaths(contact)}
            />
          ))}
        </motion.div>

        {filteredContacts.length === 0 && (
          <div className="rounded-lg border border-border bg-card p-16 text-center">
            <Users className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm font-medium text-foreground">No contacts found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {searchQuery ? "Try a different search term." : "Contacts from your deal rooms and CRM will appear here."}
            </p>
          </div>
        )}

        <AddContactDialog open={showAddContact} onClose={() => setShowAddContact(false)} />
      </div>
    </PageTransition>
  );
};

export default Network;
