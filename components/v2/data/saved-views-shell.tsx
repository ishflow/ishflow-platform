'use client';

import { useState } from 'react';
import { V2FilterBuilderModal, type V2FilterBuilderModalProps } from './filter-builder-modal';
import { V2SaveViewModal, type V2SaveViewModalProps } from './save-view-modal';

/**
 * Client wrapper that owns the open/close state for the filter-builder and
 * save-view modals. The page renders the static `aside` + `table`; we
 * expose two triggers that the page can mount as buttons.
 */
export function V2SavedViewsShell({
  filterLabels,
  filterResultCount,
  filterRoot,
  saveLabels,
  triggers,
}: {
  filterLabels: V2FilterBuilderModalProps['labels'];
  filterResultCount: V2FilterBuilderModalProps['resultCount'];
  filterRoot: V2FilterBuilderModalProps['root'];
  saveLabels: V2SaveViewModalProps['labels'];
  triggers: {
    editFilterLabel: string;
    saveCurrentLabel: string;
    closeViewLabel: string;
    updateLabel: string;
  };
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  return (
    <>
      <div style={{ display: 'inline-flex', gap: 8 }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setSaveOpen(true)}
        >
          {triggers.updateLabel}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setFilterOpen(true)}
        >
          {triggers.editFilterLabel}
        </button>
      </div>
      <V2FilterBuilderModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        labels={filterLabels}
        resultCount={filterResultCount}
        root={filterRoot}
      />
      <V2SaveViewModal open={saveOpen} onClose={() => setSaveOpen(false)} labels={saveLabels} />
    </>
  );
}
