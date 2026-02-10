import { cn } from "~~/lib/utils";

type TransactionStep = {
  label: string;
  status: "idle" | "loading" | "success";
};

interface TransactionProgressProps {
  steps: TransactionStep[];
  className?: string;
}

export function TransactionProgress({ steps, className }: TransactionProgressProps) {
  return (
    <div className={cn("border-l-4 border-foreground pl-6 py-4 bg-muted/20", className)}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-medium">
        Transaction Progress
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center gap-3">
            <div
              className={cn(
                "w-2 h-2 rounded-full flex-shrink-0",
                step.status === "loading" && "bg-primary animate-pulse",
                step.status === "success" && "bg-green-500",
                step.status === "idle" && "bg-muted-foreground/30",
              )}
            />
            <span
              className={cn(
                "text-xs uppercase tracking-wider",
                step.status === "success" && "text-green-500 font-medium",
                step.status !== "success" && "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
