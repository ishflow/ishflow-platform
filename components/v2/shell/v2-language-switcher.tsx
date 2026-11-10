'use client';

import { type Locale, localeFlags, localeLabels, locales } from '@/platform/i18n/config';
import { usePathname, useRouter } from '@/platform/i18n/navigation';
import { Globe } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

export function V2LanguageSwitcher() {
  const currentLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('v2_common');
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const onSelect = (next: Locale) => {
    setOpen(false);
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  };

  return (
    <div className="locale-switcher" style={{ position: 'relative' }}>
      <button
        type="button"
        className="icon-btn"
        aria-label={t('language')}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
      >
        <Globe size={18} strokeWidth={1.75} />
      </button>
      {open ? (
        <ul
          role="menu"
          className="locale-menu"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 6,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 6,
            minWidth: 180,
            zIndex: 50,
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            listStyle: 'none',
            margin: 0,
          }}
        >
          {locales.map((loc) => {
            const active = loc === currentLocale;
            return (
              <li key={loc} style={{ margin: 0 }}>
                <button
                  type="button"
                  role="menuitem"
                  className="locale-item"
                  onClick={() => onSelect(loc)}
                  aria-current={active ? 'true' : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '6px 10px',
                    background: active ? 'var(--bg-subtle, rgba(255,255,255,0.06))' : 'transparent',
                    border: 'none',
                    color: 'var(--text)',
                    fontSize: 13,
                    textAlign: 'left',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  <span>{localeFlags[loc]}</span>
                  <span>{localeLabels[loc]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
