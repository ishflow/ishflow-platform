'use client';

import { type ReactNode, useState } from 'react';
import './data.css';

export type ChipOption = {
  key: string;
  label: string;
  count?: number;
};

export function V2ChipFilter({
  options,
  initial,
  onChange,
}: {
  options: ChipOption[];
  initial?: string;
  onChange?: (key: string) => void;
}) {
  const [active, setActive] = useState(initial ?? options[0]?.key);
  return (
    <div className="chip-row">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          className={`chip${active === o.key ? ' is-active' : ''}`}
          onClick={() => {
            setActive(o.key);
            onChange?.(o.key);
          }}
        >
          {o.label}
          {typeof o.count === 'number' ? <span className="count">{o.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function V2ChipFilterStatic({
  options,
  children,
}: { options: ChipOption[]; children?: ReactNode }) {
  return (
    <div className="chip-row">
      {options.map((o, i) => (
        <button key={o.key} type="button" className={`chip${i === 0 ? ' is-active' : ''}`}>
          {o.label}
          {typeof o.count === 'number' ? <span className="count">{o.count}</span> : null}
        </button>
      ))}
      {children}
    </div>
  );
}
