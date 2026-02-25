"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Route,
  ScrollText,
  AlertTriangle,
  Plug,
  Wallet,
  Users,
  Settings,
  CreditCard,
  Radio,
  BarChart3,
  PlayCircle,
  Database,
  FileText,
  BookOpen,
  Bell,
  Gauge,
  Layers,
  FlaskConical,
  Star,
} from "lucide-react";

interface NavSection {
  title?: string;
  items: { label: string; href: string; icon: typeof LayoutDashboard }[];
}

const navSections: NavSection[] = [
  {
    items: [
      { label: "Overview", href: "/overview", icon: LayoutDashboard },
      { label: "Playground", href: "/playground", icon: PlayCircle },
    ],
  },
  {
    title: "Observe",
    items: [
      { label: "Requests", href: "/requests", icon: ScrollText },
      { label: "Live Logs", href: "/logs", icon: Radio },
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
      { label: "Incidents", href: "/incidents", icon: AlertTriangle },
      { label: "Evaluations", href: "/evaluations", icon: Star },
    ],
  },
  {
    title: "Configure",
    items: [
      { label: "Routes", href: "/routes", icon: Route },
      { label: "Providers", href: "/providers", icon: Plug },
      { label: "Budgets", href: "/budgets", icon: Wallet },
      { label: "Cache", href: "/cache", icon: Database },
      { label: "Templates", href: "/templates", icon: FileText },
      { label: "A/B Tests", href: "/ab-tests", icon: FlaskConical },
    ],
  },
  {
    title: "Manage",
    items: [
      { label: "Users & Roles", href: "/users", icon: Users },
      { label: "Webhooks", href: "/settings/webhooks", icon: Bell },
      { label: "Rate Limits", href: "/settings/rate-limits", icon: Gauge },
      { label: "Environments", href: "/settings/environments", icon: Layers },
      { label: "API Docs", href: "/docs", icon: BookOpen },
      { label: "Billing", href: "/settings/billing", icon: CreditCard },
      { label: "Settings", href: "/settings/general", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center gap-2 border-b border-border px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
          O5
        </div>
        <span className="text-sm font-semibold tracking-tight text-foreground">
          OpenFive
        </span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {navSections.map((section, idx) => (
          <div key={idx} className={idx > 0 ? "mt-4" : ""}>
            {section.title && (
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/overview" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors",
                      isActive
                        ? "bg-accent font-medium text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-border px-3 py-3">
        <div className="rounded-md bg-muted px-3 py-2.5">
          <p className="text-xs font-medium text-muted-foreground">Gateway</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            localhost:8787
          </p>
        </div>
      </div>
    </aside>
  );
}
