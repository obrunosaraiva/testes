"use client";

import * as React from "react";

const MESSAGES = [
  "Analisando suas respostas...",
  "Encontrando padrões...",
  "Revelando seu Perfil...",
];

export function CalculatingScreen() {
  const [idx, setIdx] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setIdx((prev) => (prev + 1) % MESSAGES.length);
    }, 1300);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="flex min-h-[100dvh] flex-col items-center justify-center px-6 py-12">
      <div className="space-y-8 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <span className="text-4xl">✨</span>
        </div>
        <p
          aria-live="polite"
          className="font-serif text-2xl text-foreground transition-opacity duration-300"
        >
          {MESSAGES[idx]}
        </p>
        <div className="flex justify-center gap-2">
          {MESSAGES.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === idx ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
