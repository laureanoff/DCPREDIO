import { StageCanvas } from "./StageCanvas";

export function FloodlightStage({ children }: { children: React.ReactNode }) {
  return (
    <section id="reservar" data-stage className="stage scroll-mt-20 px-5 py-24 sm:py-32">
      <div aria-hidden className="stage-bg">
        <div className="stage-sky" />
        <div className="stage-floor" />
        <svg className="stage-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
          <ellipse cx="50" cy="88" rx="26" ry="9" fill="none" stroke="#fff" strokeWidth=".35" vectorEffect="non-scaling-stroke" />
          <line x1="0" y1="88" x2="100" y2="88" stroke="#fff" strokeWidth=".35" vectorEffect="non-scaling-stroke" />
        </svg>
        <svg className="stage-cones" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="cone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff6d2" stopOpacity=".75" />
              <stop offset=".6" stopColor="#fff6d2" stopOpacity=".12" />
              <stop offset="1" stopColor="#d6f27a" stopOpacity=".04" />
            </linearGradient>
          </defs>
          <polygon points="9,3 14,3 66,100 -6,100" fill="url(#cone)" style={{ opacity: "var(--l1)" }} />
          <polygon points="86,3 91,3 106,100 34,100" fill="url(#cone)" style={{ opacity: "var(--l2)" }} />
        </svg>
        <div className="stage-pool l" />
        <div className="stage-pool r" />
        <div className="stage-haze" />
        <StageCanvas />
        <div className="lamp l"><span className="lamp-glow" /><div className="lamp-body">{Array.from({ length: 6 }, (_, i) => <i key={i} />)}</div></div>
        <div className="lamp r"><span className="lamp-glow" /><div className="lamp-body">{Array.from({ length: 6 }, (_, i) => <i key={i} />)}</div></div>
      </div>
      <div className="relative">{children}</div>
    </section>
  );
}
