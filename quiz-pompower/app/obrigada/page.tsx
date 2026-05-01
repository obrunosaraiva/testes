import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ObrigadaPage() {
  return (
    <section className="flex min-h-[100dvh] flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="text-6xl">💛</div>
        <h1 className="font-serif text-4xl text-foreground">
          Obrigada por compartilhar
        </h1>
        <p className="text-muted-foreground">
          Cada mulher que vê seu perfil pode descobrir o dela. Você acabou de
          ajudar mais alguém.
        </p>
        <Link href="/" className="inline-block">
          <Button variant="outline" size="lg">
            Voltar pro início
          </Button>
        </Link>
      </div>
    </section>
  );
}
