"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export type ThemeChoice = "system" | "light" | "dark";
export const THEME_STORAGE_KEY = "dc-theme";

const OPTIONS: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "Sistema", Icon: Monitor },
  { value: "light", label: "Claro", Icon: Sun },
  { value: "dark", label: "Oscuro", Icon: Moon },
];

const listeners = new Set<() => void>();

function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function apply(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
  try {
    if (choice === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    /* sin almacenamiento: el cambio vale solo para esta visita */
  }
  listeners.forEach((l) => l());
}

/** Selector Sistema / Claro / Oscuro. La preferencia se guarda en el navegador de cada persona. */
export function ThemeToggle({ className, showLabels = false }: { className?: string; showLabels?: boolean }) {
  const current = useSyncExternalStore(subscribe, read, () => "system" as ThemeChoice);

  return (
    <div role="radiogroup" aria-label="Tema de color" className={cn("inline-flex rounded-xl border border-border bg-surface p-0.5", className)}>
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = current === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => apply(value)}
            className={cn(
              "flex h-8 items-center justify-center gap-1.5 rounded-[10px] px-2.5 text-sm transition",
              active ? "bg-lime text-black" : "text-muted hover:text-foreground",
            )}
          >
            <Icon size={16} aria-hidden />
            {showLabels && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
