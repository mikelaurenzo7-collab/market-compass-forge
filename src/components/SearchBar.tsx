import { Search, Command } from "lucide-react";

interface SearchBarProps {
  onOpen?: () => void;
}

const SearchBar = ({ onOpen }: SearchBarProps) => {
  return (
    <button
      onClick={onOpen}
      className="relative flex items-center gap-2 rounded-md border px-3 py-2 transition-all duration-200 border-border bg-card hover:border-muted-foreground/30 w-full text-left"
    >
      <Search className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="flex-1 text-sm text-muted-foreground">
        Search companies, investors, deals...
      </span>
      <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
        <Command className="h-2.5 w-2.5" />K
      </kbd>
    </button>
  );
};

export default SearchBar;
