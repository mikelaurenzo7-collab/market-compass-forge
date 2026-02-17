import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

/**
 * Listens for session-expired events and redirects to /auth with a helpful message.
 * Mount this inside a Router context (e.g., inside AuthProvider or AppLayout).
 */
export function useSessionGuard() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => {
      toast.error("Your session has expired. Please sign in again.");
      navigate("/auth", { replace: true });
    };
    window.addEventListener("supabase:session-expired", handler);
    return () => window.removeEventListener("supabase:session-expired", handler);
  }, [navigate]);
}
