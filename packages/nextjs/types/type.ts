export enum EVaultStatus {
  HEALTHY = 0,
  WARNING = 1,
  CRITICAL = 2,
  EMERGENCY = 3,
}

export const VaultStatusLabel: Record<
  EVaultStatus,
  {
    status: string;
    color: string;
    bgColor: string;
    textColor: string;
    icon: string;
  }
> = {
  [EVaultStatus.HEALTHY]: {
    status: "HEALTHY",
    color: "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20",
    bgColor: "bg-emerald-100/50 dark:bg-emerald-900/20",
    textColor: "text-emerald-900 dark:text-emerald-100",
    icon: "✓",
  },
  [EVaultStatus.WARNING]: {
    status: "WARNING",
    color: "border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20",
    bgColor: "bg-amber-100/50 dark:bg-amber-900/20",
    textColor: "text-amber-900 dark:text-amber-100",
    icon: "⚠",
  },
  [EVaultStatus.CRITICAL]: {
    status: "CRITICAL",
    color: "border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/20",
    bgColor: "bg-orange-100/50 dark:bg-orange-900/20",
    textColor: "text-orange-900 dark:text-orange-100",
    icon: "!",
  },
  [EVaultStatus.EMERGENCY]: {
    status: "EMERGENCY",
    color: "border-destructive bg-destructive/10",
    bgColor: "bg-destructive/20",
    textColor: "text-destructive",
    icon: "🚨",
  },
};
