type LenisLike = { scrollTo: (target: HTMLElement | number, opts?: { offset?: number; duration?: number }) => void };

/** Lleva el scroll suavemente hasta un elemento (usa Lenis si está activo). */
export function scrollToEl(el: HTMLElement | null, offset = 0) {
  if (!el) return;
  const lenis = (window as unknown as { __lenis?: LenisLike }).__lenis;
  if (lenis) {
    lenis.scrollTo(el, { offset, duration: 1.2 });
    return;
  }
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: reduce ? "auto" : "smooth" });
}
