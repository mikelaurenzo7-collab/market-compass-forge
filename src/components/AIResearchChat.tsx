import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bot, Send, Loader2, Sparkles, Copy, Check, History, Plus, Link2, Building2, Briefcase } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "@/hooks/use-toast";
import { useUsageTracking } from "@/hooks/useUsageTracking";
import UpgradePrompt from "@/components/UpgradePrompt";
import {
  useResearchThreads,
  useResearchMessages,
  useCreateThread,
  useSaveMessage,
  useUpdateThread,
  type ResearchThread,
} from "@/hooks/useResearchThreads";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTED_QUESTIONS = [
  "What are the key risks for this company?",
  "Compare this to sector competitors",
  "Analyze the funding trajectory",
  "What's the valuation justified by financials?",
];

const PLAYBOOK_PROMPTS: Record<string, string[]> = {
  "AI/ML": [
    "Analyze model defensibility and data moat",
    "Evaluate compute cost structure and unit economics",
    "Compare to AI incumbents in this vertical",
  ],
  Fintech: [
    "Analyze regulatory risk and compliance posture",
    "Evaluate take rate and payment volume economics",
    "Compare unit economics to neobank benchmarks",
  ],
  "Enterprise SaaS": [
    "Analyze NDR, CAC payback, and Rule of 40",
    "Evaluate competitive positioning vs incumbents",
    "Assess expansion revenue and upsell potential",
  ],
  Cybersecurity: [
    "Analyze threat landscape fit and TAM",
    "Evaluate platform vs point solution strategy",
    "Compare to CrowdStrike/Palo Alto benchmarks",
  ],
};

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Copy as Markdown">
      {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
    </button>
  );
};

interface AttachMenuProps {
  threadId: string | null;
  currentCompanyId?: string;
}

