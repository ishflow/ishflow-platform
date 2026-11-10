import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function V2LandingCtaBand() {
  return (
    <section className="section container">
      <div className="cta-band">
        <h2>14 gün, sıfır karta gerek yok.</h2>
        <p>
          Demo veriyi tek tıkla yükle, kendi 1C dosyanı sürükle — mevcut iş akışın ilk gün içinde
          çalışır.
        </p>
        <div className="cta-band-actions">
          <Link
            className="btn btn-primary"
            href="/sign-up"
            style={{ height: 44, padding: '0 22px', fontSize: 14.5 }}
          >
            Ücretsiz hesap aç
            <ArrowRight size={16} strokeWidth={2} />
          </Link>
        </div>
      </div>
    </section>
  );
}
