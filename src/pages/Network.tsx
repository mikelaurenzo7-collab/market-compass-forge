import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  ShieldCheck,
  Star,
  Handshake,
  ArrowRight,
  Search,
  Send,
  UserPlus,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  GitBranch,
} from "lucide-react";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";

// ── Placeholder contacts data ───────────────────────────────────────────
const CONTACTS = [
  {
    id: "c1",
    name: "Alex Chen",
    title: "Managing Partner",
    firm: "Summit Ventures",
    verified: true,
    trustScore: 96,
    dealCount: 12,
    introCount: 4,
    responsiveness: "Fast",
    sectors: ["B2B SaaS", "Data Infrastructure"],
    sharedRooms: ["Series B Syndicate"],
    lastActive: "2h ago",
  },
  {
    id: "c2",
    name: "Sarah Kim",
    title: "Principal",
    firm: "Meridian Capital",
    verified: true,
    trustScore: 93,
    dealCount: 8,
    introCount: 6,
    responsiveness: "Fast",
    sectors: ["Fintech", "Enterprise"],
    sharedRooms: ["Series B Syndicate"],
    lastActive: "5h ago",
  },
  {
    id: "c3",
    name: "Morgan Taylor",
    title: "Head of Special Situations",
    firm: "Apex Credit Partners",
    verified: true,
    trustScore: 97,
    dealCount: 24,
    introCount: 2,
    responsiveness: "Very Fast",
    sectors: ["Distressed Debt", "Retail"],
    sharedRooms: ["Distressed Credit Club"],
    lastActive: "4h ago",
  },
  {
    id: "c4",
    name: "Jordan Lee",
    title: "Partner",
    firm: "Green Horizon Fund",
    verified: true,
    trustScore: 88,
    dealCount: 6,
    introCount: 3,
    responsiveness: "Moderate",
    sectors: ["Climate Tech", "Clean Energy"],
    sharedRooms: ["Climate Tech Scouts"],
    lastActive: "1d ago",
  },
  {
    id: "c5",
    name: "Diana Mitchell",
    title: "CEO & CIO",
    firm: "Mitchell Capital Group",
    verified: true,
    trustScore: 99,
    dealCount: 31,
    introCount: 11,
    responsiveness: "Very Fast",
    sectors: ["Multi-sector", "PE Secondaries"],
    sharedRooms: ["GP/LP Exchange"],
    lastActive: "30m ago",
  },
  {
    id: "c6",
    name: "Paul Kim",
    title: "Director",
    firm: "Atlas Infrastructure",
    verified: true,
    trustScore: 91,
    dealCount: 14,
    introCount: 5,
    responsiveness: "Fast",
    sectors: ["Infrastructure", "Real Assets"],
    sharedRooms: ["Infrastructure Secondaries"],
    lastActive: "6h ago",
  },
  {
    id: "c7",
    name: "Rachel Wu",
    title: "VP, Investments",
    firm: "Pacific LP Solutions",
    verified: true,
    trustScore: 89,
    dealCount: 9,
    introCount: 7,
    responsiveness: "Fast",
    sectors: ["LP Secondaries", "Infrastructure"],
    sharedRooms: ["Infrastructure Secondaries"],
    lastActive: "12h ago",
  },
  {
    id: "c8",
    name: "Henry Roberts",
    title: "Senior Associate",
    firm: "Cornerstone Partners",
    verified: false,
    trustScore: 78,
    dealCount: 5,
    introCount: 1,
    responsiveness: "Moderate",
    sectors: ["Growth Equity", "Healthcare"],
    sharedRooms: ["GP/LP Exchange"],
    lastActive: "2d ago",
  },
];

// ── Intro requests ──────────────────────────────────────────────────────
const PENDING_INTROS = [
  { id: "i1", from: "Sarah Kim", to: "Jordan Lee", context: "Climate co-invest on GreenGrid Energy", status: "pending" },
  { id: "i2", from: "Alex Chen", to: "Diana Mitchell", context: "Fund VII co-invest allocation", status: "accepted" },
];

