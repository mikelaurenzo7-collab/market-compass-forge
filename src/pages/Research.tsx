import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FileText, Sparkles, Search, Brain, FileSearch, BookOpen, MessageSquare, Lightbulb } from "lucide-react";
import { useSearchCompanies } from "@/hooks/useData";
import AIResearchChat from "@/components/AIResearchChat";
import InvestmentMemo from "@/components/InvestmentMemo";
import PageTransition from "@/components/PageTransition";
import { AnimatedTabContent } from "@/components/AnimatedTabs";

const Research = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string; sector?: string | null } | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "memo">("chat");
  const { data: searchResults } = useSearchCompanies(query);

  useEffect(() => {
    const companyId = searchParams.get("company");
    const companyName = searchParams.get("name");
    if (companyId && companyName && !selectedCompany) {
      setSelectedCompany({
        id: companyId,
        name: companyName,
        sector: searchParams.get("sector") || null,
      });
    }
  }, [searchParams]);

  const selectCompany = (company: { id: string; name: string; sector?: string | null }) => {
    setSelectedCompany(company);
    setQuery("");
  };

  return (
    <PageTransition>
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Research & AI</h1>
          <p className="text-sm text-muted-foreground mt-0.5">AI-powered research, investment memos, and document analysis</p>
        </div>
        <button
          onClick={() => navigate("/documents")}
          className="h-9 px-4 rounded-md border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors inline-flex items-center gap-2"
        >
          <FileSearch className="h-4 w-4" />
          Document Analyzer
        </button>
      </div>

      {/* Company Selector */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={selectedCompany ? "" : query}
          onChange={(e) => { setQuery(e.target.value); setSelectedCompany(null); }}
          placeholder={selectedCompany ? `Researching: ${selectedCompany.name}` : "Search for a company to research..."}
          className="h-10 w-full pl-9 pr-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {query.length >= 2 && searchResults && searchResults.length > 0 && !selectedCompany && (
          <div className="absolute z-10 top-full mt-1 w-full rounded-md border border-border bg-popover shadow-lg overflow-hidden">
            {searchResults.map((c) => (
              <button
                key={c.id}
                onClick={() => selectCompany(c)}
                className="w-full text-left px-4 py-2.5 hover:bg-secondary transition-colors flex items-center justify-between"
              >
                <span className="text-sm font-medium text-foreground">{c.name}</span>
                <span className="text-[11px] text-muted-foreground">{c.sector ?? ""} · {c.stage ?? ""}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedCompany && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-medium text-primary">{selectedCompany.name}</span>
              <button onClick={() => setSelectedCompany(null)} className="text-primary/60 hover:text-primary ml-1 text-xs">✕</button>
            </div>
            <div className="flex gap-1">
              {(["chat", "memo"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "chat" ? "AI Research" : "Investment Memo"}
                </button>
              ))}
            </div>
          </div>
          <AnimatedTabContent activeKey={activeTab}>
            {activeTab === "chat" ? (
              <AIResearchChat companyId={selectedCompany.id} companyName={selectedCompany.name} sector={selectedCompany.sector} />
            ) : (
              <InvestmentMemo companyId={selectedCompany.id} companyName={selectedCompany.name} />
            )}
          </AnimatedTabContent>
        </>
      )}

      {!selectedCompany && (
        <div className="rounded-lg border border-border bg-card p-8">
          <div className="max-w-lg mx-auto text-center space-y-6">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Brain className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">AI-Powered Company Research</h2>
              <p className="text-sm text-muted-foreground">Search for any company to unlock deep analysis, generate investment memos, and chat with AI about financials and strategy.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-border p-3 text-left">
                <MessageSquare className="h-4 w-4 text-primary mb-2" />
                <p className="text-xs font-medium text-foreground">AI Chat</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Ask questions about any company's strategy, risks, and competitive position</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-left">
                <BookOpen className="h-4 w-4 text-primary mb-2" />
                <p className="text-xs font-medium text-foreground">Investment Memos</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Generate institutional-quality memos with one click</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-left">
                <Lightbulb className="h-4 w-4 text-primary mb-2" />
                <p className="text-xs font-medium text-foreground">Deep Insights</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Surface risks, opportunities, and data-driven recommendations</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </PageTransition>
  );
};

export default Research;