const AttachMenu = ({ threadId, currentCompanyId }: AttachMenuProps) => {
  const { user } = useAuth();
  const updateThread = useUpdateThread();

  // Fetch user's deals for attach-to-deal
  const { data: deals } = useQuery({
    queryKey: ["user-deals-for-attach", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_pipeline")
        .select("id, company_id, companies(name)")
        .eq("user_id", user!.id)
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!threadId,
  });

  if (!threadId) return null;

  const attachToDeal = (dealId: string, companyName: string) => {
    updateThread.mutate(
      { id: threadId, deal_id: dealId },
      {
        onSuccess: () => toast({ title: `Attached to deal: ${companyName}` }),
      }
    );
  };

  const attachToCompany = () => {
    if (!currentCompanyId) return;
    updateThread.mutate(
      { id: threadId, company_id: currentCompanyId },
      {
        onSuccess: () => toast({ title: "Attached to company" }),
      }
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Attach thread">
          <Link2 className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {currentCompanyId && (
          <DropdownMenuItem onClick={attachToCompany} className="text-xs gap-2">
            <Building2 className="h-3 w-3" /> Attach to this Company
          </DropdownMenuItem>
        )}
        {(deals ?? []).length > 0 && (
          <>
            <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase">Attach to Deal</div>
            {(deals ?? []).map((d: any) => (
              <DropdownMenuItem key={d.id} onClick={() => attachToDeal(d.id, d.companies?.name ?? "Deal")} className="text-xs gap-2">
                <Briefcase className="h-3 w-3" /> {d.companies?.name ?? "Unknown"}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface AIResearchChatProps {
  companyId: string;
  companyName: string;
  sector?: string | null;
  initialThreadId?: string | null;
  dealId?: string | null;
  onThreadChange?: (threadId: string | null) => void;
}

const AIResearchChat = ({ companyId, companyName, sector, initialThreadId, dealId, onThreadChange }: AIResearchChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(initialThreadId ?? null);
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { checkAndTrack, showUpgrade, blockedAction, dismissUpgrade } = useUsageTracking();

  const createThread = useCreateThread();
  const saveMessage = useSaveMessage();
  const { data: threads } = useResearchThreads(companyId);
  const { data: savedMessages } = useResearchMessages(activeThreadId);

  const playbook = sector ? PLAYBOOK_PROMPTS[sector] : undefined;

  // Load saved messages when thread changes
  useEffect(() => {
    if (savedMessages && activeThreadId) {
      setMessages(savedMessages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })));
    }
  }, [savedMessages, activeThreadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const switchThread = (thread: ResearchThread) => {
    setActiveThreadId(thread.id);
    onThreadChange?.(thread.id);
    setShowHistory(false);
  };

  const startNewThread = () => {
    setActiveThreadId(null);
    setMessages([]);
    onThreadChange?.(null);
    setShowHistory(false);
  };

  const send = useCallback(async (question: string) => {
    if (!question.trim() || isLoading || !user) return;
    const allowed = await checkAndTrack("ai_research");
    if (!allowed) return;

    // Create thread on first message if none active
    let threadId = activeThreadId;
    if (!threadId) {
      try {
        const thread = await createThread.mutateAsync({
          title: question.slice(0, 100),
          company_id: companyId,
          deal_id: dealId ?? undefined,
        });
        threadId = thread.id;
        setActiveThreadId(thread.id);
        onThreadChange?.(thread.id);
      } catch (e) {
        console.error("Failed to create thread:", e);
      }
    }

    const userMsg: Message = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Save user message
    if (threadId) {
      saveMessage.mutate({ thread_id: threadId, role: "user", content: question });
    }

    let assistantSoFar = "";

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-research`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          company_id: companyId,
          question,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Save final assistant message
      if (threadId && assistantSoFar) {
        saveMessage.mutate({ thread_id: threadId, role: "assistant", content: assistantSoFar });
      }
    } catch (e: any) {
      const errMsg = `⚠️ ${e.message || "Something went wrong. Please try again."}`;
      setMessages((prev) => [...prev, { role: "assistant", content: errMsg }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, user, activeThreadId, companyId, messages, checkAndTrack, createThread, saveMessage, onThreadChange]);

  const suggestions = messages.length === 0
    ? [...SUGGESTED_QUESTIONS, ...(playbook ?? [])]
    : [];

  return (
    <div className="rounded-lg border border-border bg-card flex flex-col h-[420px]">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">AI Research Assistant</h3>
        {sector && playbook && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground font-mono ml-1">{sector} playbook</span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <AttachMenu threadId={activeThreadId} currentCompanyId={companyId} />
          <button
            onClick={startNewThread}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="New thread"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`p-1 rounded transition-colors ${showHistory ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
            title="Thread history"
          >
            <History className="h-3.5 w-3.5" />
          </button>
          <span className="text-[10px] font-mono text-muted-foreground">Gemini 3 Flash</span>
        </div>
      </div>

      {showHistory ? (
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground mb-2">Previous Threads</p>
          {(threads ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground py-4 text-center">No saved threads yet</p>
          )}
          {(threads ?? []).map((t) => (
            <button
              key={t.id}
              onClick={() => switchThread(t)}
              className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors border ${
                activeThreadId === t.id
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "border-border hover:bg-secondary text-foreground"
              }`}
            >
              <p className="font-medium truncate">{t.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {new Date(t.updated_at).toLocaleDateString()}
                {t.deal_id && <span className="ml-1.5">· 📎 Deal</span>}
              </p>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {suggestions.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Ask anything about <span className="text-primary font-medium">{companyName}</span>:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="px-3 py-1.5 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div>
                      <div className="prose prose-sm prose-invert max-w-none [&_p]:mb-2 [&_ul]:mb-2 [&_li]:mb-0.5">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      <div className="flex justify-end mt-1 border-t border-border/30 pt-1">
                        <CopyButton text={msg.content} />
                      </div>
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing...
                </div>
              </div>
            )}
          </div>

          <div className="px-3 py-1.5 border-t border-border/50 bg-muted/20 text-center">
            <p className="text-[9px] text-muted-foreground/60">For informational purposes only — not investment advice.</p>
          </div>
        </>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="px-4 py-3 border-t border-border flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this company..."
          disabled={isLoading}
          className="flex-1 h-9 px-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="h-9 w-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
      <UpgradePrompt open={showUpgrade} onClose={dismissUpgrade} blockedAction={blockedAction} />
    </div>
  );
};

export default AIResearchChat;
