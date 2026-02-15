import { Info, OctagonX, TriangleAlert } from "lucide-react";
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
      bg: "bg-amber-50",
      border: "border-amber-500",
      text: "text-amber-900 dark:text-amber-200",
      icon: <TriangleAlert size={18} className="inline" />,
    },
    error: {
      bg: "bg-destructive/10",
      border: "border-destructive",
      text: "text-destructive",
      icon: <OctagonX size={18} className="inline" />,
    },
    info: {
      bg: "bg-muted/50",
      border: "border-muted-foreground",
      text: "text-muted-foreground",
      icon: <Info size={18} className="inline" />,
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
