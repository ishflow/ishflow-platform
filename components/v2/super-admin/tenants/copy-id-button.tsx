'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

/**
 * Copy-to-clipboard button for the tenant id. Client component because it
 * needs `navigator.clipboard`; the icon briefly swaps to a check on success.
 */
export function CopyIdButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable (insecure context / denied) — no-op
    }
  };

  return (
    <button type="button" className="btn btn-secondary btn-sm" onClick={onCopy}>
      {copied ? <Check size={14} strokeWidth={1.75} /> : <Copy size={14} strokeWidth={1.75} />}
      {label}
    </button>
  );
}
