"use client";

import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { SpendLineChart } from "@/components/charts/spend-line-chart";
import { SetupChecklist } from "@/components/onboarding/setup-checklist";
import { DollarSign, Clock, AlertTriangle, Activity } from "lucide-react";

const demoSpendData = [
  { date: "Mon", spend: 0 },
  { date: "Tue", spend: 0 },
  { date: "Wed", spend: 0 },
  { date: "Thu", spend: 0 },
  { date: "Fri", spend: 0 },
  { date: "Sat", spend: 0 },
  { date: "Sun", spend: 0 },
];

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Monitor your LLM inference costs, routes, and incidents."
      />

      <SetupChecklist />

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard
          label="Spend Today"
          value="$0.00"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KpiCard
          label="Spend 7d"
          value="$0.00"
          icon={<Activity className="h-4 w-4" />}
        />
        <KpiCard
          label="p95 Latency"
          value="—"
          icon={<Clock className="h-4 w-4" />}
        />
        <KpiCard
          label="Incidents"
          value="0"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      <SpendLineChart data={demoSpendData} />
    </div>
  );
}
