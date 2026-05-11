import Link from "next/link";
import { Zap, Mic, FileText, Languages, EyeOff, Shield } from "lucide-react";
import { PLANS } from "@ziptalk/shared";
import { formatBRL } from "@/lib/utils";

const features = [
  {
    icon: Mic,
    title: "Transcrição automática",
    desc: "Cada áudio recebido vira texto em segundos, na mesma conversa.",
  },
  {
    icon: FileText,
    title: "Resumo inteligente",
    desc: "Áudios longos viram bullet points objetivos com IA.",
  },
  {
    icon: Languages,
    title: "Tradução em tempo real",
    desc: "Receba áudios em qualquer idioma traduzidos para o seu.",
  },
  {
    icon: EyeOff,
    title: "Transcrição privada",
    desc: "Texto fica só com você. Não aparece na conversa original.",
  },
  {
    icon: Shield,
    title: "Filtro de ofensivas",
    desc: "Mascaramos automaticamente palavras impróprias.",
  },
  {
    icon: Zap,
    title: "Multi-número",
    desc: "Conecte quantos WhatsApps quiser numa só conta.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary" strokeWidth={2.5} />
          <span className="text-xl font-bold">ziptalk</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="cursor-pointer rounded-md px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Entrar
          </Link>
          <Link
            href="/signup"
            className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Começar grátis
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="container py-24 text-center">
        <h1 className="mx-auto max-w-3xl text-5xl font-bold leading-tight tracking-tight md:text-6xl">
          Pare de ouvir áudio.{" "}
          <span className="text-primary">Leia.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Transcrição automática dos áudios do WhatsApp com IA, direto na conversa.
          Sem app extra. Sem copiar e colar.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link
            href="/signup"
            className="cursor-pointer rounded-md bg-accent px-6 py-3 font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
          >
            Começar grátis — 30 min
          </Link>
          <Link
            href="#pricing"
            className="cursor-pointer rounded-md border border-border px-6 py-3 font-semibold transition-colors hover:bg-muted"
          >
            Ver planos
          </Link>
        </div>
      </section>

      {/* Features bento */}
      <section className="container py-16">
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
            >
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container py-24">
        <h2 className="text-center text-3xl font-bold">Planos simples</h2>
        <p className="mt-2 text-center text-muted-foreground">
          Comece grátis. Faça upgrade quando precisar.
        </p>
        <div className="mt-12 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          {Object.entries(PLANS).map(([key, plan]) => (
            <div
              key={key}
              className="flex flex-col rounded-xl border border-border bg-card p-6"
            >
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <div className="mt-4 text-3xl font-bold">
                {plan.priceBRL === 0
                  ? "Grátis"
                  : formatBRL(plan.priceBRL * 100)}
              </div>
              {plan.priceBRL > 0 && (
                <div className="text-sm text-muted-foreground">/mês</div>
              )}
              <div className="mt-4 text-sm text-muted-foreground">
                {plan.minutes} min de áudio
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="container border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Ziptalk. Feito no Brasil.
      </footer>
    </main>
  );
}
