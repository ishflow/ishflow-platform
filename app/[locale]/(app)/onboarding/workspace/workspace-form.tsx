'use client';

import { Link } from '@/platform/i18n/navigation';
import type { ActionResult } from '@/platform/ui';
import { AlertTriangle, ArrowRight } from 'lucide-react';
// IMPORTANT: plain next/navigation router — the action already returns a
// locale-prefixed `redirectTo` (`/${locale}/onboarding/done`). The next-intl
// router would prefix it AGAIN (→ `/en/en/onboarding/done` → 404 on non-default
// locales). This matches the repo convention in platform/ui/entity-form.tsx.
import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from 'react';
import { createWorkspaceAction } from './actions';

export function WorkspaceForm({ locale }: { locale: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    createWorkspaceAction,
    null,
  );

  useEffect(() => {
    if (state?.ok && state.redirectTo) {
      router.push(state.redirectTo);
    }
  }, [state, router]);

  const formError = state && !state.ok ? state.formError : undefined;
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const nameError = fieldErrors?.name?.[0];
  const slugError = fieldErrors?.slug?.[0];

  return (
    <form action={formAction}>
      <input type="hidden" name="__locale" value={locale} />

      <div className="onb-form">
        <div>
          <label htmlFor="ws-nm">Şirket adı</label>
          <input
            id="ws-nm"
            name="name"
            className="input"
            placeholder="örn. Sample Trading LLC"
            required
          />
          <div className="hint">Faturalarda ve raporlarda görünür.</div>
          {nameError ? (
            <div className="field-error">
              <AlertTriangle size={12} strokeWidth={1.75} />
              {nameError}
            </div>
          ) : null}
        </div>

        <div>
          <label htmlFor="ws-slug">Slug (opsiyonel)</label>
          <input
            id="ws-slug"
            name="slug"
            className="input mono"
            placeholder="örn. sample-trading"
          />
          <div className="hint">Boş bırakırsan şirket adından oluşturulur.</div>
          {slugError ? (
            <div className="field-error">
              <AlertTriangle size={12} strokeWidth={1.75} />
              {slugError}
            </div>
          ) : null}
        </div>

        <div className="row">
          <div>
            <label htmlFor="ws-ccy">Para birimi</label>
            <select id="ws-ccy" name="currency" className="select" defaultValue="USD">
              <option value="USD">USD — US Dollar</option>
              <option value="TRY">TRY — Türk Lirası</option>
              <option value="RUB">RUB — Российский рубль</option>
              <option value="EUR">EUR — Euro</option>
            </select>
          </div>
          <div>
            <label htmlFor="ws-tz">Zaman dilimi</label>
            <select id="ws-tz" name="timezone" className="select">
              <option>Europe/Istanbul (UTC+3)</option>
              <option>Europe/Moscow (UTC+3)</option>
              <option>Asia/Tashkent (UTC+5)</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="ws-ind">Sektör</label>
          <select id="ws-ind" name="industry" className="select">
            <option>Toptan ticaret</option>
            <option>Perakende</option>
            <option>Hizmet</option>
            <option>Üretim</option>
            <option>Diğer</option>
          </select>
        </div>

        {formError ? (
          <div className="form-error">
            <AlertTriangle size={12} strokeWidth={1.75} />
            {formError}
          </div>
        ) : null}
      </div>

      <div className="onb-actions">
        <Link className="onb-skip" href="/onboarding/welcome">
          ← Geri
        </Link>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Oluşturuluyor…' : 'Devam et'}
          <ArrowRight size={16} strokeWidth={1.75} />
        </button>
      </div>
    </form>
  );
}
