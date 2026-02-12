import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

// Demo company IDs (real companies from DB)
const DEMO_COMPANY_IDS = [
  "2c7fd5a7-c2f7-4c7a-9a2f-9ca0cba01152", // Anthropic
  "6a49c125-b7c1-4dfe-83f1-e7b836a233cc", // Anduril
  "e3534f0f-fee9-49a3-9c22-16d2f0b32672", // Adept AI
  "708367b1-0a92-485e-bf50-126ec56d0944", // Brex
  "c4d10929-fbef-4f3e-b0b5-c914dd33ec81", // Airtable
  "b81724e1-1ef4-4e1a-88e9-4a89856ba21d", // Alchemy
];

const DEMO_STAGES = ["sourced", "screening", "due_diligence", "ic_review", "term_sheet", "closed"];

async function seedDemoContent(userId: string) {
  try {
    // Check if user already has deals (avoid re-seeding on re-login)
    const { count } = await supabase
      .from("deal_pipeline")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (count && count > 0) return;

    // 1. Seed 6 pipeline deals (one per stage)
    const deals = DEMO_COMPANY_IDS.map((companyId, i) => ({
      user_id: userId,
      company_id: companyId,
      stage: DEMO_STAGES[i],
      priority: i < 2 ? "high" : i < 4 ? "medium" : "low",
      notes: "Auto-generated demo deal",
    }));
    await supabase.from("deal_pipeline").insert(deals);

    // 2. Seed a default watchlist
    await supabase.from("user_watchlists").insert({
      user_id: userId,
      name: "Top AI Companies",
      company_ids: DEMO_COMPANY_IDS.slice(0, 5),
    });

    // 3. Seed 2 starter alerts
    await supabase.from("user_alerts").insert([
      {
        user_id: userId,
        name: "AI/ML Funding",
        conditions: { sector: "AI/ML", event_type: "funding", keywords: ["artificial intelligence", "machine learning"] },
      },
      {
        user_id: userId,
        name: "Series B+ Rounds",
        conditions: { round_type: "series b", min_amount: 50000000 },
      },
    ]);

    // 4. Seed subscription tier (analyst - entry paid tier)
    await supabase.from("subscription_tiers").insert({
      user_id: userId,
      tier: "analyst",
    });

    console.log("Demo content seeded for new user");
  } catch (e) {
    console.error("Failed to seed demo content:", e);
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Create profile + seed demo content on signup (deferred to avoid deadlock)
        if (event === "SIGNED_IN" && session?.user) {
          setTimeout(async () => {
            await supabase
              .from("profiles")
              .upsert(
                {
                  user_id: session.user.id,
                  display_name: session.user.email?.split("@")[0] ?? null,
                },
                { onConflict: "user_id" }
              );
            // Try to accept any pending team invite (silently ignore if none)
            supabase.functions.invoke("accept-invite").catch(() => {});
            // Seed demo content for new users
            seedDemoContent(session.user.id);
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
