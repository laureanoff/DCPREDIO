"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resendNotification } from "./actions";

export function ResendButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await resendNotification(id);
            if (!r.ok) setError(r.error);
            router.refresh();
          })
        }
        className="h-9 rounded-xl border border-border px-3 text-sm font-semibold transition hover:border-lime disabled:opacity-50"
      >
        {pending ? "Enviando…" : "Reintentar"}
      </button>
      {error && <span role="alert" className="sr-only">{error}</span>}
    </>
  );
}
