"use client";

import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { SpendLineChart } from "@/components/charts/spend-line-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { LayoutDashboard } from "lucide-react";

// Demo data - will be replaced with real API calls
const demoKpis = [
  { label: "Spend Today", value: "$0.00" },
  { label: "Spend 7d", value: "$0.00" },
  { label: "p95 Latency", value: "—" },
  { label: "Incidents", value: "0" },
];

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

      <div className="grid gap-4 md:grid-cols-4">
        {demoKpis.map((kpi) => (
          <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} />
        ))}
      </div>

      <SpendLineChart data={demoSpendData} />

      <EmptyState
        icon={<LayoutDashboard className="h-10 w-10" />}
        title="No data yet"
        description="Connect a provider and create your first route to start seeing data here."
        actionLabel="Get started"
        onAction={() => {}}
      />
    </div>
  );
}
