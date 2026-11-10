'use client';

import { useRouter } from '@/platform/i18n/navigation';
import { AlertTriangle, Save } from 'lucide-react';
import Link from 'next/link';
import { useActionState, useEffect } from 'react';
import { type CreateRoleState, createRoleV2Action } from './role-actions';

export type CloneOption = { value: string; label: string };

export type NewRoleFormProps = {
  cloneOptions: CloneOption[];
  labels: {
    saveCta: string;
    cancel: string;
    cancelHref: string;
    counter: string;
    sectionTitle: string;
    fields: {
      name: string;
      namePh: string;
      nameHint: string;
      description: string;
      descriptionPh: string;
      template: string;
      templateHint: string;
      templateBlank: string;
      tags: string;
      tagsHint: string;
    };
    sampleTags: string[];
    addTag: string;
  };
};

export function V2NewRoleForm(p: NewRoleFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<CreateRoleState, FormData>(
    createRoleV2Action,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      router.push(`/admin/roles/${state.id}`);
    }
  }, [state, router]);

  const error = state && !state.ok ? state.error : undefined;

  return (
    <form action={formAction}>
      <div className="action-bar">
        <div className="left">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            <Save size={14} strokeWidth={1.75} />
            {pending ? '…' : p.labels.saveCta}
          </button>
          <Link href={p.labels.cancelHref} className="btn btn-ghost">
            {p.labels.cancel}
          </Link>
        </div>
        <div className="right">{p.labels.counter}</div>
      </div>

      {error ? (
        <div className="field-error" style={{ marginBottom: 12 }}>
          <AlertTriangle size={12} strokeWidth={1.75} />
          {error}
        </div>
      ) : null}

      <section className="card">
        <div className="card-header">
          <div className="card-title">{p.labels.sectionTitle}</div>
        </div>
        <div className="form-grid">
          <label htmlFor="nr-name">{p.labels.fields.name}</label>
          <div className="field">
            <input
              id="nr-name"
              name="name"
              className="input"
              placeholder={p.labels.fields.namePh}
              required
            />
            <div className="field-hint">{p.labels.fields.nameHint}</div>
          </div>

          <label htmlFor="nr-desc">{p.labels.fields.description}</label>
          <div className="field">
            <textarea
              id="nr-desc"
              name="description"
              className="input"
              style={{ minHeight: 60, resize: 'vertical' }}
              placeholder={p.labels.fields.descriptionPh}
            />
          </div>

          <label htmlFor="nr-template">{p.labels.fields.template}</label>
          <div className="field">
            <select id="nr-template" name="cloneFromId" className="select" defaultValue="none">
              <option value="none">{p.labels.fields.templateBlank}</option>
              {p.cloneOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="field-hint">{p.labels.fields.templateHint}</div>
          </div>

          {/* biome-ignore lint/a11y/noLabelWithoutControl: form-grid label paired with sibling tag pills */}
          <label>{p.labels.fields.tags}</label>
          <div className="field">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {p.labels.sampleTags.map((tag) => (
                <span key={tag} className="preview-pill">
                  {tag}
                </span>
              ))}
              <button type="button" className="preview-pill" style={{ cursor: 'pointer' }}>
                + {p.labels.addTag}
              </button>
            </div>
            <div className="field-hint">{p.labels.fields.tagsHint}</div>
          </div>
        </div>
      </section>
    </form>
  );
}
