"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, ClipboardList, Clock, Coffee, Database, Dumbbell, Film, Lock, MessageCircle, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS: { href: string; label: string; Icon: typeof BarChart3; match: (p: string) => boolean; adminOnly?: boolean }[] = [
  { href: "/admin", label: "Agenda", Icon: CalendarDays, match: (p: string) => p === "/admin" },
  { href: "/admin/reservas", label: "Reservas", Icon: ClipboardList, match: (p: string) => p.startsWith("/admin/reservas") },
  { href: "/admin/avisos", label: "Avisos", Icon: MessageCircle, match: (p: string) => p.startsWith("/admin/avisos") },
  { href: "/admin/espera", label: "Espera", Icon: Clock, match: (p: string) => p.startsWith("/admin/espera") },
  { href: "/admin/bloqueos", label: "Bloqueos", Icon: Lock, match: (p: string) => p.startsWith("/admin/bloqueos") },
  { href: "/admin/buffet", label: "Buffet", Icon: Coffee, match: (p: string) => p.startsWith("/admin/buffet") },
  { href: "/admin/entrenamientos", label: "Entrenamientos", Icon: Dumbbell, match: (p: string) => p.startsWith("/admin/entrenamientos") },
  { href: "/admin/estadisticas", label: "Estadísticas", Icon: BarChart3, match: (p: string) => p.startsWith("/admin/estadisticas"), adminOnly: true },
  { href: "/admin/galeria", label: "Galería", Icon: Film, match: (p: string) => p.startsWith("/admin/galeria"), adminOnly: true },
  { href: "/admin/respaldos", label: "Respaldos", Icon: Database, match: (p: string) => p.startsWith("/admin/respaldos"), adminOnly: true },
  { href: "/admin/usuarios", label: "Empleados", Icon: Users, match: (p: string) => p.startsWith("/admin/usuarios"), adminOnly: true },
  { href: "/admin/configuracion", label: "Configuración", Icon: Settings, match: (p: string) => p.startsWith("/admin/configuracion"), adminOnly: true },
];

export function AdminNav({ isAdmin, pendingCount = 0 }: { isAdmin: boolean; pendingCount?: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Secciones del panel" className="panel-nav flex gap-1 overflow-x-auto border-b border-border px-3">
      {ITEMS.filter((i) => !i.adminOnly || isAdmin).map(({ href, label, Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition",
              active ? "border-lime text-foreground" : "border-transparent text-muted hover:text-foreground",
            )}
          >
            <Icon size={16} aria-hidden />
            {label}
            {href === "/admin/avisos" && pendingCount > 0 && (
              <span className="rounded-full bg-warning px-1.5 text-xs font-bold text-black" aria-label={`${pendingCount} por confirmar`}>
                {pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
