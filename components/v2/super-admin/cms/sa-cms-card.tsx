import type { ReactNode } from 'react';

/**
 * Topbar + content scaffold shared by every CMS sub-page. Each page renders
 * `<SaCmsPageShell topbar={…}>{cards}</SaCmsPageShell>` so the breadcrumb
 * + content gutter stay consistent.
 */
export function SaCmsPageShell({
  topbar,
  children,
}: {
  topbar: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      {topbar}
      <div className="content">{children}</div>
    </>
  );
}
