import { Suspense } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import { BallLoader } from "@/components/ui/Loaders";
import { Logo } from "@/components/brand/Logo";
import { AdminNav } from "@/components/admin/AdminNav";
import { NewBookingAlerts } from "@/components/admin/NewBookingAlerts";
import { SfxToggle } from "@/components/admin/SfxToggle";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { requireStaff } from "@/lib/auth";
import { getPendingCount } from "@/queries/admin";
import { logout } from "../login/actions";

async function PanelShell({ children }: { children: React.ReactNode }) {
  const [staff, pendingCount] = await Promise.all([requireStaff(), getPendingCount()]);
  return (
    <div className="pitch-bg flex flex-1 flex-col">
      <header className="panel-header sticky top-0 z-10 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Logo variant="horizontal" className="h-7" />
        </div>
        <div className="flex items-center gap-2 text-sm sm:gap-3">
          <SfxToggle />
          <ThemeToggle />
          {staff.role === "admin" && (
            <Link href="/admin/configuracion" aria-label="Configuración" title="Configuración" className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground transition hover:border-lime hover:text-lime-ink">
              <Settings size={17} aria-hidden />
            </Link>
          )}
          <span className="hidden text-muted sm:inline">
            {staff.fullName} · {staff.role === "admin" ? "Administrador" : "Personal"}
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-border px-3 py-1.5 text-foreground transition hover:border-lime hover:text-lime-ink"
            >
              Salir
            </button>
          </form>
        </div>
      </header>
      <AdminNav isAdmin={staff.role === "admin"} pendingCount={pendingCount} />
      <div className="flex-1 px-4 py-6">{children}</div>
      <NewBookingAlerts />
    </div>
  );
}

export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<div className="pitch-bg flex flex-1 items-center justify-center"><BallLoader label="Cargando panel…" /></div>}>
      <PanelShell>{children}</PanelShell>
    </Suspense>
  );
}
