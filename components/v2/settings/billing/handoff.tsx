import { Lock, ShieldCheck } from 'lucide-react';

export function V2BillingHandoff() {
  return (
    <div className="handoff-shell">
      <div className="handoff-card">
        <div className="spinner" aria-hidden />
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
          Ödeme sayfasına yönlendiriliyorsunuz…
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.55 }}>
          iOS uygulamasından Pro plan satın alma akışı başlattın. Apple Pay ve kart ödemeleri için
          Stripe'a yönlendiriliyorsun. Tarayıcı yeniden açıldığında abonelik durumun otomatik
          güncellenir.
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 14,
            marginTop: 16,
            fontSize: 12,
            color: 'var(--text-muted)',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ShieldCheck size={14} strokeWidth={1.75} /> Stripe Checkout
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Lock size={14} strokeWidth={1.75} /> PCI DSS Level 1
          </span>
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 11.5,
            color: 'var(--text-dim)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          handoff.session: bh_••••a8f2
        </div>
      </div>
    </div>
  );
}
