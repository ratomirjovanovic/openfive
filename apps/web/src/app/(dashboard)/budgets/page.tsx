"use client";

import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet } from "lucide-react";

export default function BudgetsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Budgets"
        description="Configure spending limits at org, project, environment, and route levels."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Monthly Budget" value="Not set" />
        <KpiCard label="Spend This Month" value="$0.00" />
        <KpiCard label="Projected End of Month" value="$0.00" />
      </div>

      <EmptyState
        icon={<Wallet className="h-10 w-10" />}
        title="No budgets configured"
        description="Set up spending limits to automatically throttle, downgrade, or block requests when costs exceed your thresholds."
      />
    </div>
  );
}
