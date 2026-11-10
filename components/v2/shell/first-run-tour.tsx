'use client';

import { ArrowRight, FileText, Package, TrendingUp, Users, X } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { markFirstRunTourSeenAction } from './first-run-tour-actions';

/**
 * First-run dashboard coachmark. Walks a brand-new owner through the four
 * starting points on the left rail (add a product, define a partner, write the
 * first invoice, see the reports). Rendered by the dashboard server component
 * only when the user hasn't seen it yet; marks itself seen on mount so it shows
 * exactly once. Non-modal spotlight — the real rail chip stays bright and
 * clickable through the dim, matching the "buraya tıkla" prompt.
 *
 * Copy is hardcoded Turkish, consistent with the rest of the onboarding flow.
 */
type Step = {
  /** `data-rail` value on the target rail chip (see `rail.tsx`). */
  rail: string;
  icon: ReactNode;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    rail: 'catalogs',
    icon: <Package size={18} strokeWidth={1.75} />,
    title: 'Ürün ekle',
    body: 'Soldaki menüden Ürünler bölümüne gir, ilk ürününü oluştur ya da CSV ile toplu içe aktar.',
  },
  {
    rail: 'catalogs',
    icon: <Users size={18} strokeWidth={1.75} />,
    title: 'Müşteri / tedarikçi tanımla',
    body: 'Aynı menüden cari kartlarını ekle — faturalarda otomatik tamamlanır.',
  },
  {
    rail: 'documents',
    icon: <FileText size={18} strokeWidth={1.75} />,
    title: 'İlk faturanı yaz',
    body: 'Belgeler bölümünden satış faturanı oluştur, satır ekle ve onayla (post).',
  },
  {
    rail: 'reports',
    icon: <TrendingUp size={18} strokeWidth={1.75} />,
    title: 'Raporları gör',
    body: 'Raporlar bölümünde brüt kar, borç/alacak ve stok değerini anında gör.',
  },
];

const TOOLTIP_WIDTH = 304;
const SPOTLIGHT_PAD = 6;

export function FirstRunTour() {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [visible, setVisible] = useState(true);

  // Persist "seen" once, on mount — independent of how the user dismisses it.
  useEffect(() => {
    markFirstRunTourSeenAction().catch(() => {});
  }, []);

  const measure = useCallback(() => {
    const target = STEPS[stepIndex];
    if (!target) {
      setRect(null);
      return;
    }
    const el = document.querySelector(`[data-rail="${target.rail}"]`);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [stepIndex]);

  useLayoutEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [measure]);

  const step = STEPS[stepIndex];
  if (!visible || !step) return null;

  const isLast = stepIndex === STEPS.length - 1;
  const close = () => setVisible(false);
  const next = () => (isLast ? close() : setStepIndex((i) => i + 1));

  const tooltipLeft = rect ? Math.min(rect.right + 16, window.innerWidth - TOOLTIP_WIDTH - 16) : 80;
  const tooltipTop = rect ? Math.min(rect.top, window.innerHeight - 240) : 96;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9990, pointerEvents: 'none' }}>
      {/* Spotlight: dims the screen everywhere except a ring around the target
          rail chip, which stays bright and clickable (pointer-events: none). */}
      {rect ? (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            top: rect.top - SPOTLIGHT_PAD,
            left: rect.left - SPOTLIGHT_PAD,
            width: rect.width + SPOTLIGHT_PAD * 2,
            height: rect.height + SPOTLIGHT_PAD * 2,
            borderRadius: 14,
            border: '2px solid var(--accent)',
            boxShadow: '0 0 0 9999px rgba(10, 19, 48, 0.55)',
            pointerEvents: 'none',
            transition: 'top .25s ease, left .25s ease, width .25s ease, height .25s ease',
          }}
        />
      ) : (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 19, 48, 0.55)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Tooltip card */}
      <section
        style={{
          position: 'fixed',
          top: tooltipTop,
          left: tooltipLeft,
          width: TOOLTIP_WIDTH,
          maxWidth: 'calc(100vw - 32px)',
          background: 'var(--surface)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          boxShadow: '0 18px 48px rgba(10, 19, 48, 0.28)',
          padding: 18,
          pointerEvents: 'auto',
          transition: 'top .25s ease, left .25s ease',
        }}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Kapat"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            display: 'grid',
            placeItems: 'center',
            width: 26,
            height: 26,
            borderRadius: 8,
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <X size={16} strokeWidth={2} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'var(--accent)',
              color: 'var(--accent-on)',
              flexShrink: 0,
            }}
          >
            {step.icon}
          </span>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, paddingRight: 20 }}>
            {step.title}
          </h3>
        </div>

        <p
          style={{ margin: '0 0 16px', fontSize: 13, lineHeight: 1.5, color: 'var(--text-muted)' }}
        >
          {step.body}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {STEPS.map((s, i) => (
              <span
                key={s.title}
                style={{
                  width: i === stepIndex ? 18 : 6,
                  height: 6,
                  borderRadius: 999,
                  background: i === stepIndex ? 'var(--accent)' : 'var(--border-strong)',
                  transition: 'width .2s ease, background .2s ease',
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={close}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                padding: '6px 4px',
              }}
            >
              Geç
            </button>
            <button
              type="button"
              onClick={next}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                border: 'none',
                background: 'var(--accent)',
                color: 'var(--accent-on)',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 9,
                padding: '8px 14px',
                cursor: 'pointer',
              }}
            >
              {isLast ? 'Bitir' : 'İleri'}
              {!isLast ? <ArrowRight size={15} strokeWidth={2} /> : null}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
