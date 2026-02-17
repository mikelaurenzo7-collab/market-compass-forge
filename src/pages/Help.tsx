import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { HelpCircle, Send, Loader2, ChevronDown, Mail, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { z } from "zod";

const contactSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
  subject: z.string().trim().min(1, "Subject is required").max(200),
  message: z.string().trim().min(1, "Message is required").max(5000),
});

const FAQ_ITEMS = [
  {
    q: "What is Grapevine?",
    a: "Grapevine is an AI-powered private market intelligence platform for PE firms, family offices, and growth equity teams. It combines company screening, AI research, valuation tools, and deal pipeline management in one command center.",
  },
  {
    q: "Where does the data come from?",
    a: "Our data is sourced from SEC EDGAR filings, FRED economic data, Financial Modeling Prep, Firecrawl web intelligence, and user-contributed information. Every data point is tracked with full provenance — source, confidence score, and verification status.",
  },
  {
    q: "What AI features are available?",
    a: "AI Research Chat for company Q&A, Investment Memo generation, Document Analysis (upload CIMs, PPMs, financials), and AI Deal Matching that scores opportunities against your criteria.",
  },
  {
    q: "How does the deal pipeline work?",
    a: "Add any company to your pipeline from the Companies page. Track deals through stages: Sourced → Screening → Due Diligence → IC Review → Term Sheet → Closed. Add notes, collaborate with team members, and log decisions.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. All data is encrypted in transit and at rest. Row-level security ensures you can only access your own pipeline, watchlists, and alerts. We never share your proprietary data with other users.",
  },
  {
    q: "What subscription plans are available?",
    a: "We offer Essential (free trial), Professional, and Institutional tiers. Each tier unlocks additional features like increased API access, team collaboration, and priority data coverage. Visit Settings → Billing for details.",
  },
  {
    q: "Can I access data via API?",
    a: "Yes. Professional and Institutional plans include REST API access. Generate API keys in Settings → API Keys. Full documentation is available in the Developers section.",
  },
  {
    q: "How do alerts and briefings work?",
    a: "Create custom alerts based on sectors, funding rounds, or keywords. Get notified when matching events occur. Morning briefings summarize overnight activity across your watchlists and portfolio.",
  },
];

const Help = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({ email: user?.email ?? "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("support_requests").insert({
      user_id: user?.id ?? null,
      email: parsed.data.email,
      subject: parsed.data.subject,
      message: parsed.data.message,
    });

    if (error) {
      toast.error("Failed to submit request. Please try again or email us directly.");
    } else {
      setSubmitted(true);
      toast.success("Support request submitted!");
    }
    setLoading(false);
  };

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Help & Support</h1>
        </div>
        <p className="text-sm text-muted-foreground">Find answers or get in touch with the team.</p>
      </div>

      {/* FAQ */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Frequently Asked Questions</h2>
        <Accordion type="multiple" className="space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="rounded-lg border border-border bg-card px-4">
              <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-3">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Contact Form */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Contact Us</h2>
        {submitted ? (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-6 text-center space-y-2">
            <Mail className="h-8 w-8 text-primary mx-auto" />
            <p className="text-sm font-semibold text-foreground">Request Submitted</p>
            <p className="text-xs text-muted-foreground">
              We'll get back to you at <span className="text-foreground">{form.email}</span> as soon as possible.
            </p>
            <button
              onClick={() => { setSubmitted(false); setForm({ email: user?.email ?? "", subject: "", message: "" }); }}
              className="text-xs text-primary hover:underline font-medium mt-2"
            >
              Send another request
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-5 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="help-email" className="text-sm text-muted-foreground">Email</label>
              <input
                id="help-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="help-subject" className="text-sm text-muted-foreground">Subject</label>
              <input
                id="help-subject"
                type="text"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="What do you need help with?"
                className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                required
                maxLength={200}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="help-message" className="text-sm text-muted-foreground">Message</label>
              <textarea
                id="help-message"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Describe your issue or question..."
                rows={5}
                className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                required
                maxLength={5000}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !form.email || !form.subject || !form.message}
              className="h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {loading ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        You can also reach us directly at{" "}
        <a href="mailto:contact@grapevine.io" className="text-primary hover:underline">contact@grapevine.io</a>
      </p>
    </div>
  );
};

export default Help;
