"use client";

import { TopBar } from "@/components/layout/top-bar";
import { KanbanBoard } from "@/components/command-center/kanban-board";
import { PipelineStats } from "@/components/command-center/pipeline-stats";
import { CreateDealDialog } from "@/components/command-center/create-deal-dialog";

export default function CommandCenterPage() {
  return (
    <>
      <TopBar title="Command Center" description="Deal pipeline at a glance" />
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <PipelineStats />
          <div className="ml-4 shrink-0">
            <CreateDealDialog />
          </div>
        </div>
        <KanbanBoard />
      </div>
    </>
  );
}
