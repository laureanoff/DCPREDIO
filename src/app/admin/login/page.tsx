import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Logo } from "@/components/brand/Logo";
import { BRAND } from "@/config/brand";
import { getStaff, safeAdminPath } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Ingresar" };

async function LoginContent({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const target = safeAdminPath(next);

  if (await getStaff()) redirect(target);

  const initialError = error === "unauthorized" ? "Tu usuario no tiene acceso al panel." : undefined;
  return <LoginForm next={target} initialError={initialError} />;
}

export default function LoginPage(props: PageProps<"/admin/login">) {
  return (
    <main className="pitch-bg relative flex flex-1 items-center justify-center overflow-hidden px-5 py-10">
      <div aria-hidden className="lg-beam l" />
      <div aria-hidden className="lg-beam r" />
      <div className="lg-card relative flex w-full max-w-sm flex-col items-center gap-8 rounded-3xl border border-border bg-surface p-8">
        <div className="lg-logo">
          <Logo variant="full" className="h-32 w-auto text-surface" />
        </div>
        <div className="lg-rise text-center" style={{ "--d": "0.35s" } as React.CSSProperties}>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold uppercase tracking-wide">
            Panel de {BRAND.name}
          </h1>
          <p className="mt-1 text-sm text-muted">Acceso solo para personal autorizado</p>
        </div>
        <Suspense fallback={<div className="skeleton h-56 w-full rounded-xl bg-surface-2" />}>
          <LoginContent searchParams={props.searchParams as Promise<{ next?: string; error?: string }>} />
        </Suspense>
      </div>
    </main>
  );
}
