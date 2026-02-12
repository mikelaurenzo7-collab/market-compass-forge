import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Search, List, Brain, Check, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const steps = [
  {
    id: "screen",
    icon: Search,
    title: "Screen your first deal",
    description: "Browse private companies, filter by sector, stage, and revenue — then save the ones that catch your eye.",
    cta: "Browse Companies",
    path: "/companies",
  },
  {
    id: "watchlist",
    icon: List,
    title: "Build a watchlist",
    description: "Group companies you're tracking into watchlists. Get alerts when new intel surfaces on any of them.",
    cta: "Create Watchlist",
    path: "/watchlists",
  },
  {
    id: "research",
    icon: Brain,
    title: "Get AI insights",
    description: "Ask our AI analyst anything — generate investment memos, compare companies, or surface risks instantly.",
    cta: "Try AI Research",
    path: "/research",
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

  const progress = ((completedSteps.size) / steps.length) * 100;
  const step = steps[currentStep];

  const markComplete = (stepId: string) => {
    setCompletedSteps((prev) => new Set(prev).add(stepId));
  };

  const handleAction = () => {
    markComplete(step.id);
    navigate(step.path);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setDirection(1);
      setCurrentStep((s) => s + 1);
    }
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
    }
  };

  const allDone = completedSteps.size === steps.length;

  if (allDone) {
    handleDismiss();
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
