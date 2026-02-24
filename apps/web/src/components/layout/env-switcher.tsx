"use client";

import { useAppContext } from "@/providers/context-provider";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const tierColors: Record<string, string> = {
  production: "bg-green-100 text-green-700 border-green-200",
  staging: "bg-yellow-100 text-yellow-700 border-yellow-200",
  development: "bg-blue-100 text-blue-700 border-blue-200",
};

export function EnvSwitcher() {
  const { currentEnv } = useAppContext();
  const tier = currentEnv?.tier || "development";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "cursor-pointer text-xs font-medium",
            tierColors[tier] || tierColors.development
          )}
        >
          {currentEnv?.name || "No environment"}
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem className="text-sm text-muted-foreground">
          No environments yet
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
