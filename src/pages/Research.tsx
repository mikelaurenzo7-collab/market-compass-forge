import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { FileSearch, Sparkles, Search, Brain, BookOpen, MessageSquare, Lightbulb, History, Clock } from "lucide-react";
import { useSearchCompanies } from "@/hooks/useData";
import AIResearchChat from "@/components/AIResearchChat";
import InvestmentMemo from "@/components/InvestmentMemo";
import PageTransition from "@/components/PageTransition";
import { AnimatedTabContent } from "@/components/AnimatedTabs";
import DocumentAnalyzer from "@/pages/DocumentAnalyzer";
import { useResearchThreads, useSearchResearch, type SearchResearchResult } from "@/hooks/useResearchThreads";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const Research = () => {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string; sector?: string | null } | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "memo" | "documents" | "history">("chat");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [researchSearch, setResearchSearch] = useState("");
  const { data: searchResults } = useSearchCompanies(query);
  const { data: allThreads } = useResearchThreads();
  const { data: searchHits } = useSearchResearch(researchSearch);

  // Resolve company names for threads
  const companyIds = useMemo(() => {
    const ids = (allThreads ?? []).map((t) => t.company_id).filter(Boolean) as string[];
    return [...new Set(ids)];
  }, [allThreads]);

  const { data: companyNames } = useQuery({
    queryKey: ["company-names-for-threads", companyIds],
    queryFn: async () => {
      if (!companyIds.length) return {};
      const { data } = await supabase.from("companies").select("id, name").in("id", companyIds);
      const map: Record<string, string> = {};
      (data ?? []).forEach((c) => { map[c.id] = c.name; });
      return map;
    },
    enabled: companyIds.length > 0,
  });

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
    setActiveThreadId(null);
    setActiveTab("chat");
  };

  const openThread = (thread: { id: string; company_id: string | null }) => {
    const cName = thread.company_id ? companyNames?.[thread.company_id] : null;
    if (thread.company_id && cName) {
      setSelectedCompany({ id: thread.company_id, name: cName });
    }
    setActiveThreadId(thread.id);
    setActiveTab("chat");
  };

  const tabs = [
    { key: "chat" as const, label: "AI Research", icon: MessageSquare },
    { key: "memo" as const, label: "Investment Memo", icon: BookOpen },
    { key: "documents" as const, label: "Document Analyzer", icon: FileSearch },
    { key: "history" as const, label: "Saved Research", icon: History },
  ];

  return (
    <PageTransition>
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Research & AI</h1>
        <p className="text-sm text-muted-foreground mt-0.5">AI-powered research, investment memos, and document analysis</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted/30 border border-border w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === tab.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "documents" ? (
        <DocumentAnalyzer />
      ) : activeTab === "history" ? (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={researchSearch}
              onChange={(e) => setResearchSearch(e.target.value)}
              placeholder="Search saved research..."
              className="h-10 w-full pl-9 pr-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Search results */}
          {researchSearch.length >= 2 && searchHits && (
            <div className="space-y-2">
              {searchHits.threads.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Threads</p>
                  {searchHits.threads.map((t) => (
                    <button key={t.id} onClick={() => openThread(t)} className="w-full text-left px-4 py-2.5 rounded-md border border-border hover:bg-secondary transition-colors">
                      <p className="text-sm font-medium text-foreground">{t.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(t.updated_at).toLocaleDateString()}</p>
                    </button>
                  ))}
                </div>
              )}
              {searchHits.messages.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Messages</p>
                  {searchHits.messages.map((m) => (
                    <button key={m.id} onClick={() => openThread({ id: m.thread_id, company_id: m.research_threads.company_id })} className="w-full text-left px-4 py-2.5 rounded-md border border-border hover:bg-secondary transition-colors">
                      <p className="text-xs font-medium text-muted-foreground">{m.research_threads.title}</p>
                      <p className="text-sm text-foreground line-clamp-2 mt-0.5">{m.content.slice(0, 200)}</p>
                    </button>
                  ))}
                </div>
              )}
              {searchHits.threads.length === 0 && searchHits.messages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No results found</p>
              )}
            </div>
          )}

          {/* All threads */}
          {researchSearch.length < 2 && (
            <div className="space-y-1.5">
              {(allThreads ?? []).length === 0 ? (
                <div className="rounded-lg border border-border bg-card p-8 text-center">
                  <History className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No saved research yet. Start a conversation to save it automatically.</p>
                </div>
              ) : (
                (allThreads ?? []).map((t) => (
                  <button key={t.id} onClick={() => openThread(t)} className="w-full text-left px-4 py-3 rounded-md border border-border hover:bg-secondary transition-colors flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{t.title}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                        <Clock className="h-3 w-3" />
                        {new Date(t.updated_at).toLocaleDateString()}
                        {t.company_id && companyNames?.[t.company_id] && (
                          <span className="text-primary">· {companyNames[t.company_id]}</span>
                        )}
                        {t.deal_id && <span>· 📎 Deal</span>}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      ) : (
        <>
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
                  <button onClick={() => { setSelectedCompany(null); setActiveThreadId(null); }} className="text-primary/60 hover:text-primary ml-1 text-xs">✕</button>
                </div>
              </div>
              <AnimatedTabContent activeKey={activeTab}>
                {activeTab === "chat" ? (
                  <AIResearchChat
                    companyId={selectedCompany.id}
                    companyName={selectedCompany.name}
                    sector={selectedCompany.sector}
                    initialThreadId={activeThreadId}
                    onThreadChange={setActiveThreadId}
                  />
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
        </>
      )}
    </div>
    </PageTransition>
  );
};

export default Research;
