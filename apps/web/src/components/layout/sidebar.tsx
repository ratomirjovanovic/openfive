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
} from "lucide-react";

const navItems = [
  { label: "Overview", href: "/overview", icon: LayoutDashboard },
  { label: "Routes", href: "/routes", icon: Route },
  { label: "Requests", href: "/requests", icon: ScrollText },
  { label: "Incidents", href: "/incidents", icon: AlertTriangle },
  { label: "Providers", href: "/providers", icon: Plug },
  { label: "Budgets", href: "/budgets", icon: Wallet },
  { label: "Users & Roles", href: "/users", icon: Users },
  { label: "Settings", href: "/settings/general", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-neutral-200 bg-white">
      <div className="flex h-14 items-center gap-2 border-b border-neutral-200 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-900 text-xs font-bold text-white">
          O5
        </div>
        <span className="text-sm font-semibold tracking-tight text-neutral-900">
          OpenFive
        </span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/overview" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-neutral-100 font-medium text-neutral-900"
                  : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700"
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-neutral-200 px-3 py-3">
        <div className="rounded-md bg-neutral-50 px-3 py-2.5">
          <p className="text-xs font-medium text-neutral-500">Gateway</p>
          <p className="mt-0.5 text-xs text-neutral-400">
            localhost:8787
          </p>
        </div>
      </div>
    </aside>
  );
}
