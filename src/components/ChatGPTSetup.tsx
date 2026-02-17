import { useState } from "react";
import { Copy, Check, ExternalLink, Bot, Key, FileJson, MessageSquare } from "lucide-react";

const OPENAPI_URL = "https://kilhdiuacbylampaukza.supabase.co/functions/v1/chatgpt-openapi";

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1.5 rounded bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
      title="Copy"
    >
      {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
    </button>
  );
};

const SYSTEM_PROMPT = `You are a private markets intelligence analyst with access to the Grapevine platform API. You can query real-time data on:
- 7,800+ private companies (sectors, financials, funding rounds)
- M&A and deal transactions with valuation multiples
- Distressed assets (bankruptcy, receivership opportunities)
- PE/VC fund performance (IRR, TVPI, DPI)
- Global cross-border opportunities
- Off-market commercial real estate
- AI-generated market intelligence signals
- Macro economic indicators

When answering questions:
1. Always query the API for current data rather than relying on training data
2. Cite specific data points from API responses
3. Provide actionable investment insights
4. Flag data confidence levels when available
5. Use the screening action for complex multi-filter queries
6. Compare companies using financials + funding data together`;

const ChatGPTSetup = () => {
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">ChatGPT Custom GPT Setup</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Give your ChatGPT agent full access to Grapevine's data. Follow these steps to create a Custom GPT with Actions.
        </p>
      </div>

      {/* Step 1 */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">1</span>
          <h3 className="text-sm font-semibold text-foreground">Create a Custom GPT</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Go to <a href="https://chatgpt.com/gpts/editor" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
            ChatGPT GPT Editor <ExternalLink className="h-3 w-3" />
          </a> and click "Create a GPT".
        </p>
      </div>

      {/* Step 2 — System prompt */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">2</span>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Set the Instructions</h3>
        </div>
        <p className="text-xs text-muted-foreground">Paste this into the "Instructions" field:</p>
        <div className="relative group">
          <pre className="bg-background border border-border rounded-md p-3 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
            {SYSTEM_PROMPT}
          </pre>
          <div className="absolute top-2 right-2">
            <button
              onClick={() => { navigator.clipboard.writeText(SYSTEM_PROMPT); setCopiedPrompt(true); setTimeout(() => setCopiedPrompt(false), 2000); }}
              className="p-1.5 rounded bg-secondary/80 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {copiedPrompt ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* Step 3 — Add Action */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">3</span>
          <FileJson className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Add the Action (API Schema)</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          In the GPT editor, go to <strong>Configure → Actions → Create new action</strong>. Click <strong>"Import from URL"</strong> and paste:
        </p>
        <div className="flex items-center gap-2 bg-background border border-border rounded-md px-3 py-2">
          <code className="text-xs font-mono text-primary flex-1 break-all">{OPENAPI_URL}</code>
          <CopyButton text={OPENAPI_URL} />
        </div>
        <p className="text-xs text-muted-foreground">
          Or click <a href={OPENAPI_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
            view the raw schema <ExternalLink className="h-3 w-3" />
          </a> and paste it manually into the "Schema" field.
        </p>
      </div>

      {/* Step 4 — Auth */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">4</span>
          <Key className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Configure Authentication</h3>
        </div>
        <p className="text-xs text-muted-foreground">In the Action settings, set authentication to:</p>
        <div className="space-y-2 text-xs">
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground min-w-[100px]">Auth Type:</span>
            <code className="text-foreground font-mono bg-secondary/50 px-2 py-0.5 rounded">API Key</code>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground min-w-[100px]">API Key:</span>
            <code className="text-foreground font-mono bg-secondary/50 px-2 py-0.5 rounded">lpi_YOUR_KEY_HERE</code>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground min-w-[100px]">Auth Type:</span>
            <code className="text-foreground font-mono bg-secondary/50 px-2 py-0.5 rounded">Bearer</code>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Create an API key in the <strong>API Access</strong> tab above if you haven't already.
        </p>
      </div>

      {/* Step 5 — Test */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">5</span>
          <h3 className="text-sm font-semibold text-foreground">Test It</h3>
        </div>
        <p className="text-xs text-muted-foreground">Try asking your Custom GPT:</p>
        <div className="space-y-1.5">
          {[
            "Show me the top AI/ML companies by revenue",
            "Find distressed assets with more than 30% discount",
            "What M&A deals closed this quarter over $100M?",
            "Compare buyout fund performance by vintage year",
            "Find off-market industrial properties in Texas",
          ].map((q) => (
            <div key={q} className="flex items-center gap-2 text-xs">
              <span className="text-primary">→</span>
              <span className="text-foreground italic">"{q}"</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatGPTSetup;
