import type { Metadata } from 'next';
import { Golos_Text, Unbounded } from 'next/font/google';
import { IshflowLanding } from './_components/ishflow-landing';

const display = Unbounded({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '700', '900'],
  variable: '--ishf-display',
  display: 'swap',
});

const body = Golos_Text({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600'],
  variable: '--ishf-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ishflow — весь бизнес в потоке',
  description:
    'Продажи, закупки, склад и деньги — в одной системе. Учёт для малого бизнеса, который собирает себя сам.',
  robots: { index: false, follow: false },
};

export default function DesignPreviewPage() {
  return (
    <div
      className={`${display.variable} ${body.variable} ishf relative min-h-screen overflow-x-clip bg-[oklch(0.06_0.005_260)] text-white`}
    >
      {/* Scoped styles for the permanently-dark preview page */}
      <style>{`
        .ishf { font-family: var(--ishf-body), system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
        .ishf .fd { font-family: var(--ishf-display), var(--ishf-body), sans-serif; letter-spacing: -0.01em; }
        .ishf ::selection { background: oklch(0.8 0.13 245); color: oklch(0.08 0.02 260); }
      `}</style>
      <IshflowLanding />
    </div>
  );
}
