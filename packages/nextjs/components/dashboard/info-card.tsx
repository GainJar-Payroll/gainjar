export default function InfoCard({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="p-4 bg-accent/20  border-l-4 border-primary space-y-2">
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
          {number}
        </span>
        <h4 className="font-heading font-bold text-foreground">{title}</h4>
      </div>
      <p className="text-sm font-mono text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
