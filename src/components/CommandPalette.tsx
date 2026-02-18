import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useFullTextSearch } from "@/hooks/useFullTextSearch";
import { useDealIntelligenceSearch } from "@/hooks/useDealIntelligenceSearch";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Search, FileText, Newspaper, AlertTriangle, Radio, Compass, Handshake, Briefcase, Brain, BookOpen, Settings, Shield, BarChart3, Database } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

const ENTITY_ICONS: Record<string, typeof Building2> = {
  company: Building2,
  news: Newspaper,
  signal: Radio,
  distressed: AlertTriangle,
};

const ENTITY_LABELS: Record<string, string> = {
  company: "Companies",
  news: "News",
  signal: "Signals",
  distressed: "Distressed Assets",
};

const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { data: results } = useFullTextSearch(query);
  const { data: dealResults } = useDealIntelligenceSearch(query);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setOpen((o) => !o);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const selectResult = async (type: string, id: string) => {
    setOpen(false);
    setQuery("");
    if (type === "company") {
      try {
        const { data: existing } = await supabase
          .from("deal_pipeline")
          .select("id")
          .eq("company_id", id)
          .maybeSingle();
        if (existing) {
          navigate(`/deals/${existing.id}`);
        } else {
          navigate(`/discover`);
        }
      } catch {
        navigate("/discover");
      }
    } else if (type === "distressed") {
      navigate("/discover");
    } else {
      navigate("/discover");
    }
  };

  const goTo = (path: string) => {
    setOpen(false);
    setQuery("");
    navigate(path);
  };

  const grouped = (results ?? []).reduce<Record<string, typeof results>>((acc, r) => {
    if (!acc[r.entity_type]) acc[r.entity_type] = [];
    acc[r.entity_type]!.push(r);
    return acc;
  }, {});

  // Deduplicate deal intelligence results by deal_id
  const uniqueDeals = (dealResults ?? []).reduce<typeof dealResults>((acc, r) => {
    if (!acc!.find((d) => d.deal_id === r.deal_id)) acc!.push(r);
    return acc;
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search companies, deals, rationale, diligence..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {!query && (
          <CommandGroup heading="Navigate">
            <CommandItem onSelect={() => goTo("/discover")}>
              <Compass className="mr-2 h-4 w-4" /> Discover
            </CommandItem>
            <CommandItem onSelect={() => goTo("/deals")}>
              <Handshake className="mr-2 h-4 w-4" /> Deals
            </CommandItem>
            <CommandItem onSelect={() => goTo("/deals/flow")}>
              <Search className="mr-2 h-4 w-4" /> Deal Pipeline
            </CommandItem>
            <CommandItem onSelect={() => goTo("/portfolio")}>
              <Briefcase className="mr-2 h-4 w-4" /> Portfolio
            </CommandItem>
            <CommandItem onSelect={() => goTo("/deals/recommended")}>
              <Radio className="mr-2 h-4 w-4" /> AI Deal Matcher
            </CommandItem>
            <CommandItem onSelect={() => goTo("/valuations")}>
              <BarChart3 className="mr-2 h-4 w-4" /> Valuations
            </CommandItem>
            <CommandItem onSelect={() => goTo("/data-room")}>
              <Database className="mr-2 h-4 w-4" /> Data Room
            </CommandItem>
            <CommandItem onSelect={() => goTo("/settings")}>
              <Settings className="mr-2 h-4 w-4" /> Settings
            </CommandItem>
            <CommandItem onSelect={() => goTo("/admin")}>
              <Shield className="mr-2 h-4 w-4" /> Admin Dashboard
            </CommandItem>
          </CommandGroup>
        )}

        {Object.entries(grouped).map(([type, items]) => {
          const Icon = ENTITY_ICONS[type] ?? FileText;
          return (
            <CommandGroup key={type} heading={ENTITY_LABELS[type] ?? type}>
              {items!.map((r) => (
                <CommandItem key={r.entity_id} onSelect={() => selectResult(type, r.entity_id)} value={r.name}>
                  <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{r.name}</span>
                  {r.subtitle && <span className="ml-auto text-xs text-muted-foreground truncate max-w-[120px]">{r.subtitle}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}

        {/* Cross-Deal Intelligence Results */}
        {uniqueDeals && uniqueDeals.length > 0 && (
          <CommandGroup heading="Deal Intelligence">
            {uniqueDeals.map((d) => (
              <CommandItem
                key={d.deal_id}
                onSelect={() => goTo(`/deals/${d.deal_id}`)}
                value={`${d.company_name} ${d.match_text}`}
              >
                <Brain className="mr-2 h-4 w-4 text-primary/70" />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm truncate">{d.company_name}</span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {d.match_source === "thesis" ? "Thesis" : "Decision"} · {d.company_sector ?? d.stage}
                  </span>
                </div>
                <BookOpen className="ml-auto h-3 w-3 text-muted-foreground shrink-0" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;
