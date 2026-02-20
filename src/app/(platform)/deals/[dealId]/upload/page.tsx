import { TopBar } from "@/components/layout/top-bar";

interface UploadPageProps {
  params: { dealId: string };
}

/**
 * AI Upload Zone — scoped to a specific deal.
 * Phase 5 will build the drag-and-drop interface with animated extraction states.
 */
export default function UploadPage({ params }: UploadPageProps) {
  return (
    <>
      <TopBar
        title="AI Upload Zone"
        description={`Upload documents for Deal ${params.dealId}`}
      />
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-lg border-2 border-dashed border-border bg-card p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <svg
              className="h-6 w-6 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-foreground">
            Drop CIM, Rent Roll, or ESA here
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF, DOCX, or XLSX up to 10MB. AI will extract OpCo and PropCo data automatically.
          </p>
        </div>
      </div>
    </>
  );
}
