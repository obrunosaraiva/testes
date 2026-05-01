"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function WelcomeScreen() {
  return (
    <section className="flex min-h-[100dvh] flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl space-y-8 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          PompoarPower
        </p>

        <div className="space-y-4">
          <h1 className="font-serif text-4xl text-foreground sm:text-5xl">
            Diagnóstico Íntimo
          </h1>
          <p className="text-lg text-muted-foreground">
            Descubra seu Perfil Íntimo personalizado e o próximo passo da sua
            jornada.
          </p>
        </div>

        <ul className="space-y-3 text-left">
          <BenefitRow emoji="✨" text="Seu Perfil Íntimo personalizado em 5 minutos" />
          <BenefitRow
            emoji="🎁"
            text="Conteúdos exclusivos liberados a cada bloco respondido"
          />
          <BenefitRow
            emoji="💎"
            text="Concorrendo a 3 mentorias 1:1 + acesso fundador ao próximo programa"
          />
        </ul>

        <p className="text-sm text-muted-foreground">
          ⏱ Tempo estimado: <span className="font-medium">5 a 8 minutos</span>
        </p>

        <div className="pt-2">
          <Link href="/quiz">
            <Button size="lg" className="w-full sm:w-auto">
              Começar meu diagnóstico
            </Button>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground/80">
          Suas respostas são confidenciais. Nada será compartilhado individualmente.
        </p>
      </div>
    </section>
  );
}

function BenefitRow({ emoji, text }: { emoji: string; text: string }) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/60 p-4">
      <span className="text-2xl leading-none" aria-hidden>
        {emoji}
      </span>
      <span className="text-base text-foreground">{text}</span>
    </li>
  );
}
