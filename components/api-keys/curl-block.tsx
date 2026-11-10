'use client';

import { Button } from '@/components/ui/button';
import { CheckCircle2, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

export function CurlBlock({ code }: { code: string }) {
  const t = useTranslations('admin.apiKeys.docs');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success(t('copiedToast'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('copyError'));
    }
  };

  return (
    <div className="group relative rounded-md border border-border bg-muted/30">
      <pre className="overflow-x-auto p-3 text-xs text-foreground">
        <code>{code}</code>
      </pre>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="absolute right-2 top-2 opacity-70 hover:opacity-100"
      >
        {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}
