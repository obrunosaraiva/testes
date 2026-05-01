"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface OptionCardProps {
  label: string;
  selected: boolean;
  onSelect: () => void;
  multi?: boolean;
  disabled?: boolean;
}

export function OptionCard({
  label,
  selected,
  onSelect,
  multi,
  disabled,
}: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border-2 px-4 py-3.5 text-left text-base transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        selected
          ? "border-primary bg-primary/5 text-foreground"
          : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/40",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center border-2 transition-colors",
          multi ? "rounded" : "rounded-full",
          selected ? "border-primary bg-primary" : "border-border bg-card",
        )}
        aria-hidden
      >
        {selected && (
          <span
            className={cn(
              multi ? "block h-2.5 w-2.5 rounded-sm bg-primary-foreground" : "block h-2 w-2 rounded-full bg-primary-foreground",
            )}
          />
        )}
      </span>
      <span className="flex-1 leading-snug">{label}</span>
    </button>
  );
}
