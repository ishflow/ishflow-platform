'use client';

import { exportNearestTable } from '@/lib/v2-shell/csv-export';
import { Download } from 'lucide-react';
import { useState } from 'react';

/**
 * Client-only "Dışa aktar" / "Export" button. Walks up from the click target,
 * finds the nearest `<table class="data">` (or any `<table>` inside the
 * surrounding `.table-card` / page main area), and downloads its visible
 * rows as a CSV. Used by V2 register-view + report-view shells whose body
 * is otherwise pure RSC.
 *
 * `filenameStem` controls the download name — the component appends a
 * `YYYY-MM-DD` date suffix and `.csv` extension. Caller passes the
 * register/report id so the file is identifiable.
 */
export function V2ExportCsvButton({
  label,
  filenameStem,
  className,
}: {
  label: string;
  filenameStem: string;
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      className={className ?? 'btn btn-secondary btn-sm'}
      disabled={pending}
      onClick={(e) => {
        setPending(true);
        try {
          const stamp = new Date().toISOString().slice(0, 10);
          exportNearestTable(e.currentTarget, `${filenameStem}-${stamp}.csv`);
        } finally {
          setPending(false);
        }
      }}
      aria-label={label}
    >
      <Download size={14} strokeWidth={1.75} />
      {label}
    </button>
  );
}
