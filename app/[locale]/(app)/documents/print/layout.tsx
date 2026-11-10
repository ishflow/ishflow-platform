import type { ReactNode } from 'react';

/**
 * Print layout — visually bypasses the V2Shell (rail/panel/tabs).
 *
 * V2 routes nest under `app/[locale]/(app)/layout.tsx`, which renders the shell.
 * Print pages still inherit that layout in the React tree, but this layout
 * emits scoped CSS that hides shell elements (and lets `.main` span full
 * width) so the print preview reads like a standalone document.
 */
export default function V2PrintLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`
        .v2-app .rail,
        .v2-app .panel,
        .v2-app .topbar,
        .v2-app .tabs {
          display: none !important;
        }
        .v2-app .app {
          grid-template-columns: 1fr !important;
        }
        .v2-app .main {
          grid-column: 1 / -1 !important;
          padding: 0 !important;
          background: #E5E7EB;
          min-height: 100vh;
        }
        :where(.v2-app[data-theme='dark']) .main {
          background: #0B0F19;
        }
        .v2-print-toolbar {
          max-width: 210mm;
          margin: 24px auto 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 14px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
        }
        .v2-print-toolbar .left,
        .v2-print-toolbar .right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .v2-print-page {
          width: 210mm;
          min-height: 297mm;
          background: white;
          color: #111;
          margin: 0 auto 24px;
          padding: 18mm 16mm;
          box-shadow: 0 10px 30px rgba(0,0,0,0.12);
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
          font-size: 11pt;
          line-height: 1.5;
        }
        .v2-print-page .pp-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 18px;
          padding-bottom: 14px;
          border-bottom: 2px solid #111;
        }
        .v2-print-page .pp-top .logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .v2-print-page .pp-top .mark {
          width: 42px;
          height: 42px;
          background: #111;
          color: white;
          border-radius: 10px;
          display: grid;
          place-items: center;
          font-weight: 800;
          font-size: 22px;
        }
        .v2-print-page .pp-top .org .name {
          font-weight: 800;
          font-size: 14pt;
        }
        .v2-print-page .pp-top .org .meta {
          font-size: 9pt;
          color: #555;
        }
        .v2-print-page .pp-top .doc {
          text-align: right;
        }
        .v2-print-page .pp-top .doc .ttl {
          font-size: 16pt;
          font-weight: 800;
        }
        .v2-print-page .pp-top .doc .num {
          font-family: var(--font-mono, ui-monospace, monospace);
          font-size: 11pt;
          margin-top: 2px;
        }
        .v2-print-page .pp-top .doc .date {
          font-size: 9.5pt;
          color: #555;
          margin-top: 4px;
        }
        .v2-print-page .pp-parties {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 18px;
        }
        .v2-print-page .pp-parties .box {
          border: 1px solid #ccc;
          border-radius: 6px;
          padding: 10px 12px;
        }
        .v2-print-page .pp-parties .lbl {
          font-size: 8.5pt;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .v2-print-page .pp-parties .name {
          font-weight: 700;
          font-size: 11pt;
        }
        .v2-print-page .pp-parties .meta {
          font-size: 9.5pt;
          color: #444;
          line-height: 1.5;
          margin-top: 2px;
        }
        .v2-print-page .pp-lines {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 14px;
          font-size: 10pt;
        }
        .v2-print-page .pp-lines thead th {
          background: #111;
          color: white;
          text-align: left;
          padding: 8px 10px;
          font-weight: 600;
          font-size: 9.5pt;
        }
        .v2-print-page .pp-lines thead th.num {
          text-align: right;
        }
        .v2-print-page .pp-lines tbody td {
          padding: 8px 10px;
          border-bottom: 1px solid #e5e5e5;
        }
        .v2-print-page .pp-lines tbody td.num {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .v2-print-page .pp-totals {
          margin-left: auto;
          width: 280px;
          font-size: 10pt;
          margin-bottom: 18px;
        }
        .v2-print-page .pp-totals .row {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
        }
        .v2-print-page .pp-totals .row.subtotal {
          border-top: 1px solid #ccc;
        }
        .v2-print-page .pp-totals .row.grand {
          border-top: 2px solid #111;
          font-size: 12pt;
          font-weight: 800;
          padding-top: 8px;
        }
        .v2-print-page .pp-signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-top: 40px;
        }
        .v2-print-page .pp-signatures .sig .lbl {
          font-size: 9pt;
          color: #555;
          margin-bottom: 16px;
        }
        .v2-print-page .pp-signatures .sig .line {
          border-bottom: 1px solid #111;
          height: 1px;
          margin-bottom: 6px;
        }
        .v2-print-page .pp-foot {
          font-size: 8.5pt;
          color: #888;
          display: flex;
          justify-content: space-between;
          padding-top: 12px;
          border-top: 1px solid #ddd;
          margin-top: 22px;
        }
        @media print {
          .v2-app .main {
            background: white;
          }
          .v2-print-toolbar {
            display: none !important;
          }
          .v2-print-page {
            box-shadow: none;
            margin: 0;
          }
        }
      `}</style>
      {children}
    </>
  );
}
