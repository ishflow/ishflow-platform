'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight, MoveRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { LineField } from './line-field';
import { EASE, MATTE } from './motion';
import { Noise } from './noise';
import { StarField } from './star-field';
import { MoneyMini, PurchasesMini, SalesMini, StockMini } from './ui-cards';

const MODULES: {
  title: string;
  tall: boolean;
  mt: string;
  width: string;
  visual: ReactNode;
}[] = [
  { title: 'Продажи', tall: false, mt: 'md:mt-20', width: 'max-w-[216px]', visual: <SalesMini /> },
  {
    title: 'Закупки',
    tall: true,
    mt: 'md:mt-25',
    width: 'max-w-[220px]',
    visual: <PurchasesMini />,
  },
  { title: 'Склад', tall: false, mt: 'md:mt-10', width: 'max-w-[230px]', visual: <StockMini /> },
  { title: 'Деньги', tall: false, mt: 'md:mt-4', width: 'max-w-[200px]', visual: <MoneyMini /> },
];

export function ModulesSection() {
  return (
    <section className={`relative overflow-hidden px-6 py-32 md:px-12 ${MATTE}`}>
      <StarField count={550} ring ringCount={260} ringRadiusFactor={0.37} ringBandWidth={50} />
      <LineField variant="modules" />
      <Noise />

      <div className="relative z-[2] mx-auto max-w-7xl">
        <div className="mb-20 grid grid-cols-1 gap-12 md:grid-cols-2">
          <motion.h2
            initial={{ opacity: 0, y: 30, filter: 'blur(14px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 1.1, ease: EASE }}
            className="fd font-black text-5xl text-white uppercase leading-[0.95] md:text-6xl"
          >
            Все контуры
            <br />
            учёта
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 1, delay: 0.15, ease: EASE }}
            className="space-y-6"
          >
            <p className="max-w-md text-[15px] text-white/55 leading-relaxed">
              Каждый модуль — это документы, регистры и отчёты, собранные из метаданных. Включайте
              нужные контуры и масштабируйтесь без миграций и переписывания.
            </p>
            <Link
              href="/features"
              className="group flex items-center gap-3 text-sm text-white/70 uppercase tracking-widest transition hover:text-white"
            >
              Смотреть возможности
              <MoveRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>

        <div className="grid grid-cols-2 items-start gap-8 md:grid-cols-4 md:gap-12">
          {MODULES.map((m, i) => (
            <motion.div
              key={m.title}
              initial={{ opacity: 0, y: 40, filter: 'blur(12px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1.1, delay: i * 0.12, ease: EASE }}
              className={`w-full justify-self-center ${m.width} ${m.mt}`}
            >
              <div
                className={`group overflow-hidden shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] ring-1 ring-white/10 ${
                  m.tall ? 'aspect-[3/4]' : 'aspect-[4/5]'
                }`}
              >
                <div className="h-full w-full transition-transform duration-[1500ms] group-hover:scale-110">
                  {m.visual}
                </div>
              </div>
              <div className="mt-4 space-y-3 text-center">
                <h3 className="fd font-bold text-sm text-white uppercase tracking-wider">
                  {m.title}
                </h3>
                <Link
                  href="/features"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-white/60 text-xs transition hover:bg-white/5"
                >
                  открыть модуль
                  <span className="grid h-4 w-4 place-items-center rounded-full border border-white/20">
                    <ArrowUpRight className="h-2.5 w-2.5" />
                  </span>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
