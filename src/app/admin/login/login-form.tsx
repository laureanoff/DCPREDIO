"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm({ next, initialError }: { next: string; initialError?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, { error: initialError });

  return (
    <form action={action} className="flex w-full flex-col gap-4">
      <input type="hidden" name="next" value={next} />

      <label className="lg-rise lg-field flex flex-col gap-1.5 text-sm" style={{ "--d": "0.5s" } as React.CSSProperties}>
        <span className="text-muted">Usuario</span>
        <input
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          className="h-12 rounded-xl border border-border bg-surface-2 px-4 text-base text-foreground outline-none transition focus:border-lime focus:ring-2 focus:ring-lime/30"
        />
      </label>

      <label className="lg-rise lg-field flex flex-col gap-1.5 text-sm" style={{ "--d": "0.62s" } as React.CSSProperties}>
        <span className="text-muted">Contraseña</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={6}
          className="h-12 rounded-xl border border-border bg-surface-2 px-4 text-base text-foreground outline-none transition focus:border-lime focus:ring-2 focus:ring-lime/30"
        />
      </label>

      {state.error && !pending && (
        <p key={state.error} role="alert" className="lg-shake rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        data-pending={pending || undefined}
        style={{ "--d": "0.78s" } as React.CSSProperties}
        className="lg-rise lg-btn relative h-12 overflow-hidden rounded-xl bg-lime font-[family-name:var(--font-display)] text-lg font-bold uppercase tracking-wide text-black transition hover:bg-lime-dark active:scale-[.98] disabled:cursor-not-allowed"
      >
        <span className="relative z-10 inline-flex items-center justify-center gap-2">
          {pending && <span className="lg-ball" aria-hidden />}
          {pending ? "Ingresando…" : "Ingresar"}
        </span>
      </button>
    </form>
  );
}
