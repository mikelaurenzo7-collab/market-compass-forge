import { useAuth } from "@/hooks/useAuth";
import { Heart } from "lucide-react";

const ProductFooter = () => {
  const { user } = useAuth();

  return (
    <footer className="border-t border-border bg-secondary/30 text-xs text-muted-foreground p-4 mt-8">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[hsl(var(--brand-purple))] font-bold">🍇</span>
          <span>Grapevine • Private market intelligence for PE & family offices</span>
        </div>
        <div className="flex items-center gap-1">
          Made with <Heart className="h-3 w-3 text-destructive" /> for investors
        </div>
      </div>
    </footer>
  );
};

export default ProductFooter;
