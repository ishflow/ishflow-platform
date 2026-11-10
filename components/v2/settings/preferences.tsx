'use client';

import { RotateCcw, Save } from 'lucide-react';
import { useState } from 'react';

const THEMES = ['light', 'dark', 'system'] as const;
const DENSITIES = ['compact', 'cozy', 'wide'] as const;
const SIDEBAR_MODES = ['always', 'collapsed', 'auto'] as const;

function ChipRow<T extends string>({
  options,
  active,
  setActive,
  labels,
}: {
  options: readonly T[];
  active: T;
  setActive: (v: T) => void;
  labels: Record<T, string>;
}) {
  return (
    <div className="chip-row" style={{ background: 'transparent', border: 'none', padding: 0 }}>
      {options.map((o) => (
        <button
          type="button"
          key={o}
          className={`chip${active === o ? ' is-active' : ''}`}
          onClick={() => setActive(o)}
        >
          {labels[o]}
        </button>
      ))}
    </div>
  );
}

export function V2Preferences() {
  const [theme, setTheme] = useState<(typeof THEMES)[number]>('system');
  const [density, setDensity] = useState<(typeof DENSITIES)[number]>('cozy');
  const [sidebar, setSidebar] = useState<(typeof SIDEBAR_MODES)[number]>('always');

  return (
    <>
      <div className="action-bar">
        <div className="left">
          <button className="btn btn-primary" type="button">
            <Save size={16} strokeWidth={1.75} />
            Kaydet
          </button>
          <button className="btn btn-ghost" type="button">
            <RotateCcw size={14} strokeWidth={1.75} />
            Varsayılana sıfırla
          </button>
        </div>
        <div className="right dim">Tercihler tüm cihazlarına otomatik senkronize olur</div>
      </div>

      <section className="card">
        <div className="card-header">
          <div className="card-title">Tema</div>
        </div>
        <div className="form-grid">
          <div className="form-label">Görünüm</div>
          <div className="field">
            <ChipRow
              options={THEMES}
              active={theme}
              setActive={setTheme}
              labels={{ light: 'Açık', dark: 'Koyu', system: 'Sistem' }}
            />
          </div>
        </div>
      </section>

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div className="card-title">Yoğunluk</div>
        </div>
        <div className="form-grid">
          <div className="form-label">Tablo & form yoğunluğu</div>
          <div className="field">
            <ChipRow
              options={DENSITIES}
              active={density}
              setActive={setDensity}
              labels={{ compact: 'Sıkışık', cozy: 'Rahat', wide: 'Geniş' }}
            />
          </div>
        </div>
      </section>

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div className="card-title">Sol panel</div>
        </div>
        <div className="form-grid">
          <div className="form-label">Panel modu</div>
          <div className="field">
            <ChipRow
              options={SIDEBAR_MODES}
              active={sidebar}
              setActive={setSidebar}
              labels={{ always: 'Her zaman açık', collapsed: 'Daralt', auto: 'Otomatik' }}
            />
            <div className="field-hint">Otomatik modda ekran genişliğine göre açılıp kapanır.</div>
          </div>
        </div>
      </section>

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div className="card-title">Klavye & navigasyon</div>
        </div>
        <div className="nf-row">
          <div className="meta">
            <div className="name">Komut paleti kısayolu</div>
            <div className="desc">⌘K (macOS) / Ctrl+K (Windows/Linux)</div>
          </div>
          <span className="tog is-on" />
        </div>
        <div className="nf-row">
          <div className="meta">
            <div className="name">Vim modunda gezinme</div>
            <div className="desc">Liste sayfalarında h/j/k/l ile satır gezinme.</div>
          </div>
          <span className="tog" />
        </div>
        <div className="nf-row">
          <div className="meta">
            <div className="name">İnce kaydırma çubuğu</div>
            <div className="desc">macOS tarzı overlay scrollbar.</div>
          </div>
          <span className="tog is-on" />
        </div>
      </section>

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div className="card-title">Yerel ayarlar</div>
        </div>
        <div className="form-grid">
          <label htmlFor="lng2">Görüntülenen dil</label>
          <div className="field">
            <select id="lng2" className="select" defaultValue="ru">
              <option value="ru">Русский (RU)</option>
              <option value="en">English (EN)</option>
              <option value="tr">Türkçe (TR)</option>
              <option value="uz">O'zbek (UZ)</option>
              <option value="ky">Кыргызча (KY)</option>
            </select>
          </div>
          <label htmlFor="ts">İlk haftanın günü</label>
          <div className="field">
            <select id="ts" className="select">
              <option>Pazartesi</option>
              <option>Pazar</option>
            </select>
          </div>
        </div>
      </section>
    </>
  );
}
