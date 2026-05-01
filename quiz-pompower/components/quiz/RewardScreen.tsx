"use client";

import { Button } from "@/components/ui/button";

interface RewardScreenProps {
  blockNumber: 1 | 2;
  onContinue: () => void;
}

const REWARDS = {
  1: {
    title: "Os 3 sinais que seu corpo dá quando precisa de mais que pompoarismo",
    description:
      "Antes de continuar, separa 3 minutos pra ver isso. Vai mudar como você ouve seu corpo no resto do quiz.",
    nextLabel: "Continuar pro Bloco 2",
  },
  2: {
    title: "O próximo passo é seu",
    description:
      "Você está concorrendo a 3 mentorias 1:1 e tem acesso fundador ao próximo programa. Em segundos, libero seu Perfil Íntimo.",
    nextLabel: "Ver meu Perfil Íntimo",
  },
} as const;

export function RewardScreen({ blockNumber, onContinue }: RewardScreenProps) {
  const reward = REWARDS[blockNumber];

  return (
    <section className="flex min-h-[100dvh] flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl space-y-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-foreground">
          🎁 Desbloqueado
        </span>

        <h2 className="font-serif text-3xl text-foreground sm:text-4xl">
          {reward.title}
        </h2>

        <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-muted">
          {/* Placeholder do vídeo. Trocar por iframe Vimeo/Cloudflare Stream
              quando os vídeos da expert estiverem hospedados. */}
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            🎥 Vídeo da expert (placeholder)
          </div>
        </div>

        <p className="text-base text-muted-foreground">{reward.description}</p>

        <div className="pt-2">
          <Button size="lg" onClick={onContinue} className="w-full sm:w-auto">
            {reward.nextLabel}
          </Button>
        </div>
      </div>
    </section>
  );
}
