'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

const FORMATS = ['1c_bank_v102', 'sber_csv', 'tinkoff_csv', 'kaspi_csv'] as const;

interface BankAccountOption {
  id: string;
  name: string;
  accountNo: string;
}

interface UploadFormProps {
  action: (formData: FormData) => void | Promise<void>;
  accounts: BankAccountOption[];
}

/**
 * Client-side upload form. Holds the chosen format + account + file in local
 * state so we can disable the submit button until all three are present.
 */
export function UploadForm({ action, accounts }: UploadFormProps) {
  const t = useTranslations('addons.bankImport');
  const [format, setFormat] = useState<string>('sber_csv');
  const [bankAccountId, setBankAccountId] = useState<string>(accounts[0]?.id ?? '');
  const [filename, setFilename] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      action={async (formData) => {
        formData.set('format', format);
        formData.set('bankAccountId', bankAccountId);
        setSubmitting(true);
        try {
          await action(formData);
        } finally {
          setSubmitting(false);
        }
      }}
      className="flex flex-col gap-4"
    >
      <div className="grid gap-2">
        <Label htmlFor="format">{t('upload.format')}</Label>
        <Select value={format} onValueChange={(v) => setFormat(v ?? format)}>
          <SelectTrigger id="format">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FORMATS.map((f) => (
              <SelectItem key={f} value={f}>
                {t(`format.options.${f}` as never)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="bankAccountId">{t('upload.account')}</Label>
        <Select value={bankAccountId} onValueChange={(v) => setBankAccountId(v ?? bankAccountId)}>
          <SelectTrigger id="bankAccountId">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name} ({a.accountNo})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="file">{t('upload.file')}</Label>
        <Input
          id="file"
          name="file"
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          onChange={(e) => setFilename(e.target.files?.[0]?.name ?? '')}
          required
        />
        {filename && <p className="text-xs text-muted-foreground font-mono">{filename}</p>}
      </div>

      <Button
        type="submit"
        disabled={!format || !bankAccountId || !filename || submitting}
        className="self-start"
      >
        {submitting ? t('upload.submitting') : t('upload.submit')}
      </Button>
    </form>
  );
}
