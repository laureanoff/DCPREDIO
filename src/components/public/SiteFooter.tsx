import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function SiteFooter({ name }: { name: string }) {
  return (
    <footer className="mt-10 border-t border-border px-5 py-8 text-sm text-muted">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <span>© {name}</span>
        <ThemeToggle showLabels />
        <a href="/admin" className="transition hover:text-lime-ink">Acceso personal</a>
      </div>
    </footer>
  );
}
