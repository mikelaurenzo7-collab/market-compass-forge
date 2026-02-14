import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Search, List, Brain, FileText, Bell, Check, ArrowRight, X, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const steps = [
  {
    id: "screen",
    icon: Search,
    title: "Screen your first deal",
    description: "Browse 7,800+ private companies, filter by sector, stage, and revenue — then save the ones that catch your eye.",
    cta: "Browse Companies",
    path: "/companies",
  },
  {
    id: "watchlist",
    icon: List,
    title: "Build a watchlist",
    description: "Group companies you're tracking into watchlists. Get alerts when new intel surfaces on any of them.",
    cta: "Go to Screening",
    path: "/screening",
  },
  {
    id: "briefing",
    icon: Brain,
    title: "Generate your briefing",
    description: "Get an AI-synthesized daily digest of pipeline changes, news sentiment, and macro moves — delivered to your dashboard.",
    cta: "View Briefing",
    path: "/dashboard",
  },
  {
    id: "memo",
    icon: FileText,
    title: "Write an investment memo",
    description: "Pick any company and generate a full investment memo with AI — complete with risk factors, valuation, and thesis.",
    cta: "Try AI Research",
    path: "/research",
  },
  {
    id: "alerts",
    icon: Bell,
    title: "Set up alerts",
    description: "Configure alerts by sector, funding stage, or keywords so you never miss a deal that matches your thesis.",
    cta: "Configure Alerts",
    path: "/alerts",
  },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 120 : -120,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? 120 : -120,
    opacity: 0,
  }),
};

export function useOnboardingStatus() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["onboarding-status", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.onboarding_completed ?? false;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [showCelebration, setShowCelebration] = useState(false);

  const progress = ((completedSteps.size) / steps.length) * 100;
  const step = steps[currentStep];

  const markComplete = (stepId: string) => {
    const next = new Set(completedSteps);
    next.add(stepId);
    setCompletedSteps(next);
    if (next.size === steps.length) {
      setShowCelebration(true);
    }
  };

  const handleAction = () => {
    markComplete(step.id);
    navigate(step.path);
  };

  const handleSkip = () => {
    markComplete(step.id);
    if (currentStep < steps.length - 1) {
      setDirection(1);
      setCurrentStep((s) => s + 1);
    }
  };

  const handleDismiss = async () => {
    if (user) {
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("user_id", user.id);
      queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });

      // Auto-generate morning briefing on first completion
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          supabase.functions.invoke("morning-briefing", {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }).catch(() => {}); // fire-and-forget
        }
      } catch {}
    }
  };

  if (showCelebration) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        className="rounded-lg border border-primary/20 bg-primary/5 p-6 text-center space-y-3 relative"
      >
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
          <PartyPopper className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">You're all set!</h2>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Your Grapevine workspace is ready. Start sourcing deals, generating memos, and tracking your pipeline.
        </p>
        <div className="flex gap-2 justify-center pt-1">
          <Button size="sm" onClick={handleDismiss}>
            Go to Dashboard
          </Button>
          <Button size="sm" variant="outline" onClick={() => { handleDismiss(); navigate("/settings"); }}>
            Open Settings
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="rounded-lg border border-primary/20 bg-primary/5 p-5 space-y-4 relative"
    >
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss onboarding"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="space-y-2">
        <div className="flex items-center justify-between pr-6">
          <h2 className="text-sm font-semibold text-foreground">
            Getting Started ({completedSteps.size}/{steps.length})
          </h2>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      <div className="overflow-hidden relative min-h-[120px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-3"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                {completedSteps.has(step.id) ? (
                  <Check className="h-5 w-5 text-primary" />
                ) : (
                  <step.icon className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{step.title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pl-[52px]">
              <Button size="sm" onClick={handleAction} className="gap-1.5">
                {step.cta} <ArrowRight className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleSkip} className="text-muted-foreground">
                Skip
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-center gap-1.5">
        {steps.map((s, i) => (
          <button
            key={s.id}
            onClick={() => {
              setDirection(i > currentStep ? 1 : -1);
              setCurrentStep(i);
            }}
            className={`h-1.5 rounded-full transition-all ${
              i === currentStep
                ? "w-4 bg-primary"
                : completedSteps.has(s.id)
                ? "w-1.5 bg-primary/50"
                : "w-1.5 bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
}
