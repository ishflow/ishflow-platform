export function StaticHeroBg() {
  return (
    <div
      aria-hidden="true"
      data-testid="hero-static-bg"
      className="absolute inset-0 overflow-hidden pointer-events-none"
    >
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(50% 50% at 50% 30%, var(--marketing-accent-soft), transparent 70%), radial-gradient(40% 60% at 80% 80%, oklch(72% 0.16 270 / 0.18), transparent 70%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(70% 50% at 50% 30%, black, transparent 80%)',
        }}
      />
    </div>
  );
}
