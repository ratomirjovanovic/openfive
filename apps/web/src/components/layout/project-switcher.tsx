"use client";

import { useAppContext } from "@/providers/context-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FolderOpen, ChevronDown } from "lucide-react";

export function ProjectSwitcher() {
  const { currentProject } = useAppContext();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-sm font-medium">
          <FolderOpen className="h-4 w-4 text-neutral-400" />
          {currentProject?.name || "Select project"}
          <ChevronDown className="h-3 w-3 text-neutral-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem className="text-sm text-muted-foreground">
          No projects yet
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
