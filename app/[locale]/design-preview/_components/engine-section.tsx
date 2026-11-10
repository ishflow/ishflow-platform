'use client';

import { motion } from 'framer-motion';
import { LineField } from './line-field';
import { EASE, MATTE } from './motion';
import { Noise } from './noise';
import { StarField } from './star-field';

const META_SNIPPET = `defineDocument('sales.invoice', {
  lines: ['product', 'qty', 'price'],
  posts: ['stock', 'accounts_receivable'],
  numerator: 'СФ-{NNNNNN}',
})`;

function PaperDoc() {
  const rows: [string, string, string][] = [
    ['Кофе зерно, 1 кг', '12', '22 200,00'],
    ['Сироп ваниль 750 мл', '24', '14 880,00'],
    ['Стаканы 350 мл', '500', '12 500,00'],
    ['Молоко 3,2% 1 л', '60', '5 400,00'],
  ];
  return (
    <div className="relative flex aspect-[3/4] w-full flex-col bg-[#faf7f0] p-5 text-black">
      <div className="fd font-bold text-[13px] uppercase tracking-wide">
        Счёт-фактура № СФ-001207
      </div>
      <div className="mt-1 text-[9px] text-black/55">
        от 10 июня 2026 г. · Покупатель: ООО «Кофе и точка»
      </div>
      <div className="mt-4 flex items-baseline justify-between border-black/60 border-b pb-1 text-[8px] text-black/45 uppercase tracking-wider">
        <span>Наименование</span>
        <span className="flex gap-6">
          <span>Кол.</span>
          <span>Сумма</span>
        </span>
      </div>
      <div className="divide-y divide-black/10">
        {rows.map(([name, qty, sum]) => (
          <div key={name} className="flex items-baseline justify-between py-1.5 text-[9px]">
            <span className="text-black/75">{name}</span>
            <span className="flex gap-6 tabular-nums">
              <span className="w-6 text-right text-black/55">{qty}</span>
              <span className="w-14 text-right">{sum}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-baseline justify-between border-black/60 border-t pt-2">
        <span className="font-semibold text-[10px] uppercase">Итого</span>
        <span className="fd font-bold text-[13px] tabular-nums">186 500,00 ₽</span>
      </div>
      <div className="flex items-baseline justify-between text-[8px] text-black/50">
        <span>в т. ч. НДС 20%</span>
        <span className="tabular-nums">31 083,33</span>
      </div>
      <div className="absolute right-5 bottom-6 rotate-[-8deg] border-2 border-[#0F5EEF]/70 px-2.5 py-1 font-bold text-[#0F5EEF]/80 text-[11px] tracking-[0.2em]">
        ПРОВЕДЕНО
      </div>
    </div>
  );
}

export function EngineSection() {
  return (
    <section className={`relative overflow-hidden px-6 py-32 md:px-12 ${MATTE}`}>
      <StarField count={500} />
      <LineField variant="engine" />
      <Noise />
      <div
        aria-hidden
        className="-left-20 -translate-y-1/2 pointer-events-none absolute top-1/2 z-[1] h-[500px] w-[500px] rounded-full bg-white/[0.02] blur-3xl"
      />
      <pre
        aria-hidden
        className="pointer-events-none absolute top-[10%] right-[4%] z-[1] hidden select-none font-mono text-[11px] text-white leading-relaxed opacity-[0.07] lg:block"
      >
        {META_SNIPPET}
      </pre>

      <div className="relative z-[2] mx-auto max-w-7xl">
        <motion.h2
          initial={{ opacity: 0, y: 30, filter: 'blur(14px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1.1, ease: EASE }}
          className="fd -mb-5 relative z-10 font-medium text-4xl text-white uppercase leading-[0.95] md:ml-24 md:text-5xl"
        >
          Платформа
        </motion.h2>

        <div className="grid grid-cols-1 items-start gap-12 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 60, filter: 'blur(16px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 1.2, ease: EASE }}
            className="relative w-full max-w-[440px] justify-self-center bg-[#efeae0] p-4 pb-20 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.8)] md:justify-self-end"
          >
            <PaperDoc />
            <div className="fd absolute bottom-6 left-6 font-black text-2xl text-black leading-none">
              ISHFLOW
              <br />
              ENGINE
            </div>
          </motion.div>

          <div className="max-w-xl space-y-8 md:pt-16">
            <motion.h2
              initial={{ opacity: 0, y: 30, filter: 'blur(14px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 1.1, ease: EASE }}
              className="fd font-medium text-4xl text-white uppercase leading-[1.05] md:text-5xl"
            >
              соберёт учёт,
              <br />
              документы и отчёты
              <br />
              за вас
            </motion.h2>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 1, delay: 0.2, ease: EASE }}
              className="space-y-4 text-[15px] text-white/55 leading-relaxed"
            >
              <p>
                ishflow построен на метаданных: вы описываете справочники, документы и регистры —
                платформа сама создаёт базу, формы, проводки и отчёты. Никаких самописных таблиц и
                хрупких интеграций: один движок ведёт весь контур учёта.
              </p>
              <p>
                Продажи, закупки, склад и деньги работают на общих регистрах, поэтому остатки и
                взаиморасчёты сходятся копейка в копейку. Роли, аудит и пять языков интерфейса уже
                встроены — от первого документа до годового отчёта.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
