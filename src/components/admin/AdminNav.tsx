"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Agenda", Icon: CalendarDays, match: (p: string) => p === "/admin" },
  { href: "/admin/reservas", label: "Reservas", Icon: ClipboardList, match: (p: string) => p.startsWith("/admin/reservas") },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Secciones del panel" className="flex gap-1 overflow-x-auto border-b border-border bg-background px-3">
      {ITEMS.map(({ href, label, Icon, match }) => {
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
          </Link>
        );
      })}
    </nav>
  );
}
