import { Search, Command } from "lucide-react";
import { useState } from "react";

const SearchBar = () => {
  const [focused, setFocused] = useState(false);

  return (
    <div
      className={`relative flex items-center gap-2 rounded-md border px-3 py-2 transition-all duration-200 ${
        focused
          ? "border-primary/50 glow-primary bg-secondary"
          : "border-border bg-card hover:border-muted-foreground/30"
      }`}
    >
      <Search className="h-4 w-4 text-muted-foreground shrink-0" />
      <input
        type="text"
        placeholder='Search companies, investors, deals... (e.g. "Series B fintech ARR > $10M")'
        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
        <Command className="h-2.5 w-2.5" />K
      </kbd>
    </div>
  );
};

export default SearchBar;
