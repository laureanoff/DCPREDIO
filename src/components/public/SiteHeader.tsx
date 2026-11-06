import { Logo } from "@/components/brand/Logo";

export function SiteHeader({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
        <a href="#" className="flex items-center gap-3" aria-label={name}>
          <Logo variant="mark" customLogoUrl={logoUrl} className="h-9 w-auto text-background" />
          <span className="font-[family-name:var(--font-display)] text-xl font-bold uppercase tracking-wide">
            {name}
          </span>
        </a>
        <a
          href="#reservar"
          className="inline-flex h-10 items-center rounded-xl bg-lime px-5 font-[family-name:var(--font-display)] text-base font-bold uppercase tracking-wide text-black transition hover:bg-lime-dark"
        >
          Reservar
        </a>
      </div>
    </header>
  );
}
