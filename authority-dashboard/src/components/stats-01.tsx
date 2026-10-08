import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface StatItem {
  id: string;
  name: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: LucideIcon;
  helperText?: string;
}

interface StatsBlockProps {
  stats: StatItem[];
  className?: string;
}

export function StatsBlock({ stats, className }: StatsBlockProps) {
  return (
    <div className={cn("mx-auto grid grid-cols-1 gap-px rounded-xl bg-border sm:grid-cols-2 lg:grid-cols-4", className)}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.id}
            className={cn(
              "rounded-none border-0 shadow-none py-0 bg-background",
              index === 0 && "rounded-l-xl sm:rounded-tl-xl sm:rounded-bl-none lg:rounded-l-xl",
              index === stats.length - 1 && "rounded-r-xl sm:rounded-br-xl sm:rounded-tr-none lg:rounded-r-xl",
              // For 2-col layout on sm screens
              stats.length >= 2 && index === 1 && "sm:rounded-tr-xl lg:rounded-none",
              stats.length >= 3 && index === stats.length - 2 && "sm:rounded-bl-xl lg:rounded-none"
            )}
          >
            <CardContent className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 p-4 sm:p-6">
              <div className="flex items-center gap-2">
                {Icon && (
                  <div className="p-2 rounded-lg bg-muted">
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                )}
                <div className="text-sm font-medium text-muted-foreground">
                  {stat.name}
                </div>
              </div>
              {stat.change && (
                <div
                  className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-full",
                    stat.changeType === "positive"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : stat.changeType === "negative"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  )}
                >
                  {stat.changeType === "positive" ? "▲" : stat.changeType === "negative" ? "▼" : ""} {stat.change}
                </div>
              )}
              <div className="w-full flex-none text-3xl font-bold tracking-tight text-foreground">
                {stat.value}
              </div>
              {stat.helperText && (
                <div className="w-full text-xs text-muted-foreground">
                  {stat.helperText}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Primary stat card for highlighted metrics (like SOS Alerts)
interface PrimaryStatCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  change?: string;
  helperText?: string;
  variant?: "danger" | "warning" | "success" | "info";
}

export function PrimaryStatCard({
  icon: Icon,
  title,
  value,
  change,
  helperText,
  variant = "danger",
}: PrimaryStatCardProps) {
  const variantStyles = {
    danger: {
      bg: "bg-gradient-to-br from-red-500 to-red-600",
      iconBg: "bg-red-600/50",
      text: "text-white",
      subtext: "text-red-100",
      badge: "bg-red-600/80 text-white",
    },
    warning: {
      bg: "bg-gradient-to-br from-orange-500 to-orange-600",
      iconBg: "bg-orange-600/50",
      text: "text-white",
      subtext: "text-orange-100",
      badge: "bg-orange-600/80 text-white",
    },
    success: {
      bg: "bg-gradient-to-br from-green-500 to-green-600",
      iconBg: "bg-green-600/50",
      text: "text-white",
      subtext: "text-green-100",
      badge: "bg-green-600/80 text-white",
    },
    info: {
      bg: "bg-gradient-to-br from-blue-500 to-blue-600",
      iconBg: "bg-blue-600/50",
      text: "text-white",
      subtext: "text-blue-100",
      badge: "bg-blue-600/80 text-white",
    },
  };

  const styles = variantStyles[variant];

  return (
    <Card className={cn("relative overflow-hidden rounded-2xl border-0 shadow-lg", styles.bg)}>
      <CardContent className="p-6 h-full flex flex-col justify-between min-h-[180px]">
        <div className="flex justify-between items-start mb-4">
          <div className={cn("p-3 rounded-xl", styles.iconBg)}>
            <Icon className={cn("h-6 w-6", styles.text)} />
          </div>
          {change && (
            <div className={cn("flex items-center px-2 py-1 rounded-lg text-xs font-bold", styles.badge)}>
              ▲ {change}
            </div>
          )}
        </div>

        <div>
          <p className={cn("text-xs font-bold uppercase tracking-wider mb-1", styles.subtext)}>
            {title}
          </p>
          <h3 className={cn("text-4xl font-bold tracking-tight mb-1", styles.text)}>
            {value}
          </h3>
          {helperText && (
            <p className={cn("text-xs", styles.subtext)}>{helperText}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Default export for the demo/preview version
export default function Stats01() {
  const data: StatItem[] = [
    {
      id: "1",
      name: "Profit",
      value: "$287,654.00",
      change: "8.32%",
      changeType: "positive",
    },
    {
      id: "2",
      name: "Late payments",
      value: "$9,435.00",
      change: "12.64%",
      changeType: "negative",
    },
    {
      id: "3",
      name: "Pending orders",
      value: "$173,229.00",
      change: "2.87%",
      changeType: "positive",
    },
    {
      id: "4",
      name: "Operating costs",
      value: "$52,891.00",
      change: "5.73%",
      changeType: "negative",
    },
  ];

  return (
    <div className="flex items-center justify-center p-10">
      <StatsBlock stats={data} />
    </div>
  );
}
