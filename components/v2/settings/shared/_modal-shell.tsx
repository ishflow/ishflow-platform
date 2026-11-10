'use client';

import type { ReactNode } from 'react';

/**
 * Shared modal scrim + card pair used by every settings overlay.
 * Centralises a11y plumbing (Escape closes, click-outside closes, keyboard
 * stopPropagation on the card) so each modal stays small.
 */
export function V2ModalShell({
  onClose,
  children,
  cardStyle,
  cardClassName = 'v2-modal-card',
  align,
}: {
  onClose: () => void;
  children: ReactNode;
  cardStyle?: React.CSSProperties;
  cardClassName?: string;
  align?: React.CSSProperties;
}) {
  return (
    <div
      className="v2-scrim"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      aria-modal
      style={align}
    >
      <div
        className={cardClassName}
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
