'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { EASE } from './motion';

const PANEL_LINKS: [string, string][] = [
  ['Возможности', '/features'],
  ['Тарифы', '/pricing'],
  ['Блог', '/blog'],
  ['Войти', '/sign-in'],
];

export function TopBar() {
  const [open, setOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <header className="fixed top-0 right-0 left-0 z-50 px-6 pt-6 md:px-10">
      <div className="flex items-center justify-between gap-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 3.3, ease: EASE }}
        >
          <Link href="/" aria-label="ishflow — на главную">
            {logoFailed ? (
              <span className="fd font-black text-white text-xl">ishflow</span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/logo-dark.svg"
                alt="ishflow"
                className="h-6 w-auto"
                onError={() => setLogoFailed(true)}
              />
            )}
          </Link>
        </motion.div>

        <motion.nav
          className="flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 3.3, ease: EASE }}
        >
          <Link
            href="/features"
            className="hidden px-3 py-2 text-sm text-white/60 transition hover:text-white md:block"
          >
            Возможности
          </Link>
          <Link
            href="/pricing"
            className="hidden px-3 py-2 text-sm text-white/60 transition hover:text-white md:block"
          >
            Тарифы
          </Link>
          <Link
            href="/sign-in"
            className="hidden px-3 py-2 text-sm text-white/80 transition hover:text-white sm:block"
          >
            Войти
          </Link>
          <Link
            href="/sign-up"
            className="rounded-full bg-white px-4 py-2 font-medium text-black text-sm transition hover:bg-white/90"
          >
            Начать
          </Link>
          <button
            type="button"
            aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-full text-white/70 ring-1 ring-white/15 transition hover:text-white"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </motion.nav>
      </div>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.35, ease: EASE }}
          className="absolute top-[72px] right-6 w-64 rounded-2xl bg-[oklch(0.12_0.006_250)] p-2 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/10 md:right-10"
        >
          {PANEL_LINKS.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="group flex items-center justify-between rounded-xl px-4 py-3 text-sm text-white/80 transition hover:bg-white/[0.06] hover:text-white"
            >
              {label}
              <ArrowUpRight className="h-4 w-4 opacity-40 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
            </Link>
          ))}
          <div className="mt-2 flex items-center justify-between border-white/10 border-t px-4 py-3 text-white/50 text-xs">
            <span>Мы на связи</span>
            <a
              href="https://t.me/ishflow"
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-white"
            >
              Telegram
            </a>
          </div>
        </motion.div>
      )}
    </header>
  );
}
