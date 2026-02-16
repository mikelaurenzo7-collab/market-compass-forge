import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface SetAlertButtonProps {
  entityName: string;
  alertType?: string;
  compact?: boolean;
}

const SetAlertButton = ({ entityName, alertType = "status_change", compact }: SetAlertButtonProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSetAlert = async () => {
    if (!user) {
      toast.error("Sign in to set alerts");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("user_alerts").insert({
        user_id: user.id,
        name: `${entityName} — Status Update`,
        alert_type: alertType,
        conditions: { entity_name: entityName },
        channels: ["in_app"],
        is_active: true,
      });
      if (error) throw error;
      setDone(true);
      toast.success("Alert set", { description: `You'll be notified of changes to ${entityName}` });
    } catch (err: any) {
      toast.error(err.message || "Failed to set alert");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <Button
        variant="outline"
        size={compact ? "sm" : "default"}
        disabled
        className="gap-2 text-success border-success/20"
      >
        <CheckCircle className="h-4 w-4" />
        Alert Set
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size={compact ? "sm" : "default"}
      onClick={handleSetAlert}
      disabled={loading || !user}
      className="gap-2"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
      Set Alert
    </Button>
  );
};

export default SetAlertButton;
