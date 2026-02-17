import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Search, List, Brain, FileText, Bell, Check, ArrowRight, X, PartyPopper, Rocket, Shield, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const steps = [
  {
    id: "screen",
    icon: Search,
    title: "Screen your first deal",
    description: "Browse 800+ private companies. Filter by sector, stage, and revenue — then save what catches your eye.",
    cta: "Browse Companies",
    path: "/companies",
    benefit: "Most users find 3-5 actionable targets in their first session",
  },
  {
    id: "watchlist",
    icon: List,
    title: "Build a watchlist",
    description: "Group companies by sector or theme. Get real-time alerts when new intel surfaces on any of them.",
    cta: "Go to Companies",
    path: "/companies",
    benefit: "Watchlists drive 4x faster deal response times",
  },
  {
    id: "briefing",
    icon: Brain,
    title: "Generate your AI briefing",
    description: "Get an AI-synthesized daily digest of pipeline changes, news sentiment, and macro shifts — delivered to your command center.",
    cta: "View Briefing",
    path: "/deals",
    benefit: "Save 45 min/day on market monitoring",
  },
  {
    id: "memo",
    icon: FileText,
    title: "Write an investment memo",
    description: "Pick any company and generate a full investment memo — complete with risk factors, valuation comps, and thesis.",
    cta: "Try AI Research",
    path: "/research",
    benefit: "Generate IC-ready memos in under 2 minutes",
  },
  {
    id: "alerts",
    icon: Bell,
    title: "Set up alerts",
    description: "Configure alerts by sector, funding stage, or keywords so you never miss a deal that matches your investment thesis.",
    cta: "Configure Alerts",
    path: "/alerts",
    benefit: "Avg alert-to-action time: 12 minutes",
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

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          supabase.functions.invoke("morning-briefing", {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }).catch(() => {});
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
        className="rounded-xl border border-primary/20 glass-premium p-6 text-center space-y-4 relative overflow-hidden"
      >
        <div className="absolute inset-0 aurora-gradient opacity-40 pointer-events-none" />
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors z-10"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="relative z-10 space-y-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto ring-2 ring-primary/20"
          >
            <PartyPopper className="h-7 w-7 text-primary" />
          </motion.div>
          <h2 className="text-base font-bold text-foreground">You're all set!</h2>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Your Grapevine workspace is configured. Start sourcing deals, generating memos, and tracking your pipeline from the command center.
          </p>
          <div className="flex gap-2 justify-center pt-2">
            <Button size="sm" onClick={handleDismiss} className="gap-1.5">
              <Rocket className="h-3.5 w-3.5" />
              Launch Command Center
            </Button>
            <Button size="sm" variant="outline" onClick={() => { handleDismiss(); navigate("/settings"); }}>
              Open Settings
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="rounded-xl border border-primary/20 glass-premium p-5 space-y-4 relative overflow-hidden"
    >
      <div className="absolute inset-0 aurora-gradient opacity-20 pointer-events-none" />
      
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors z-10"
        aria-label="Dismiss onboarding"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative z-10 space-y-2">
        <div className="flex items-center justify-between pr-6">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
              <Rocket className="h-3.5 w-3.5 text-primary" />
            </div>
            <h2 className="text-sm font-bold text-foreground">
              Getting Started
            </h2>
            <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              {completedSteps.size}/{steps.length}
            </span>
          </div>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      <div className="overflow-hidden relative min-h-[140px] z-10">
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
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 ring-1 ring-primary/20">
                {completedSteps.has(step.id) ? (
                  <Check className="h-5 w-5 text-primary" />
                ) : (
                  <step.icon className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{step.title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.description}</p>
                {step.benefit && (
                  <p className="text-[10px] text-primary/70 mt-1.5 flex items-center gap-1">
                    <BarChart3 className="h-2.5 w-2.5" />
                    {step.benefit}
                  </p>
                )}
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
      <div className="flex items-center justify-center gap-1.5 relative z-10">
        {steps.map((s, i) => (
          <button
            key={s.id}
            onClick={() => {
              setDirection(i > currentStep ? 1 : -1);
              setCurrentStep(i);
            }}
            className={`h-1.5 rounded-full transition-all ${
              i === currentStep
                ? "w-5 bg-primary glow-primary"
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
