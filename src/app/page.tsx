import { Logo } from "@/components/brand/Logo";
import { BRAND } from "@/config/brand";

/** Pantalla provisoria de Fase 1. La página pública real (calendario y reservas) se construye en la Fase 3. */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center text-white">
      <Logo variant="full" className="h-44 w-auto text-background" />
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase tracking-wide">
        {BRAND.name}
      </h1>
      <p className="max-w-sm text-sm text-muted">Estamos preparando el sistema de reservas online.</p>
    </main>
  );
}
