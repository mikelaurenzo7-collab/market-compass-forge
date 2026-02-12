import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Handshake, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface RequestIntroButtonProps {
  entityType: "distressed_asset" | "private_listing" | "company";
  entityId: string;
  entityName: string;
}

const RequestIntroButton = ({ entityType, entityId, entityName }: RequestIntroButtonProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("intro_requests").insert({
        user_id: user.id,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        message: message.trim() || null,
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success("Intro request submitted", {
        description: "Our team will facilitate an introduction shortly.",
      });
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setMessage("");
      }, 2000);
    } catch (err: any) {
      toast.error("Failed to submit request", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="w-full gap-2"
        variant="default"
      >
        <Handshake className="h-4 w-4" />
        Request Intro
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Handshake className="h-5 w-5 text-primary" />
              Request Introduction
            </DialogTitle>
            <DialogDescription>
              Our team will connect you with the owner/seller of <span className="font-medium text-foreground">{entityName}</span>.
            </DialogDescription>
          </DialogHeader>

          {submitted ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <CheckCircle className="h-12 w-12 text-primary" />
              <p className="text-sm font-medium text-foreground">Request Submitted</p>
              <p className="text-xs text-muted-foreground text-center">
                We'll reach out to facilitate this introduction within 24 hours.
              </p>
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Opportunity</p>
                <p className="text-sm font-medium text-foreground">{entityName}</p>
                <p className="text-xs text-muted-foreground capitalize mt-0.5">{entityType.replace("_", " ")}</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Message (optional)
                </label>
                <Textarea
                  placeholder="Tell us about your interest in this opportunity..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Handshake className="h-4 w-4" />
                )}
                {loading ? "Submitting..." : "Submit Request"}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                A Grapevine concierge will facilitate this introduction on your behalf.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RequestIntroButton;