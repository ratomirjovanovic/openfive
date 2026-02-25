"use client";

import { OrgSwitcher } from "./org-switcher";
import { ProjectSwitcher } from "./project-switcher";
import { EnvSwitcher } from "./env-switcher";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "./theme-toggle";
import { CommandPalette, useCommandPalette } from "./command-palette";
import { Separator } from "@/components/ui/separator";
import { Search } from "lucide-react";

export function Topbar() {
  const { open, setOpen } = useCommandPalette();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-2">
        <OrgSwitcher />
        <Separator orientation="vertical" className="mx-1 h-5" />
        <ProjectSwitcher />
        <Separator orientation="vertical" className="mx-1 h-5" />
        <EnvSwitcher />
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setOpen(true)}
          className="flex h-8 items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search...</span>
          <kbd className="pointer-events-none ml-1 inline-flex h-5 select-none items-center gap-0.5 rounded border border-neutral-200 bg-white px-1.5 font-mono text-[10px] font-medium text-neutral-400 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-400">
            <span className="text-xs">&#8984;</span>K
          </kbd>
        </button>
        <ThemeToggle />
        <UserMenu />
        <CommandPalette open={open} onOpenChange={setOpen} />
      </div>
    </header>
  );
}
