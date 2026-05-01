"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { OptionCard } from "@/components/ui/option-card";
import type { Question } from "@/lib/quiz/questions";

export type AnswerValue =
  | { kind: "single"; value: string }
  | { kind: "multi"; values: string[] }
  | { kind: "text"; value: string }
  | { kind: "slider"; value: number }
  | null;

interface QuestionScreenProps {
  question: Question;
  value: AnswerValue;
  onChange: (next: AnswerValue) => void;
  onNext: () => void;
  onBack?: () => void;
  currentIndex: number;
  totalQuestions: number;
  saving?: boolean;
}

export function QuestionScreen({
  question,
  value,
  onChange,
  onNext,
  onBack,
  currentIndex,
  totalQuestions,
  saving,
}: QuestionScreenProps) {
  const canContinue = isAnswered(question, value);

  return (
    <section className="flex min-h-[100dvh] flex-col px-6 py-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
        <header className="space-y-3 pb-6 sm:pb-10">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <span>
              Pergunta {currentIndex + 1} de {totalQuestions}
            </span>
            {question.block > 0 && (
              <span>Bloco {question.block}</span>
            )}
          </div>
          <Progress value={currentIndex + 1} max={totalQuestions} />
        </header>

        <div className="flex flex-1 flex-col">
          <div className="space-y-2 pb-6">
            <h2 className="font-serif text-2xl leading-snug text-foreground sm:text-3xl">
              {question.question}
            </h2>
            {question.helpText && (
              <p className="text-sm text-muted-foreground">{question.helpText}</p>
            )}
          </div>

          <div className="flex-1">
            <QuestionInput
              question={question}
              value={value}
              onChange={onChange}
            />
          </div>
        </div>

        <footer className="flex flex-col-reverse gap-3 pt-8 sm:flex-row sm:justify-between">
          <div>
            {onBack && (
              <Button
                type="button"
                variant="ghost"
                onClick={onBack}
                disabled={saving}
              >
                ← Voltar
              </Button>
            )}
          </div>
          <Button
            type="button"
            size="lg"
            onClick={onNext}
            disabled={!canContinue || saving}
          >
            {saving ? "Salvando..." : "Continuar"}
          </Button>
        </footer>
      </div>
    </section>
  );
}

function isAnswered(question: Question, value: AnswerValue): boolean {
  if (question.optional) return true;
  if (!value) return false;
  switch (value.kind) {
    case "single":
      return value.value.length > 0;
    case "multi":
      return value.values.length > 0;
    case "text":
      return value.value.trim().length > 0;
    case "slider":
      return typeof value.value === "number";
  }
}

function QuestionInput({
  question,
  value,
  onChange,
}: Pick<QuestionScreenProps, "question" | "value" | "onChange">) {
  switch (question.type) {
    case "single_select":
      return (
        <SingleSelect
          options={question.options ?? []}
          selected={value?.kind === "single" ? value.value : null}
          onSelect={(v) => onChange({ kind: "single", value: v })}
        />
      );
    case "multi_select":
      return (
        <MultiSelect
          options={question.options ?? []}
          selected={value?.kind === "multi" ? value.values : []}
          maxSelections={question.maxSelections}
          onChange={(values) => onChange({ kind: "multi", values })}
        />
      );
    case "open_text":
      return (
        <OpenText
          value={value?.kind === "text" ? value.value : ""}
          characterLimit={question.characterLimit}
          onChange={(v) => onChange({ kind: "text", value: v })}
        />
      );
    case "slider":
      return (
        <Slider
          value={value?.kind === "slider" ? value.value : 5}
          min={question.min ?? 0}
          max={question.max ?? 10}
          minLabel={question.minLabel}
          maxLabel={question.maxLabel}
          onChange={(v) => onChange({ kind: "slider", value: v })}
        />
      );
  }
}

function SingleSelect({
  options,
  selected,
  onSelect,
}: {
  options: { value: string; label: string }[];
  selected: string | null;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="grid gap-2.5">
      {options.map((opt) => (
        <OptionCard
          key={opt.value}
          label={opt.label}
          selected={selected === opt.value}
          onSelect={() => onSelect(opt.value)}
        />
      ))}
    </div>
  );
}

function MultiSelect({
  options,
  selected,
  maxSelections,
  onChange,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  maxSelections?: number;
  onChange: (values: string[]) => void;
}) {
  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
      return;
    }
    if (maxSelections && selected.length >= maxSelections) return;
    onChange([...selected, value]);
  }

  return (
    <div className="grid gap-2.5">
      {options.map((opt) => {
        const isSelected = selected.includes(opt.value);
        const isMaxed =
          !!maxSelections &&
          selected.length >= maxSelections &&
          !isSelected;
        return (
          <OptionCard
            key={opt.value}
            multi
            label={opt.label}
            selected={isSelected}
            onSelect={() => toggle(opt.value)}
            disabled={isMaxed}
          />
        );
      })}
    </div>
  );
}

function OpenText({
  value,
  characterLimit,
  onChange,
}: {
  value: string;
  characterLimit?: number;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={characterLimit}
        placeholder="Pode escrever do seu jeito..."
        rows={5}
      />
      {characterLimit && (
        <div className="flex justify-end text-xs text-muted-foreground">
          {value.length}/{characterLimit}
        </div>
      )}
    </div>
  );
}

function Slider({
  value,
  min,
  max,
  minLabel,
  maxLabel,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  minLabel?: string;
  maxLabel?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-6 py-4">
      <div className="text-center">
        <div className="font-serif text-6xl text-primary">{value}</div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          de {max}
        </div>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={1}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      />
      {(minLabel || maxLabel) && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
    </div>
  );
}
