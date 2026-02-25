"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/providers/context-provider";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CreditCard,
  Zap,
  Building2,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";

interface BillingData {
  plan: string;
  planName: string;
  stripeCustomerId: string | null;
  usage: {
    requests: number;
    models: number;
  };
  nextInvoiceDate: string | null;
  cancelAtPeriodEnd: boolean;
}

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "/mo",
    description: "For hobby projects and experimentation",
    features: [
      "1,000 requests/month",
      "2 model routes",
      "Community support",
      "Basic analytics",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$49",
    period: "/mo",
    description: "For growing teams and production workloads",
    features: [
      "50,000 requests/month",
      "Unlimited model routes",
      "Priority support",
      "Advanced analytics",
      "Custom retry policies",
      "Webhook notifications",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$199",
    period: "/mo",
    description: "For large-scale deployments with SLA requirements",
    features: [
      "Unlimited requests",
      "Unlimited model routes",
      "Dedicated support",
      "Full observability suite",
      "SSO & RBAC",
      "Custom SLA",
      "On-premise option",
    ],
  },
];

export default function BillingPage() {
  const { currentOrg } = useAppContext();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const apiPath = currentOrg
    ? `/api/v1/organizations/${currentOrg.id}/billing`
    : null;

  const { data: billing, isLoading } = useQuery<BillingData>({
    queryKey: ["billing", apiPath],
    queryFn: async () => {
      if (!apiPath) throw new Error("No org selected");
      const res = await fetch(apiPath);
      if (!res.ok) throw new Error("Failed to fetch billing info");
      return res.json();
    },
    enabled: !!apiPath,
  });

  const currentPlan = billing?.plan || "free";

  async function handleCheckout(plan: string) {
    if (!currentOrg) return;
    setLoadingPlan(plan);
    try {
      const res = await fetch(
        `/api/v1/organizations/${currentOrg.id}/billing/checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        }
      );
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Error handling
    } finally {
      setLoadingPlan(null);
    }
  }

  async function handlePortal() {
    if (!currentOrg) return;
    setPortalLoading(true);
    try {
      const res = await fetch(
        `/api/v1/organizations/${currentOrg.id}/billing/portal`,
        { method: "POST" }
      );
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Error handling
    } finally {
      setPortalLoading(false);
    }
  }

  if (!currentOrg) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Billing"
          description="Manage your subscription and billing details."
        />
        <Card className="border-neutral-200 shadow-none">
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-sm text-neutral-500">
              Select an organization to view billing information.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Billing"
          description="Manage your subscription and billing details."
        />
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-5 w-5 animate-spin text-neutral-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Manage your subscription and billing details."
        action={
          billing?.stripeCustomerId ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePortal}
              disabled={portalLoading}
              className="gap-2"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {portalLoading ? "Opening..." : "Manage Subscription"}
            </Button>
          ) : undefined
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Current Plan"
          value={billing?.planName || "Free"}
          icon={<CreditCard className="h-4 w-4" />}
        />
        <KpiCard
          label="API Requests"
          value={billing?.usage.requests.toLocaleString() || "0"}
          icon={<Zap className="h-4 w-4" />}
        />
        <KpiCard
          label="Model Routes"
          value={billing?.usage.models.toLocaleString() || "0"}
          icon={<Building2 className="h-4 w-4" />}
        />
      </div>

      {/* Next invoice info */}
      {billing?.nextInvoiceDate && (
        <Card className="border-neutral-200 shadow-none">
          <CardContent className="p-5">
            <p className="text-sm text-neutral-600">
              {billing.cancelAtPeriodEnd
                ? "Your subscription will end on "
                : "Next invoice on "}
              <span className="font-medium text-neutral-900">
                {new Date(billing.nextInvoiceDate).toLocaleDateString(
                  "en-US",
                  {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  }
                )}
              </span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Plans */}
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Plans</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Choose the plan that fits your needs.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const isUpgrade =
            PLANS.findIndex((p) => p.id === plan.id) >
            PLANS.findIndex((p) => p.id === currentPlan);

          return (
            <Card
              key={plan.id}
              className={`border shadow-none ${
                isCurrent
                  ? "border-neutral-900 ring-1 ring-neutral-900"
                  : "border-neutral-200"
              }`}
            >
              <CardContent className="flex flex-col p-5">
                <div>
                  <h3 className="text-base font-semibold text-neutral-900">
                    {plan.name}
                  </h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-bold tracking-tight text-neutral-900">
                      {plan.price}
                    </span>
                    <span className="text-sm text-neutral-500">
                      {plan.period}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-neutral-500">
                    {plan.description}
                  </p>
                </div>

                <ul className="mt-4 flex-1 space-y-2">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-neutral-600"
                    >
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-neutral-400" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="mt-5">
                  {isCurrent ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled
                    >
                      Current Plan
                    </Button>
                  ) : plan.id === "free" ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handlePortal}
                      disabled={!billing?.stripeCustomerId || portalLoading}
                    >
                      {portalLoading ? "Opening..." : "Downgrade"}
                    </Button>
                  ) : (
                    <Button
                      variant={isUpgrade ? "default" : "outline"}
                      className="w-full"
                      onClick={() => handleCheckout(plan.id)}
                      disabled={loadingPlan === plan.id}
                    >
                      {loadingPlan === plan.id
                        ? "Redirecting..."
                        : isUpgrade
                          ? "Upgrade"
                          : "Switch Plan"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
