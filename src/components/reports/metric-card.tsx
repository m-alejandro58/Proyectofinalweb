import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  className?: string;
  valueClassName?: string;
  trend?: string;
  trendUp?: boolean;
}

export function MetricCard({
  title,
  value,
  subValue,
  icon: Icon,
  className,
  valueClassName,
  trend,
  trendUp,
}: MetricCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-border/50 bg-[#111827] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10",
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>

        <div className="rounded-lg bg-white/5 p-2 border border-white/5">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <div
          className={cn("text-3xl font-bold tracking-tight", valueClassName)}
        >
          {value}
        </div>

        {(trend || subValue) && (
          <div className="mt-3 flex items-center justify-between">
            {trend && (
              <div
                className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  trendUp ? "text-emerald-400" : "text-red-400",
                )}
              >
                {trendUp ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}

                <span>{trend}</span>
              </div>
            )}

            {subValue && (
              <p className="text-xs text-muted-foreground">{subValue}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
