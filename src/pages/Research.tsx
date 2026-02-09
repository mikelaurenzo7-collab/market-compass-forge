import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, Sparkles, Search } from "lucide-react";
import { useSearchCompanies } from "@/hooks/useData";
import AIResearchChat from "@/components/AIResearchChat";
import InvestmentMemo from "@/components/InvestmentMemo";

const Research = () => {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string; sector?: string | null } | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "memo">("chat");
  const { data: searchResults } = useSearchCompanies(query);

  // Auto-select company from query params (from Screening page)
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
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Research Hub</h1>
        <p className="text-sm text-muted-foreground mt-0.5">AI-powered research and investment memos</p>
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
          {/* Selected company badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-medium text-primary">{selectedCompany.name}</span>
              <button onClick={() => setSelectedCompany(null)} className="text-primary/60 hover:text-primary ml-1 text-xs">✕</button>
            </div>

            {/* Tab Toggle */}
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

          {activeTab === "chat" ? (
            <AIResearchChat companyId={selectedCompany.id} companyName={selectedCompany.name} sector={selectedCompany.sector} />
          ) : (
            <InvestmentMemo companyId={selectedCompany.id} companyName={selectedCompany.name} />
          )}
        </>
      )}

      {!selectedCompany && (
        <div className="flex items-center justify-center h-64 rounded-lg border border-border bg-card">
          <div className="text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">Select a company to begin research</p>
            <p className="text-xs mt-1">Use the search above to find a company, then chat with AI or generate investment memos</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Research;
