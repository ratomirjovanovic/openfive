"use client";

import { OrgSwitcher } from "./org-switcher";
import { ProjectSwitcher } from "./project-switcher";
import { EnvSwitcher } from "./env-switcher";
import { UserMenu } from "./user-menu";
import { Separator } from "@/components/ui/separator";

export function Topbar() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-6">
      <div className="flex items-center gap-2">
        <OrgSwitcher />
        <Separator orientation="vertical" className="mx-1 h-5" />
        <ProjectSwitcher />
        <Separator orientation="vertical" className="mx-1 h-5" />
        <EnvSwitcher />
      </div>
      <div className="flex items-center gap-3">
        <UserMenu />
      </div>
    </header>
  );
}
