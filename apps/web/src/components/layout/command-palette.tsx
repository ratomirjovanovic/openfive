"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  PlayCircle,
  ScrollText,
  Radio,
  BarChart3,
  AlertTriangle,
  Route,
  Plug,
  Wallet,
  Database,
  FileText,
  Users,
  Bell,
  Gauge,
  Layers,
  BookOpen,
  CreditCard,
  Settings,
  Plus,
  Key,
  Moon,
  Trash2,
  Cable,
  Clock,
} from "lucide-react";

const RECENT_PAGES_KEY = "openfive:recent-pages";
const MAX_RECENT = 5;

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
}

const navigationItems: NavItem[] = [
  { label: "Overview", href: "/overview", icon: LayoutDashboard, shortcut: "G O" },
  { label: "Playground", href: "/playground", icon: PlayCircle, shortcut: "G P" },
  { label: "Requests", href: "/requests", icon: ScrollText, shortcut: "G R" },
  { label: "Live Logs", href: "/logs", icon: Radio },
  { label: "Analytics", href: "/analytics", icon: BarChart3, shortcut: "G A" },
  { label: "Incidents", href: "/incidents", icon: AlertTriangle },
  { label: "Routes", href: "/routes", icon: Route },
  { label: "Providers", href: "/providers", icon: Plug },
  { label: "Budgets", href: "/budgets", icon: Wallet },
  { label: "Cache", href: "/cache", icon: Database },
  { label: "Templates", href: "/templates", icon: FileText },
  { label: "Users & Roles", href: "/users", icon: Users },
  { label: "Webhooks", href: "/settings/webhooks", icon: Bell },
  { label: "Rate Limits", href: "/settings/rate-limits", icon: Gauge },
  { label: "Environments", href: "/settings/environments", icon: Layers },
  { label: "API Docs", href: "/docs", icon: BookOpen },
  { label: "Billing", href: "/settings/billing", icon: CreditCard },
  { label: "Settings", href: "/settings/general", icon: Settings },
];

interface ActionItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: string;
  shortcut?: string;
}

const actionItems: ActionItem[] = [
  { label: "Create Route", icon: Plus, action: "create-route", shortcut: "C R" },
  { label: "Create API Key", icon: Key, action: "create-api-key", shortcut: "C K" },
  { label: "Create Template", icon: Plus, action: "create-template" },
  { label: "Toggle Dark Mode", icon: Moon, action: "toggle-dark-mode" },
  { label: "Clear Cache", icon: Trash2, action: "clear-cache" },
  { label: "Connect Provider", icon: Cable, action: "connect-provider" },
];

interface RecentPage {
  label: string;
  href: string;
  visitedAt: number;
}

function getRecentPages(): RecentPage[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_PAGES_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as RecentPage[];
  } catch {
    return [];
  }
}

function addRecentPage(label: string, href: string) {
  if (typeof window === "undefined") return;
  try {
    const pages = getRecentPages().filter((p) => p.href !== href);
    pages.unshift({ label, href, visitedAt: Date.now() });
    localStorage.setItem(
      RECENT_PAGES_KEY,
      JSON.stringify(pages.slice(0, MAX_RECENT))
    );
  } catch {
    // Ignore localStorage errors
  }
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [recentPages, setRecentPages] = useState<RecentPage[]>([]);

  useEffect(() => {
    if (open) {
      setRecentPages(getRecentPages());
    }
  }, [open]);

  const navigateTo = useCallback(
    (href: string, label: string) => {
      addRecentPage(label, href);
      onOpenChange(false);
      router.push(href);
    },
    [router, onOpenChange]
  );

  const handleAction = useCallback(
    (action: string) => {
      onOpenChange(false);
      switch (action) {
        case "create-route":
          router.push("/routes");
          break;
        case "create-api-key":
          router.push("/settings/general");
          break;
        case "create-template":
          router.push("/templates");
          break;
        case "toggle-dark-mode":
          document.documentElement.classList.toggle("dark");
          break;
        case "clear-cache":
          router.push("/cache");
          break;
        case "connect-provider":
          router.push("/providers");
          break;
      }
    },
    [router, onOpenChange]
  );

  const getIconForHref = useCallback((href: string) => {
    const item = navigationItems.find((n) => n.href === href);
    return item?.icon || Clock;
  }, []);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command Palette"
      description="Search for pages and actions..."
      showCloseButton={false}
    >
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {recentPages.length > 0 && (
          <>
            <CommandGroup heading="Recent">
              {recentPages.map((page) => {
                const Icon = getIconForHref(page.href);
                return (
                  <CommandItem
                    key={`recent-${page.href}`}
                    value={`recent ${page.label}`}
                    onSelect={() => navigateTo(page.href, page.label)}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{page.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Navigation">
          {navigationItems.map((item) => (
            <CommandItem
              key={item.href}
              value={item.label}
              onSelect={() => navigateTo(item.href, item.label)}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
              {item.shortcut && (
                <CommandShortcut>{item.shortcut}</CommandShortcut>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          {actionItems.map((item) => (
            <CommandItem
              key={item.action}
              value={item.label}
              onSelect={() => handleAction(item.action)}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
              {item.shortcut && (
                <CommandShortcut>{item.shortcut}</CommandShortcut>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { open, setOpen };
}
