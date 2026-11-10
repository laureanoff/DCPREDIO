"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm({ next, initialError }: { next: string; initialError?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, { error: initialError });

  return (
    <form action={action} className="flex w-full flex-col gap-4">
      <input type="hidden" name="next" value={next} />

      <label className="flex flex-col gap-1.5 text-sm">
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

      <label className="flex flex-col gap-1.5 text-sm">
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

      {state.error && (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-xl bg-lime font-[family-name:var(--font-display)] text-lg font-bold uppercase tracking-wide text-black transition hover:bg-lime-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
