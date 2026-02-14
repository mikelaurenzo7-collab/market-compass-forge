import { Search, Command } from "lucide-react";

interface SearchBarProps {
  onOpen?: () => void;
}

const SearchBar = ({ onOpen }: SearchBarProps) => {
  return (
    <button
      onClick={onOpen}
      className="relative flex items-center gap-2 rounded-full border px-4 py-2 transition-all duration-300 border-border/60 bg-muted/30 backdrop-blur-sm hover:border-primary/30 hover:shadow-[0_0_12px_hsl(var(--primary)/0.08)] w-full text-left group"
    >
      <Search className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
      <span className="flex-1 text-sm text-muted-foreground">
        Search companies, investors, deals...
      </span>
      <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
        <Command className="h-2.5 w-2.5" />K
      </kbd>
    </button>
  );
};

export default SearchBar;
