import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function SiteFooter({ name }: { name: string }) {
  return (
    <footer className="relative mt-16 px-5 pb-8 pt-12 text-sm text-muted">
      <div aria-hidden className="grass-edge"><i /><i /></div>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <span>© {name}</span>
        <Link href="/mi-reserva" className="underline underline-offset-4 hover:text-foreground">Consultar o cancelar mi reserva</Link>
        <ThemeToggle showLabels />
      </div>
    </footer>
  );
}
