export function SuccessMark({ kind }: { kind: "pending" | "ok" | "no" }) {
  return (
    <div className="success-mark relative mx-auto flex h-28 w-28 items-center justify-center" aria-hidden>
      <span className="success-ring" />
      <span className="success-ring" style={{ animationDelay: "0.7s" }} />
      {kind === "ok" && Array.from({ length: 14 }, (_, i) => (
        <span key={i} className="confetti" style={{ "--a": `${(360 / 14) * i}deg`, "--d": `${0.55 + (i % 4) * 0.08}s` } as React.CSSProperties} />
      ))}
      <svg viewBox="0 0 52 52" className="relative h-24 w-24 text-lime-ink">
        <circle className="success-circle" cx="26" cy="26" r="23" fill="none" stroke="currentColor" strokeWidth="3" />
        {kind === "no" ? (
          <path className="success-check" d="M18 18 L34 34 M34 18 L18 34" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        ) : kind === "pending" ? (
          <path className="success-check" d="M26 14 V27 L34 32" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path className="success-check" d="M15 27 l7 7 l15 -16" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </div>
  );
}
