import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function V2FeaturesCtaStrip() {
  return (
    <div className="cta-strip">
      <h2>14 gün, sıfır karta gerek yok.</h2>
      <p>Demo veriyi tek tıkla yükle, kendi 1C dosyanı sürükle — iş akışın ilk gün çalışır.</p>
      <div className="actions">
        <Link className="btn btn-primary" href="/sign-up">
          Ücretsiz başla
          <ArrowRight size={16} strokeWidth={2} />
        </Link>
        <Link className="btn btn-secondary" href="/pricing">
          Fiyatları gör
        </Link>
      </div>
    </div>
  );
}
