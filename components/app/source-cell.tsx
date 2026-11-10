'use client';

import { TabOpenLink } from '@/components/app/tabs/tab-open-link';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

type Props = {
  /** Registry type id (e.g. "sales.invoice" or "sales.customer"). */
  typeId: string;
  /** UUID of the referenced record. */
  recordId: string;
  /** Pre-resolved human label. Falls back to `recordId.slice(0, 8)` when empty. */
  presentation: string;
  /** Optional link target; when present the label renders as a Next.js Link. */
  href?: string;
  /** i18n tooltip label for the copy affordance (e.g. tCommon('copy')). */
  copyLabel: string;
  /** i18n toast label fired on successful copy (e.g. tCommon('copied')). */
  copiedLabel: string;
};

/**
 * Renders a human presentation for a document/catalog record with a copy-to-clipboard
 * affordance for the raw UUID. The `typeId` is accepted for future per-type styling
 * (icon, badge) and to identify the cell in analytics — it is not rendered today.
 */
export function SourceCell({
  typeId: _typeId,
  recordId,
  presentation,
  href,
  copyLabel,
  copiedLabel,
}: Props) {
  const label = presentation.length > 0 ? presentation : recordId.slice(0, 8);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(recordId);
      toast.success(copiedLabel);
    } catch {
      // Clipboard can reject in insecure contexts / denied permissions; stay silent.
    }
  };

  const labelNode = href ? (
    <TabOpenLink href={href} className="text-foreground hover:underline" tabTitle={label}>
      {label}
    </TabOpenLink>
  ) : (
    <span className="text-foreground">{label}</span>
  );

  return (
    <span className="inline-flex items-center gap-1.5">
      {labelNode}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={copyLabel}
                onClick={handleCopy}
                className="text-muted-foreground hover:text-foreground"
              >
                <Copy className="size-3.5" />
              </Button>
            }
          />
          <TooltipContent>{copyLabel}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
  );
}
