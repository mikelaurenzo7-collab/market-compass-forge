import { useNavigate } from "react-router-dom";
import { Folder, Plus, Lock } from "lucide-react";
import PageTransition from "@/components/PageTransition";

const Rooms = () => {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className="p-4 sm:p-6 space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Rooms</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Secure deal rooms for collaboration and diligence
            </p>
          </div>
          <button className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
            <Plus className="h-4 w-4" /> Create Room
          </button>
        </div>

        <div className="rounded-lg border border-dashed border-border bg-card/50 p-16 text-center">
          <div className="relative mx-auto w-16 h-16 mb-4">
            <Folder className="h-16 w-16 text-muted-foreground/20" />
            <Lock className="h-5 w-5 text-muted-foreground/40 absolute bottom-0 right-0" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">No rooms yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Rooms are secure spaces where you can share documents, coordinate with counterparties, and manage diligence workflows for specific deals.
          </p>
          <button className="mt-4 h-9 px-4 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            Create your first room
          </button>
        </div>
      </div>
    </PageTransition>
  );
};

export default Rooms;
