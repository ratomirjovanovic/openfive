import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function KpiCard({ label, value, icon, trend, className }: KpiCardProps) {
  return (
    <Card className={cn("border-neutral-200 shadow-none", className)}>
      <CardContent className="p-5">
        <div className="flex items-center gap-2">
          {icon && <span className="text-neutral-400">{icon}</span>}
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            {label}
          </p>
        </div>
        <div className="mt-1.5 flex items-baseline gap-2">
          <p className="text-2xl font-semibold tracking-tight text-neutral-900">
            {value}
          </p>
          {trend && (
            <span
              className={cn(
                "text-xs font-medium",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}
            >
              {trend.isPositive ? "+" : ""}
              {trend.value}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
