import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  ok: "bg-green-50 text-green-700 border-green-200",
  active: "bg-green-50 text-green-700 border-green-200",
  success: "bg-green-50 text-green-700 border-green-200",
  degraded: "bg-yellow-50 text-yellow-700 border-yellow-200",
  warning: "bg-yellow-50 text-yellow-700 border-yellow-200",
  blocked: "bg-red-50 text-red-700 border-red-200",
  error: "bg-red-50 text-red-700 border-red-200",
  critical: "bg-red-50 text-red-700 border-red-200",
  throttled: "bg-orange-50 text-orange-700 border-orange-200",
  fallback: "bg-blue-50 text-blue-700 border-blue-200",
  repair: "bg-purple-50 text-purple-700 border-purple-200",
  down: "bg-red-50 text-red-700 border-red-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
  open: "bg-red-50 text-red-700 border-red-200",
  acknowledged: "bg-yellow-50 text-yellow-700 border-yellow-200",
  resolved: "bg-green-50 text-green-700 border-green-200",
  pending: "bg-neutral-50 text-neutral-600 border-neutral-200",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = variants[status.toLowerCase()] || variants.pending;
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium capitalize", variant, className)}
    >
      {status}
    </Badge>
  );
}
