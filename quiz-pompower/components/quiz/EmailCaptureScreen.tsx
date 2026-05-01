"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface EmailCaptureScreenProps {
  onSubmit: (data: {
    firstName: string;
    email: string;
    consentLgpd: true;
  }) => Promise<void> | void;
  loading?: boolean;
  errorMessage?: string;
}

export function EmailCaptureScreen({
  onSubmit,
  loading,
  errorMessage,
}: EmailCaptureScreenProps) {
  const [firstName, setFirstName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);

  function validate(): string | null {
    if (firstName.trim().length < 2) return "Digite seu primeiro nome.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return "E-mail inválido.";
    if (!consent) return "Você precisa aceitar para continuar.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setLocalError(err);
      return;
    }
    setLocalError(null);
    await onSubmit({
      firstName: firstName.trim(),
      email: email.trim().toLowerCase(),
      consentLgpd: true,
    });
  }

  const error = localError ?? errorMessage ?? null;

  return (
    <section className="flex min-h-[100dvh] flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-8">
        <header className="space-y-3 text-center">
          <h2 className="font-serif text-3xl text-foreground sm:text-4xl">
            Antes de começar
          </h2>
          <p className="text-muted-foreground">
            Pra eu te entregar o seu Perfil Íntimo certinho.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="firstName"
              className="text-sm font-medium text-foreground"
            >
              Primeiro nome
            </label>
            <Input
              id="firstName"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Como devo te chamar?"
              required
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-foreground"
            >
              E-mail
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              inputMode="email"
            />
          </div>

          <Checkbox
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            label={
              <>
                Concordo que minhas respostas sejam usadas pra personalizar meu
                Perfil Íntimo e receber comunicações da expert.{" "}
                <span className="text-muted-foreground">
                  As respostas são confidenciais.
                </span>
              </>
            }
          />

          {error && (
            <p
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={loading}
            className="w-full"
          >
            {loading ? "Carregando..." : "Continuar"}
          </Button>
        </form>
      </div>
    </section>
  );
}
