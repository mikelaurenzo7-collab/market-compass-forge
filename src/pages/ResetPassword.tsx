import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Lock, AlertCircle, Loader2, Check, X, ArrowLeft, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { motion } from "framer-motion";
import grapeLogo from "@/assets/grape-logo.png";

const passwordSchema = z.string().min(8, "Password must be at least 8 characters");

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "Number", test: (p: string) => /[0-9]/.test(p) },
  { label: "Special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const getStrength = (password: string) => {
  const passed = PASSWORD_RULES.filter(r => r.test(password)).length;
  if (passed <= 1) return { level: 0, label: "Weak", color: "bg-destructive" };
  if (passed <= 2) return { level: 1, label: "Fair", color: "bg-orange-500" };
  if (passed <= 3) return { level: 2, label: "Good", color: "bg-yellow-500" };
  if (passed <= 4) return { level: 3, label: "Strong", color: "bg-primary/70" };
  return { level: 4, label: "Excellent", color: "bg-primary" };
};

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  const strength = useMemo(() => getStrength(password), [password]);
  const passedRules = useMemo(() => PASSWORD_RULES.map(r => ({ ...r, passed: r.test(password) })), [password]);

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = passwordSchema.safeParse(password);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (strength.level < 2) {
      setError("Please choose a stronger password.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-foreground">Invalid Reset Link</h1>
            <p className="text-sm text-muted-foreground">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
          </div>
          <Link
            to="/auth"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium"
          >
            <ArrowLeft className="h-3 w-3" /> Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm text-center space-y-6"
        >
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-foreground">Password Updated</h1>
            <p className="text-sm text-muted-foreground">
              Your password has been successfully reset. You can now sign in with your new password.
            </p>
          </div>
          <button
            onClick={() => navigate("/deals")}
            className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Go to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-xl bg-[hsl(var(--brand-purple))] flex items-center justify-center mx-auto shadow-[0_0_20px_-5px_hsl(var(--brand-purple)/0.4)] overflow-hidden">
            <img src={grapeLogo} alt="Grapevine" className="h-8 w-8 object-contain" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Set New Password</h1>
          <p className="text-sm text-muted-foreground">Choose a strong password for your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="new-password" className="text-sm text-muted-foreground">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 pl-9 pr-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirm-password" className="text-sm text-muted-foreground">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 pl-9 pr-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
          </div>

          {/* Strength meter */}
          {password && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                        i <= strength.level ? strength.color : "bg-secondary"
                      }`}
                    />
                  ))}
                </div>
                <span className={`text-[10px] font-medium uppercase tracking-wider ${
                  strength.level >= 3 ? "text-primary" : strength.level >= 2 ? "text-yellow-500" : "text-destructive"
                }`}>
                  {strength.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {passedRules.map((rule) => (
                  <div key={rule.label} className="flex items-center gap-1.5">
                    {rule.passed ? (
                      <Check className="h-3 w-3 text-primary shrink-0" />
                    ) : (
                      <X className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                    )}
                    <span className={`text-[11px] ${rule.passed ? "text-foreground" : "text-muted-foreground/60"}`}>
                      {rule.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
