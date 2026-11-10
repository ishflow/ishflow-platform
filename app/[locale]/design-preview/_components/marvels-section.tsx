'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowUpRight, MoveRight } from 'lucide-react';
import Link from 'next/link';
import { useRef } from 'react';
import { LineField } from './line-field';
import { ACCENT, EASE } from './motion';
import { Noise } from './noise';
import { StarField } from './star-field';

function InlineChip() {
  return (
    <span className="inline-flex h-10 w-16 items-center justify-center overflow-hidden rounded-md bg-[#0F5EEF] align-middle md:h-20 md:w-32">
      <svg viewBox="0 0 100 50" className="h-full w-full p-2 md:p-3" aria-hidden="true">
        <polyline
          points="0,42 18,34 36,38 54,22 72,26 100,8"
          fill="none"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="100" cy="8" r="5" fill="white" />
      </svg>
    </span>
  );
}

export function MarvelsSection() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '-15%']);

  return (
    <div ref={ref}>
      {/* Top block */}
      <section className="relative overflow-hidden px-6 pt-28 pb-12 md:px-12">
        <StarField count={450} />
        <LineField variant="marvels" />
        <Noise />

        <div className="relative z-[2] mx-auto max-w-7xl">
          <motion.h2
            initial={{ opacity: 0, y: 40, filter: 'blur(16px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 1.2, ease: EASE }}
            className="fd max-w-[1200px] font-medium text-5xl text-white uppercase leading-[0.95] tracking-tight md:text-[80px]"
          >
            Учёт <InlineChip /> без рутины: проводки, остатки и отчёты — сами
          </motion.h2>

          <div className="mt-16 flex items-center justify-between text-white/50 text-xs uppercase tracking-widest">
            <Link
              href="/pricing"
              className="group flex items-center gap-3 transition hover:text-white"
            >
              Смотреть тарифы
              <MoveRight className="-rotate-45 h-3.5 w-3.5 transition group-hover:translate-x-1" />
            </Link>
            <span className="group flex items-center gap-3">
              Листайте дальше
              <MoveRight className="h-3.5 w-3.5 rotate-90 transition group-hover:translate-y-1" />
            </span>
          </div>
        </div>
      </section>

      {/* Bottom block — parallax aurora CTA */}
      <section className="relative h-[80vh] overflow-hidden">
        <motion.div
          aria-hidden
          className="-top-[10%] -bottom-[10%] absolute inset-x-0"
          style={{
            y: bgY,
            background: `
              radial-gradient(60% 50% at 70% 20%, rgba(15,94,239,0.28), transparent 70%),
              radial-gradient(50% 40% at 20% 80%, rgba(15,94,239,0.2), transparent 70%),
              radial-gradient(40% 30% at 50% 50%, rgba(176,233,253,0.08), transparent 60%),
              oklch(0.1 0.02 258)
            `,
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20"
        />
        <LineField variant="marvelsBottom" />
        <Noise />

        <div className="relative z-[2] grid h-full place-items-center px-6 text-center">
          <div>
            <motion.h3
              initial={{ opacity: 0, y: 40, filter: 'blur(16px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 1.2, ease: EASE }}
              className="fd font-black text-4xl text-white uppercase leading-[1] tracking-tight md:text-7xl"
            >
              Начните вести
              <br />
              <span style={{ color: ACCENT }}>современный учёт.</span>
            </motion.h3>
            <div className="flex items-center justify-center gap-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 1, delay: 0.3, ease: EASE }}
                className="mt-10"
              >
                <Link
                  href="/sign-up"
                  className="inline-flex rounded-full bg-white px-6 py-2 font-medium text-black text-sm uppercase transition hover:bg-white/90"
                >
                  Начать бесплатно
                </Link>
              </motion.div>
              <span className="mt-16 flex h-[18.53px] w-[18.86px] items-center justify-center rounded-full border border-white">
                <ArrowUpRight className="h-[5.5px] w-[5.9px]" />
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
