import { FileText } from "lucide-react";

const Research = () => (
  <div className="p-6 space-y-4">
    <div>
      <h1 className="text-xl font-semibold text-foreground">Research</h1>
      <p className="text-sm text-muted-foreground mt-0.5">AI-powered research and investment memos</p>
    </div>
    <div className="flex items-center justify-center h-64 rounded-lg border border-border bg-card">
      <div className="text-center text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Research hub coming soon</p>
      </div>
    </div>
  </div>
);

export default Research;