// ── Contact Card ────────────────────────────────────────────────────────
const ContactCard = ({ contact, onRequestIntro }: { contact: typeof CONTACTS[0]; onRequestIntro: () => void }) => {
  const navigate = useNavigate();
  return (
    <div className="rounded-lg border border-border bg-card p-4 hover:border-primary/20 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-grape/10 flex items-center justify-center text-sm font-semibold text-grape shrink-0">
            {contact.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-foreground truncate">{contact.name}</p>
              {contact.verified && <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{contact.title} · {contact.firm}</p>
          </div>
        </div>
        {contact.trustScore >= 90 && (
          <span className="text-[10px] font-medium text-success bg-success/10 px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0">
            <Star className="h-2.5 w-2.5" /> {contact.trustScore}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <Handshake className="h-3 w-3" /> {contact.dealCount} deals
        </span>
        <span className="flex items-center gap-1">
          <Send className="h-3 w-3" /> {contact.introCount} intros
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" /> {contact.responsiveness}
        </span>
      </div>

      {/* Sectors */}
      <div className="flex flex-wrap gap-1 mb-3">
        {contact.sectors.map((s) => (
          <span key={s} className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            {s}
          </span>
        ))}
      </div>

      {/* Shared rooms */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-3">
        <Users className="h-3 w-3 shrink-0" />
        <span className="truncate">{contact.sharedRooms.join(", ")}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onRequestIntro}
          className="flex-1 h-7 rounded-md bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors flex items-center justify-center gap-1"
        >
          <Send className="h-3 w-3" /> Request Intro
        </button>
        <button
          onClick={() => {}}
          className="h-7 px-2 rounded-md border border-border text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          Profile
        </button>
      </div>
    </div>
  );
};

// ── Network Stats ───────────────────────────────────────────────────────
const NetworkStats = () => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Users className="h-4 w-4" />
        <span className="text-[10px] font-medium uppercase tracking-wider">Connections</span>
      </div>
      <p className="text-xl font-semibold font-mono text-foreground">{CONTACTS.length}</p>
    </div>
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <ShieldCheck className="h-4 w-4" />
        <span className="text-[10px] font-medium uppercase tracking-wider">Verified</span>
      </div>
      <p className="text-xl font-semibold font-mono text-primary">{CONTACTS.filter((c) => c.verified).length}</p>
    </div>
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Send className="h-4 w-4" />
        <span className="text-[10px] font-medium uppercase tracking-wider">Intros Made</span>
      </div>
      <p className="text-xl font-semibold font-mono text-foreground">{CONTACTS.reduce((sum, c) => sum + c.introCount, 0)}</p>
    </div>
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Star className="h-4 w-4" />
        <span className="text-[10px] font-medium uppercase tracking-wider">Avg Trust</span>
      </div>
      <p className="text-xl font-semibold font-mono text-success">
        {Math.round(CONTACTS.reduce((sum, c) => sum + c.trustScore, 0) / CONTACTS.length)}%
      </p>
    </div>
  </div>
);

// ── Main ────────────────────────────────────────────────────────────────
const Network = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "verified" | "high-trust">("all");

  const filteredContacts = CONTACTS.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.firm.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.sectors.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filter === "all" ||
      (filter === "verified" && c.verified) ||
      (filter === "high-trust" && c.trustScore >= 90);
    return matchesSearch && matchesFilter;
  });

  return (
    <PageTransition>
      <div className="p-3 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight flex items-center gap-2">
              Network
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your trust graph. Verified connections, intro routing, and relationship signals.
            </p>
          </div>
          <button className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> Add Contact
          </button>
        </div>

        {/* Stats */}
        <NetworkStats />

        {/* Pending Intros */}
        {PENDING_INTROS.length > 0 && (
          <div className="rounded-lg border border-primary/20 bg-primary/[0.02] p-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <GitBranch className="h-4 w-4 text-primary" /> Intro Requests
              <span className="text-[10px] font-mono text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
                {PENDING_INTROS.length}
              </span>
            </h3>
            <div className="space-y-2">
              {PENDING_INTROS.map((intro) => (
                <div key={intro.id} className="flex items-center justify-between p-3 rounded-md bg-card border border-border">
                  <div>
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{intro.from}</span>
                      <span className="text-muted-foreground mx-1.5">→</span>
                      <span className="font-medium">{intro.to}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{intro.context}</p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                    intro.status === "accepted" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                  }`}>
                    {intro.status === "accepted" ? "Accepted" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search + Filter */}
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
          <div className="flex border border-border rounded-md overflow-hidden">
            {([
              { key: "all", label: "All" },
              { key: "verified", label: "Verified" },
              { key: "high-trust", label: "High Trust" },
            ] as const).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`h-9 px-3 text-xs transition-colors ${
                  filter === f.key
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
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
              onRequestIntro={() => {}}
            />
          ))}
        </motion.div>

        {filteredContacts.length === 0 && (
          <div className="rounded-lg border border-border bg-card p-16 text-center">
            <Users className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm font-medium text-foreground">No connections found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {searchQuery ? "Try a different search term." : "Add contacts to build your trust graph."}
            </p>
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default Network;
