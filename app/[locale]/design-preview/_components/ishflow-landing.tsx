'use client';

import Link from 'next/link';
import { EngineSection } from './engine-section';
import { Hero } from './hero';
import { IntroSequence } from './intro-sequence';
import { MarvelsSection } from './marvels-section';
import { ModulesSection } from './modules-section';
import { TopBar } from './top-bar';

export function IshflowLanding() {
  return (
    <main className="relative">
      <IntroSequence />
      <TopBar />
      <Hero />
      <EngineSection />
      <ModulesSection />
      <MarvelsSection />
      <footer className="relative flex items-center justify-between border-white/10 border-t px-6 py-6 text-white/40 text-xs md:px-12">
        <span>© 2026 ishflow — все права защищены</span>
        <Link href="/privacy" className="transition hover:text-white">
          Политика конфиденциальности
        </Link>
      </footer>
    </main>
  );
}
