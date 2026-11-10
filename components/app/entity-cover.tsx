'use client';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Fragment } from 'react';
import { useTabTitle } from './tabs/use-tab-title';

export type CoverCrumb = { label: string; href?: string };

export function EntityCover({
  breadcrumb,
  title,
  actions,
  secondaryActions,
  actionsBelow = false,
}: {
  breadcrumb: CoverCrumb[];
  title: string;
  actions: React.ReactNode;
  /**
   * Right-aligned extras for the action row (only when `actionsBelow`).
   * Use for status badges, post/unpost, PDF download, clone, delete —
   * things adjacent to the primary save buttons but conceptually distinct.
   */
  secondaryActions?: React.ReactNode;
  /**
   * When true, renders actions on a new row beneath the title (used by form
   * pages where Save buttons sit prominently under the entity name). When
   * false (default), actions sit on the right of the title (list pages).
   */
  actionsBelow?: boolean;
}) {
  // Inside an iframe tab, push the page title to the parent so the tab chip
  // shows "Stok Bakiyesi" instead of the raw URL. No-op outside iframes.
  useTabTitle(title);

  const breadcrumbAndTitle = (
    <div className="flex min-w-0 flex-col gap-2 leading-none">
      <Breadcrumb>
        <BreadcrumbList className="flex-wrap gap-1 text-xs leading-none">
          {breadcrumb.map((crumb, i) => {
            const isLast = i === breadcrumb.length - 1;
            return (
              <Fragment key={`${crumb.label}-${i}`}>
                <BreadcrumbItem>
                  {crumb.href && !isLast ? (
                    <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {!isLast ? <BreadcrumbSeparator /> : null}
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
      <h1 className="truncate text-base font-semibold leading-none tracking-tight text-foreground sm:text-lg">
        {title}
      </h1>
    </div>
  );

  if (actionsBelow) {
    return (
      <div className="sticky top-0 z-10 -mx-3 flex flex-col gap-[30px] border-b bg-background/95 px-3 py-4 backdrop-blur sm:-mx-6 sm:px-6 sm:py-4">
        {breadcrumbAndTitle}
        {actions || secondaryActions ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">{actions}</div>
            {secondaryActions ? (
              <div className="flex items-center gap-2">{secondaryActions}</div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-10 -mx-3 flex items-center justify-between gap-3 border-b bg-background/95 px-3 py-4 backdrop-blur sm:-mx-6 sm:px-6 sm:py-4">
      {breadcrumbAndTitle}
      <div className="shrink-0">{actions}</div>
    </div>
  );
}
