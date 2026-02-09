import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Eye, Plus, Loader2, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

export const useWatchlists = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["watchlists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_watchlists")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const AddToWatchlistButton = ({ companyId }: { companyId: string }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: watchlists } = useWatchlists();
  const [newName, setNewName] = useState("");
  const [open, setOpen] = useState(false);

  const addToWatchlist = useMutation({
    mutationFn: async (watchlistId: string) => {
      const wl = watchlists?.find((w) => w.id === watchlistId);
      if (!wl) return;
      const existing = (wl.company_ids ?? []) as string[];
      if (existing.includes(companyId)) {
        toast({ title: "Already in watchlist" });
        return;
      }
      const { error } = await supabase
        .from("user_watchlists")
        .update({ company_ids: [...existing, companyId] })
        .eq("id", watchlistId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlists"] });
      toast({ title: "Added to watchlist" });
      setOpen(false);
    },
  });

  const createWatchlist = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("user_watchlists").insert({
        name,
        user_id: user!.id,
        company_ids: [companyId],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlists"] });
      toast({ title: "Watchlist created" });
      setNewName("");
      setOpen(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="h-9 px-3 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-2">
          <Eye className="h-4 w-4" /> Watch
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Add to Watchlist</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {(watchlists ?? []).map((wl) => {
            const isIn = ((wl.company_ids ?? []) as string[]).includes(companyId);
            return (
              <button
                key={wl.id}
                onClick={() => !isIn && addToWatchlist.mutate(wl.id)}
                disabled={isIn || addToWatchlist.isPending}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-border hover:bg-secondary/50 transition-colors disabled:opacity-50 text-sm"
              >
                <span className="text-foreground">{wl.name}</span>
                {isIn ? (
                  <Check className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
            );
          })}

          <div className="border-t border-border pt-2 mt-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newName.trim()) createWatchlist.mutate(newName.trim());
              }}
              className="flex gap-2"
            >
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New watchlist name..."
                className="flex-1 h-8 px-2 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={!newName.trim() || createWatchlist.isPending}
                className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
              >
                {createWatchlist.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create"}
              </button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
