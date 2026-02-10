import { cn } from "~~/lib/utils";

interface TransactionAlertProps {
  type: "warning" | "error" | "info";
  title: string;
  description?: string;
  className?: string;
}

export function TransactionAlert({ type, title, description, className }: TransactionAlertProps) {
  const styles = {
    warning: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-500",
      text: "text-amber-900 dark:text-amber-200",
      icon: "⚠️",
    },
    error: {
      bg: "bg-destructive/10",
      border: "border-destructive",
      text: "text-destructive",
      icon: "⚠️",
    },
    info: {
      bg: "bg-muted/50",
      border: "border-muted-foreground",
      text: "text-muted-foreground",
      icon: "ℹ️",
    },
  };

  const style = styles[type];

  return (
    <div className={cn("p-3 border-l-4 rounded-r", style.bg, style.border, className)}>
      <p className={cn("text-xs font-medium", style.text)}>
        {style.icon} {title}
      </p>
      {description && <p className={cn("text-xs mt-1 font-mono", style.text, "opacity-80")}>{description}</p>}
    </div>
  );
}
