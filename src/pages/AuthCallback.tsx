import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { getIntegrationDef } from "@/lib/integrations";
import type { IntegrationType } from "@/lib/integrations";

type CallbackStatus = "processing" | "success" | "error";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [status, setStatus] = useState<CallbackStatus>("processing");
  const [message, setMessage] = useState("Connecting integration...");

  useEffect(() => {
    const code = searchParams.get("code");
    const stateParam = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setMessage(`Authorization denied: ${error}`);
      setTimeout(() => navigate("/settings?tab=integrations"), 3000);
      return;
    }

    if (!code || !stateParam) {
      setStatus("error");
      setMessage("Missing authorization code");
      setTimeout(() => navigate("/settings?tab=integrations"), 3000);
      return;
    }

    const storedState = sessionStorage.getItem("oauth_state");
    if (stateParam !== storedState) {
      setStatus("error");
      setMessage("State mismatch — possible CSRF. Please try again.");
      setTimeout(() => navigate("/settings?tab=integrations"), 3000);
      return;
    }

    let parsed: { type: IntegrationType };
    try {
      parsed = JSON.parse(stateParam);
    } catch {
      setStatus("error");
      setMessage("Invalid state parameter");
      setTimeout(() => navigate("/settings?tab=integrations"), 3000);
      return;
    }

    const def = getIntegrationDef(parsed.type);

    const exchangeToken = async () => {
      try {
        setMessage(`Connecting ${def?.name ?? parsed.type}...`);

        const { error: fnError } = await supabase.functions.invoke("oauth-callback", {
          body: {
            code,
            integration_type: parsed.type,
            redirect_uri: `${window.location.origin}/auth/callback`,
          },
        });

        if (fnError) throw fnError;

        setStatus("success");
        setMessage(`${def?.name ?? parsed.type} connected successfully!`);
        toast.success(`${def?.name ?? parsed.type} connected`);
        sessionStorage.removeItem("oauth_state");

        setTimeout(() => navigate("/settings?tab=integrations"), 2000);
      } catch (err) {
        setStatus("error");
        setMessage("Failed to connect. Please try again.");
        console.error("OAuth callback error:", err);
        setTimeout(() => navigate("/settings?tab=integrations"), 3000);
      }
    };

    if (user) exchangeToken();
  }, [searchParams, user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-sm">
        {status === "processing" && (
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
        )}
        {status === "success" && (
          <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
        )}
        {status === "error" && (
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
        )}
        <p className="text-sm text-foreground font-medium">{message}</p>
        <p className="text-xs text-muted-foreground">Redirecting to settings...</p>
      </div>
    </div>
  );
}
