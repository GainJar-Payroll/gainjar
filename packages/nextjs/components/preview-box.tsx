import { cn } from "~~/lib/utils";

interface PreviewItem {
  label: string;
  value: string;
  highlight?: boolean;
  small?: boolean;
}

interface PreviewBoxProps {
  title: string;
  items: PreviewItem[];
  footer?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function PreviewBox({ title, items, footer, children, className }: PreviewBoxProps) {
  return (
    <div className={cn("border-2 border-foreground p-6 bg-background", className)}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-4 font-medium">{title}</div>

      <div className="space-y-2 mb-4">
        {items.map((item, index) => (
          <div key={index} className="flex justify-between items-baseline gap-4">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">{item.label}</span>
            <span
              className={cn(
                "font-mono",
                item.highlight && "font-bold",
                item.small && "text-sm",
                !item.small && !item.highlight && "text-base",
              )}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>

      {children}

      {footer && <div className="border-t border-border pt-4 mt-4">{footer}</div>}
    </div>
  );
}
