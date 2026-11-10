'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { FileText, Package, Smartphone, TrendingUp, Wallet } from 'lucide-react';
import { type ReactNode, useEffect, useRef } from 'react';
import { LineField } from './line-field';
import { MATTE, blurIn, photoIn } from './motion';
import { Noise } from './noise';
import { StarField } from './star-field';
import { ArApCard, BarsCard, CashCard, DocCard, KpiCard, PhoneCard, StockCard } from './ui-cards';

function FloatCard({
  i,
  depth,
  className,
  badge,
  overlay,
  children,
}: {
  i: number;
  depth: number;
  className: string;
  badge?: ReactNode;
  overlay?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={`absolute z-20 ${className}`}
      style={{
        transform: `translate3d(calc(var(--mx, 0) * ${depth}px), calc(var(--my, 0) * ${depth}px), 0)`,
        transition: 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <motion.div
        variants={photoIn}
        initial="hidden"
        animate="show"
        custom={i}
        className="group relative h-full w-full overflow-hidden shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] ring-1 ring-white/10"
      >
        <div className="h-full w-full transition-transform duration-[1200ms] group-hover:scale-105">
          {children}
        </div>
        {badge && (
          <div className="absolute right-2 bottom-2 grid h-6 w-6 place-items-center rounded-md bg-black/40 text-white/80 backdrop-blur-sm">
            {badge}
          </div>
        )}
        {overlay}
      </motion.div>
    </div>
  );
}

function DemoOverlay() {
  return (
    <div className="pointer-events-none absolute bottom-14 left-4 flex items-center gap-2.5">
      <div className="relative grid place-items-center">
        <span className="absolute h-[55px] w-[55px] rounded-full bg-white/30 blur-[10px]" />
        <span className="absolute h-[38px] w-[38px] rounded-full bg-white/50 blur-[4px]" />
        <span className="block h-[25px] w-[25px] rounded-full bg-white shadow-[0_0_18px_4px_rgba(255,255,255,0.7)]" />
      </div>
      <span className="grid h-[39px] w-[119px] place-items-center rounded-full border border-white/15 bg-black/35 text-[13px] text-white backdrop-blur-md">
        Открыть демо
      </span>
    </div>
  );
}

export function Hero() {
  const ref = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      el.style.setProperty('--mx', String(e.clientX / window.innerWidth - 0.5));
      el.style.setProperty('--my', String(e.clientY / window.innerHeight - 0.5));
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [reduced]);

  return (
    <section ref={ref} className={`relative min-h-[110vh] overflow-hidden pt-32 pb-24 ${MATTE}`}>
      <StarField count={700} />
      <LineField variant="hero" />
      <Noise />
      <div
        aria-hidden
        className="-top-40 -translate-x-1/2 pointer-events-none absolute left-1/2 z-[1] h-[800px] w-[800px] rounded-full bg-white/[0.04] blur-3xl"
      />

      <div className="relative z-10 mx-auto grid min-h-[80vh] max-w-5xl place-items-center px-6 text-center">
        <div>
          <motion.h1
            variants={blurIn}
            initial="hidden"
            animate="show"
            custom={1}
            className="fd font-black text-6xl text-white uppercase leading-[0.95] tracking-tight md:text-[96px]"
          >
            Весь бизнес
            <br />в потоке
          </motion.h1>
          <motion.p
            variants={blurIn}
            initial="hidden"
            animate="show"
            custom={3}
            className="mx-auto mt-8 max-w-md text-base text-white/55 leading-relaxed md:text-[15px]"
          >
            Продажи, закупки, склад и деньги — в одной системе. ishflow наводит порядок в учёте
            малого бизнеса: документы проводятся сами, отчёты сходятся до копейки.
          </motion.p>
        </div>
      </div>

      {/* Floating product-UI collage */}
      <FloatCard
        i={0}
        depth={18}
        className="top-[2%] left-[34%] hidden aspect-[4/3] w-[150px] md:block"
        badge={<TrendingUp className="h-3 w-3" />}
      >
        <KpiCard />
      </FloatCard>
      <FloatCard i={1} depth={22} className="top-[9%] right-[2%] aspect-[16/9] w-[260px]">
        <BarsCard />
      </FloatCard>
      <FloatCard
        i={2}
        depth={28}
        className="top-[7%] left-[4%] aspect-[3/4] w-[110px]"
        badge={<Smartphone className="h-3 w-3" />}
      >
        <PhoneCard />
      </FloatCard>
      <FloatCard
        i={3}
        depth={26}
        className="top-[10%] right-[12%] aspect-[3/4] w-[200px]"
        badge={<FileText className="h-3 w-3" />}
        overlay={<DemoOverlay />}
      >
        <DocCard />
      </FloatCard>
      <FloatCard
        i={4}
        depth={20}
        className="top-[18%] left-[3%] hidden aspect-[3/4] w-[220px] md:block"
        badge={<Package className="h-3 w-3" />}
      >
        <StockCard />
      </FloatCard>
      <FloatCard
        i={5}
        depth={24}
        className="bottom-[calc(6%-10px)] left-[calc(34%-90px)] hidden aspect-[4/5] w-[160px] md:block"
        badge={<Wallet className="h-3 w-3" />}
      >
        <CashCard />
      </FloatCard>
      <FloatCard i={6} depth={22} className="right-[22%] bottom-[6%] aspect-[16/10] w-[230px]">
        <ArApCard />
      </FloatCard>
    </section>
  );
}
