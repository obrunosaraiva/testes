export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-xl text-center space-y-4">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          PompoarPower
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl text-foreground">
          Diagnóstico Íntimo
        </h1>
        <p className="text-muted-foreground">
          Descubra seu Perfil Íntimo personalizado em 5 minutos.
        </p>
        <div className="pt-4">
          <button className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-primary-foreground font-medium shadow-sm transition hover:opacity-90">
            Começar meu diagnóstico
          </button>
        </div>
      </div>
    </main>
  );
}
