'use client';

import { Button } from '@/components/ui/button';
import { ScanText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { type OcrApplyPayload, ScanDialog } from './scan-dialog';

import {
  pollOcrJob as pollOcrJobAction,
  startOcrJob as startOcrJobAction,
} from '@/app/[locale]/(app)/_addon-actions/ai-invoice-ocr';

/**
 * Stand-alone button that opens the OCR scan dialog. Clients render this
 * inside the purchase-invoice form; the `onApply` callback receives the
 * parsed payload + matched ids and is responsible for setting form state.
 *
 * Server-action imports are static at the module level (Next.js server
 * actions are tree-shakable per call site).
 */
export function ScanButton({
  onApply,
}: {
  onApply: (payload: OcrApplyPayload) => void;
}) {
  const t = useTranslations('addons.aiInvoiceOcr');
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <ScanText className="size-4" aria-hidden />
        {t('scanButton')}
      </Button>
      <ScanDialog
        open={open}
        onOpenChange={setOpen}
        actions={{ startOcrJob: startOcrJobAction, pollOcrJob: pollOcrJobAction }}
        onApply={onApply}
      />
    </>
  );
}
