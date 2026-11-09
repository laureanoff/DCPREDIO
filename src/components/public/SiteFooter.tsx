import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function SiteFooter({ name }: { name: string }) {
  return (
    <footer className="mt-10 border-t border-border px-5 py-8 text-sm text-muted">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <span>© {name}</span>
        <Link href="/mi-reserva" className="underline underline-offset-4 hover:text-foreground">Consultar o cancelar mi reserva</Link>
        <ThemeToggle showLabels />
      </div>
    </footer>
  );
}
