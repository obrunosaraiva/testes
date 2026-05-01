import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ className, label, id, ...props }, ref) {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    return (
      <label
        htmlFor={inputId}
        className={cn(
          "flex items-start gap-3 cursor-pointer text-sm text-foreground",
          className,
        )}
      >
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 accent-primary"
          {...props}
        />
        {label != null && <span className="leading-snug">{label}</span>}
      </label>
    );
  },
);
