import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CompTableBuilder from "./CompTableBuilder";
import PrecedentTransactions from "@/components/PrecedentTransactions";
import DCFCalculator from "@/components/DCFCalculator";
import ValuationFootballField from "@/components/ValuationFootballField";
import { Calculator, BarChart3, GitCompare } from "lucide-react";

const Valuations = () => {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Valuation Tools</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Comparable analysis, precedent transactions, and DCF modeling
        </p>
      </div>

      <ValuationFootballField />

      <Tabs defaultValue="comps" className="space-y-4">
        <TabsList className="bg-muted/30 border border-border">
          <TabsTrigger value="comps" className="gap-1.5 text-xs">
            <GitCompare className="h-3.5 w-3.5" /> Comp Analysis
          </TabsTrigger>
          <TabsTrigger value="precedent" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" /> Precedent Transactions
          </TabsTrigger>
          <TabsTrigger value="dcf" className="gap-1.5 text-xs">
            <Calculator className="h-3.5 w-3.5" /> DCF Calculator
          </TabsTrigger>
        </TabsList>

        <TabsContent value="comps">
          <CompTableBuilder embedded />
        </TabsContent>

        <TabsContent value="precedent">
          <PrecedentTransactions />
        </TabsContent>

        <TabsContent value="dcf">
          <DCFCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Valuations;
