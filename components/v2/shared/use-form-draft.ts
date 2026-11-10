'use client';

import { useEffect, useRef } from 'react';

const PREFIX = 'v2:draft:';

/**
 * Persist a form's field values to `localStorage` while the user is typing,
 * and restore them when the form mounts again. Lets users switch between
 * V2 tabs (e.g. /products/new ↔ /partners/suppliers/new) without losing
 * the values they've already entered.
 *
 * Usage:
 *
 *   const formRef = useFormDraft<HTMLFormElement>('catalogs/products/new');
 *   …
 *   useEffect(() => {
 *     if (state?.ok) {
 *       clearFormDraft('catalogs/products/new');  // wipe after successful save
 *       router.push(state.redirectTo ?? listHref);
 *     }
 *   }, [state, …]);
 *   …
 *   <form ref={formRef} action={formAction}>…</form>
 *
 * Caveats:
 * - Only `name`d form fields are persisted (textarea, input, select). Hidden
 *   `__*` system fields (e.g. `__locale`, `__id`) are deliberately skipped.
 * - RefCombobox stores the selected id in a hidden input + tracks the
 *   visible label in client state — restoring will repopulate the id but
 *   the label may render empty until the user re-opens the combobox.
 *   Acceptable trade-off for V2.
 * - Debounced 200ms to avoid hammering localStorage on every keystroke.
 */
export function useFormDraft<T extends HTMLFormElement>(draftKey: string) {
  const formRef = useRef<T>(null);

  // Restore on mount.
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    try {
      const raw = localStorage.getItem(`${PREFIX}${draftKey}`);
      if (!raw) return;
      const data = JSON.parse(raw) as Record<string, string>;
      for (const [name, value] of Object.entries(data)) {
        if (value === '' || value == null) continue;
        const els = form.querySelectorAll<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >(`[name="${CSS.escape(name)}"]`);
        for (const el of Array.from(els)) {
          if (!('value' in el)) continue;
          // Use the native value setter so React's controlled-input listener
          // also sees the change (plain `el.value = …` is invisible to React).
          const proto = Object.getPrototypeOf(el);
          const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
          if (setter) setter.call(el, value);
          else (el as HTMLInputElement).value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    } catch {
      // Storage may be unavailable (private mode, quota) — silently skip.
    }
  }, [draftKey]);

  // Save on every input/change event (debounced).
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const persist = () => {
      try {
        const fd = new FormData(form);
        const obj: Record<string, string> = {};
        for (const [k, v] of fd.entries()) {
          if (k.startsWith('__')) continue;
          if (typeof v === 'string' && v !== '') obj[k] = v;
        }
        if (Object.keys(obj).length === 0) {
          localStorage.removeItem(`${PREFIX}${draftKey}`);
        } else {
          localStorage.setItem(`${PREFIX}${draftKey}`, JSON.stringify(obj));
        }
      } catch {
        // ignore
      }
    };
    const onInput = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(persist, 200);
    };
    form.addEventListener('input', onInput);
    form.addEventListener('change', onInput);
    return () => {
      form.removeEventListener('input', onInput);
      form.removeEventListener('change', onInput);
      if (timer) clearTimeout(timer);
    };
  }, [draftKey]);

  return formRef;
}

export function clearFormDraft(draftKey: string) {
  try {
    localStorage.removeItem(`${PREFIX}${draftKey}`);
  } catch {
    // ignore
  }
}
