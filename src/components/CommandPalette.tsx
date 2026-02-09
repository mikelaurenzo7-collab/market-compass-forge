import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSearchCompanies, useSearchInvestors } from "@/hooks/useData";
import { Building2, Users, Search, FileText } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { data: companies } = useSearchCompanies(query);
  const { data: investors } = useSearchInvestors(query);

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

  const selectCompany = (id: string) => {
    setOpen(false);
    setQuery("");
    navigate(`/companies/${id}`);
  };

  const selectInvestor = (id: string) => {
    setOpen(false);
    setQuery("");
    navigate(`/people`);
  };

  const goTo = (path: string) => {
    setOpen(false);
    setQuery("");
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search companies, investors, or navigate..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Navigation shortcuts */}
        {!query && (
          <CommandGroup heading="Navigate">
            <CommandItem onSelect={() => goTo("/")}>
              <FileText className="mr-2 h-4 w-4" /> Dashboard
            </CommandItem>
            <CommandItem onSelect={() => goTo("/companies")}>
              <Building2 className="mr-2 h-4 w-4" /> Companies
            </CommandItem>
            <CommandItem onSelect={() => goTo("/deals")}>
              <Search className="mr-2 h-4 w-4" /> Deal Pipeline
            </CommandItem>
            <CommandItem onSelect={() => goTo("/analytics")}>
              <FileText className="mr-2 h-4 w-4" /> Analytics
            </CommandItem>
          </CommandGroup>
        )}

        {companies && companies.length > 0 && (
          <CommandGroup heading="Companies">
            {companies.map((c) => (
              <CommandItem key={c.id} onSelect={() => selectCompany(c.id)} value={c.name}>
                <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{c.name}</span>
                {c.sector && <span className="ml-auto text-xs text-muted-foreground">{c.sector}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {investors && investors.length > 0 && (
          <CommandGroup heading="Investors">
            {investors.map((i) => (
              <CommandItem key={i.id} onSelect={() => selectInvestor(i.id)} value={i.name}>
                <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{i.name}</span>
                {i.type && <span className="ml-auto text-xs text-muted-foreground">{i.type}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;
