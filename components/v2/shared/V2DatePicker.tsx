'use client';

import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';

type Props = {
  name?: string;
  id?: string;
  /** Uncontrolled initial value (ISO YYYY-MM-DD). */
  defaultValue?: string;
  /** Controlled value (ISO YYYY-MM-DD). When set, the component is controlled. */
  value?: string;
  /** Required when `value` is set — fires on every change with an ISO string. */
  onChange?: (iso: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  required?: boolean;
  disabled?: boolean;
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toDisplay(d: Date): string {
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function fromDisplay(s: string): Date | null {
  const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (!m || !m[1] || !m[2] || !m[3]) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function fromIso(s: string): Date | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m || !m[1] || !m[2] || !m[3]) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function V2DatePicker({
  name,
  id,
  defaultValue,
  value,
  onChange,
  placeholder = 'GG.AA.YYYY',
  ariaLabel,
  required,
  disabled,
}: Props) {
  const locale = useLocale();
  const t = useTranslations('v2_common');
  const isControlled = value !== undefined;
  const initial = (isControlled ? value : defaultValue)
    ? fromIso(isControlled ? value : (defaultValue ?? ''))
    : null;
  const [internalSelected, setInternalSelected] = useState<Date | undefined>(initial ?? undefined);
  const selected = isControlled
    ? value
      ? (fromIso(value) ?? undefined)
      : undefined
    : internalSelected;
  const [text, setText] = useState<string>(initial ? toDisplay(initial) : '');
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(initial ?? new Date());
  const wrapRef = useRef<HTMLDivElement>(null);
  const autoId = useId();
  const inputId = id ?? autoId;

  // Sync text when controlled value changes externally.
  useEffect(() => {
    if (!isControlled) return;
    if (!value) {
      setText('');
      return;
    }
    const d = fromIso(value);
    if (d) {
      setText(toDisplay(d));
      setMonth(d);
    }
  }, [isControlled, value]);

  function emit(d: Date | undefined) {
    if (isControlled) {
      onChange?.(d ? toIso(d) : '');
    } else {
      setInternalSelected(d);
      onChange?.(d ? toIso(d) : '');
    }
  }

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  // Sync internal state when user types a complete date.
  function onTextChange(v: string) {
    setText(v);
    if (v === '') {
      emit(undefined);
      return;
    }
    const d = fromDisplay(v);
    if (d) {
      emit(d);
      setMonth(d);
    }
  }

  function onPick(d: Date | undefined) {
    emit(d);
    setText(d ? toDisplay(d) : '');
    setOpen(false);
  }

  // Map next-intl locale to BCP 47 for Intl.DateTimeFormat.
  const intlLocale =
    locale === 'tr' ? 'tr-TR' : locale === 'ru' ? 'ru-RU' : locale === 'en' ? 'en-US' : locale;

  return (
    <div ref={wrapRef} className="v2-datepicker">
      {name ? (
        <input
          type="hidden"
          name={name}
          value={selected ? toIso(selected) : ''}
          required={required}
        />
      ) : null}
      <div className={`v2-datepicker__input${disabled ? ' is-disabled' : ''}`}>
        <input
          id={inputId}
          className="v2-datepicker__text"
          type="text"
          inputMode="numeric"
          placeholder={placeholder}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          onFocus={() => setOpen(true)}
          aria-label={ariaLabel}
          autoComplete="off"
          disabled={disabled}
        />
        <button
          type="button"
          className="v2-datepicker__chev"
          onClick={() => setOpen((s) => !s)}
          aria-label={open ? t('calendarClose') : t('calendarOpen')}
          aria-expanded={open}
          disabled={disabled}
        >
          <ChevronDown size={14} strokeWidth={1.75} />
        </button>
      </div>
      {open && !disabled && (
        <div className="v2-datepicker__popover" aria-label={ariaLabel ?? t('calendar')}>
          <DayPicker
            mode="single"
            locale={intlLocale === 'tr-TR' ? undefined : undefined /* RDP defaults are fine */}
            selected={selected}
            onSelect={onPick}
            month={month}
            onMonthChange={setMonth}
            showOutsideDays={false}
            weekStartsOn={1}
            classNames={{
              root: 'v2-cal',
              months: 'v2-cal__months',
              month: 'v2-cal__month',
              month_caption: 'v2-cal__caption',
              caption_label: 'v2-cal__caption-label',
              nav: 'v2-cal__nav',
              button_previous: 'v2-cal__navbtn',
              button_next: 'v2-cal__navbtn',
              month_grid: 'v2-cal__grid',
              weekdays: 'v2-cal__weekdays',
              weekday: 'v2-cal__weekday',
              week: 'v2-cal__week',
              day: 'v2-cal__day',
              day_button: 'v2-cal__day-btn',
              selected: 'is-selected',
              today: 'is-today',
              outside: 'is-outside',
              disabled: 'is-disabled',
              hidden: 'is-hidden',
            }}
            components={{
              Chevron: ({ orientation }) =>
                orientation === 'left' ? (
                  <ChevronLeft size={14} strokeWidth={1.75} />
                ) : (
                  <ChevronRight size={14} strokeWidth={1.75} />
                ),
            }}
            formatters={{
              formatCaption: (d) =>
                new Intl.DateTimeFormat(intlLocale, {
                  month: 'long',
                  year: 'numeric',
                }).format(d),
              formatWeekdayName: (d) =>
                new Intl.DateTimeFormat(intlLocale, { weekday: 'narrow' }).format(d).toUpperCase(),
            }}
          />
        </div>
      )}
    </div>
  );
}
