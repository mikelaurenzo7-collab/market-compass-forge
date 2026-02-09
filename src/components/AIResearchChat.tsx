import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bot, Send, Loader2, Sparkles, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "@/hooks/use-toast";

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

const AIResearchChat = ({ companyId, companyName, sector }: { companyId: string; companyName: string; sector?: string | null }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const playbook = sector ? PLAYBOOK_PROMPTS[sector] : undefined;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (question: string) => {
    if (!question.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

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
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ ${e.message || "Something went wrong. Please try again."}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

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
        <span className="text-[10px] font-mono text-muted-foreground ml-auto">Gemini 3 Flash</span>
      </div>

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
    </div>
  );
};

export default AIResearchChat;
