"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import type { ProfileContent } from "@/types";

interface ProfileRevealScreenProps {
  firstName: string;
  profile: ProfileContent;
  shareImageUrl?: string;
}

export function ProfileRevealScreen({
  firstName,
  profile,
  shareImageUrl,
}: ProfileRevealScreenProps) {
  const [shareState, setShareState] = React.useState<
    "idle" | "sharing" | "shared" | "fallback"
  >("idle");

  async function handleShare() {
    if (!shareImageUrl) {
      setShareState("fallback");
      return;
    }
    setShareState("sharing");
    try {
      if (navigator.share && navigator.canShare) {
        const res = await fetch(shareImageUrl);
        const blob = await res.blob();
        const file = new File([blob], "perfil-intimo.png", { type: blob.type });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Eu sou ${profile.name}`,
            text: `Acabei de descobrir meu Perfil Íntimo: ${profile.name}.`,
          });
          setShareState("shared");
          return;
        }
      }
      window.open(shareImageUrl, "_blank", "noopener,noreferrer");
      setShareState("fallback");
    } catch {
      setShareState("fallback");
    }
  }

  return (
    <section className="flex min-h-[100dvh] flex-col items-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-xl space-y-8">
        <p className="text-center text-sm uppercase tracking-[0.3em] text-muted-foreground">
          {firstName}, seu Perfil Íntimo é
        </p>

        <div
          className="space-y-3 rounded-3xl px-6 py-10 text-center text-white shadow-xl sm:px-10 sm:py-14"
          style={{
            background: `linear-gradient(135deg, ${profile.gradientFrom}, ${profile.gradientTo})`,
          }}
        >
          <div className="text-6xl sm:text-7xl">{profile.emoji}</div>
          <h1 className="font-serif text-4xl sm:text-5xl">{profile.name}</h1>
          <p className="text-base italic text-white/90 sm:text-lg">
            {profile.tagline}
          </p>
        </div>

        <div className="space-y-5 px-1">
          {profile.description.map((para, i) => (
            <p key={i} className="text-base leading-relaxed text-foreground">
              {para}
            </p>
          ))}
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-card p-6">
          <h3 className="font-serif text-xl text-foreground">Suas características</h3>
          <ul className="space-y-2 text-foreground">
            {profile.characteristics.map((c, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-2 block h-1 w-1 shrink-0 rounded-full bg-primary" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-card p-6">
          <h3 className="font-serif text-xl text-foreground">3 passos pra começar agora</h3>
          <ol className="space-y-3 text-foreground">
            {profile.recommendations.map((r, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                  {i + 1}
                </span>
                <span>{r}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-2xl border border-accent/40 bg-accent/10 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Mensagem da expert pra você
          </p>
          <p className="mt-2 font-serif text-lg italic leading-relaxed text-foreground">
            “{profile.expertMessage}”
          </p>
        </div>

        <div className="space-y-3">
          <Button
            type="button"
            onClick={handleShare}
            size="lg"
            className="w-full"
            disabled={shareState === "sharing"}
          >
            {shareState === "sharing"
              ? "Preparando..."
              : shareState === "shared"
                ? "Compartilhado!"
                : "Compartilhar nos Stories"}
          </Button>

          {shareState === "fallback" && shareImageUrl && (
            <p className="text-center text-xs text-muted-foreground">
              Toque na imagem que abriu, salve no rolo da câmera e poste como Story.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/60 p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">
            🎁 Você está participando do sorteio das 3 mentorias 1:1
          </p>
          <p className="mt-1">
            E recebe acesso fundador ao próximo programa. Aguarde meu próximo
            passo no seu e-mail. 💛
          </p>
        </div>
      </div>
    </section>
  );
}
