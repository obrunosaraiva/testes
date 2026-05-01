import { cn } from "@/lib/utils/cn";

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  ariaLabel?: string;
}

export function Progress({
  value,
  max = 100,
  className,
  ariaLabel,
}: ProgressProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={ariaLabel}
      className={cn(
        "relative h-1.5 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      <div
        className="h-full bg-primary transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
