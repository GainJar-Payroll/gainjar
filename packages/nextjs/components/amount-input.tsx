import { Button } from "~~/components/ui/button";
import { Field, FieldError, FieldLabel } from "~~/components/ui/field";
import { Input } from "~~/components/ui/input";

interface AmountInputProps {
  label: string;
  value: number | string;
  onChange: (value: React.ChangeEvent<HTMLInputElement>) => void;
  error?: any;
  maxBalance?: string;
  onMaxClick?: () => void;
  disabled?: boolean;
  placeholder?: string;
  helperText?: string;
}

export function AmountInput({
  label,
  value,
  onChange,
  error,
  maxBalance,
  onMaxClick,
  disabled,
  placeholder = "0.00",
  helperText,
}: AmountInputProps) {
  return (
    <Field data-invalid={!!error}>
      <div className="flex items-center justify-between">
        <FieldLabel className="text-xs uppercase tracking-wider">{label}</FieldLabel>
        {maxBalance && onMaxClick && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-xs uppercase tracking-wider"
            onClick={onMaxClick}
            disabled={disabled}
          >
            Max {maxBalance}
          </Button>
        )}
      </div>
      <Input
        value={value}
        onChange={e => onChange(e)}
        type="number"
        step="0.000001"
        min="0"
        placeholder={placeholder}
        disabled={disabled}
        className="font-mono"
      />
      {error && <FieldError errors={[error]} />}
      {!error && helperText && <p className="text-xs text-muted-foreground mt-1">{helperText}</p>}
    </Field>
  );
}
