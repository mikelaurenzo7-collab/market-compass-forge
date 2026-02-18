import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useFullTextSearch } from "@/hooks/useFullTextSearch";
import { Building2, Search, FileText, Newspaper, AlertTriangle, Radio, Compass, Handshake, Briefcase } from "lucide-react";
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

  const selectResult = (type: string, id: string) => {
    setOpen(false);
    setQuery("");
    if (type === "company") navigate(`/discover`);
    else if (type === "news") navigate("/discover");
    else if (type === "signal") navigate("/discover");
    else if (type === "distressed") navigate("/discover");
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

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search companies, news, signals..."
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
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;
