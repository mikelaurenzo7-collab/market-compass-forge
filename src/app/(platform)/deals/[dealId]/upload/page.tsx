"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TopBar } from "@/components/layout/top-bar";
import { UploadZone } from "@/components/ai-upload/upload-zone";
import { getMockDeal } from "@/lib/mock-data";
import type { Deal } from "@/types/deal";

interface UploadPageProps {
  params: { dealId: string };
}

export default function UploadPage({ params }: UploadPageProps) {
  const [deal, setDeal] = useState<Deal | null>(null);

  useEffect(() => {
    const data = getMockDeal(params.dealId);
    if (data) setDeal(data.deal);
  }, [params.dealId]);

  const dealName = deal?.target_company ?? `Deal ${params.dealId}`;

  return (
    <>
      <TopBar
        title="AI Upload Zone"
        description={`Extract documents for ${dealName}`}
      />
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6">
            <Link
              href={`/deals/${params.dealId}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {dealName}
            </Link>
          </div>

          <UploadZone dealId={params.dealId} />
        </div>
      </div>
    </>
  );
}
