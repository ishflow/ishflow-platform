import { z } from 'zod';

export const tabSchema = z.object({
  id: z.string().min(1),
  href: z.string().min(1),
  title: z.string().default(''),
  dirty: z.boolean().default(false),
  pinned: z.boolean().default(false),
  openedAt: z.number().int(),
  lastActiveAt: z.number().int(),
  // Page the tab was opened from (locale-prefixed pathname + optional search).
  // When the active tab is closed, the shell navigates top-level back to this
  // URL so the user lands on the list they came from rather than whatever is
  // left in the background. Optional for backwards-compat with persisted tabs
  // that pre-date this field.
  originHref: z.string().optional(),
});
export type Tab = z.infer<typeof tabSchema>;

export const tabsStateSchema = z.object({
  version: z.literal(1),
  tabs: z.array(tabSchema),
  // '' means "no tab focused → main page content is visible underneath."
  activeId: z.string(),
});
export type TabsState = z.infer<typeof tabsStateSchema>;

/** Child → Parent */
export type ChildMessage =
  | { type: 'tab:title'; title: string }
  | { type: 'tab:dirty'; dirty: boolean }
  | { type: 'tab:close-me'; reason: 'save-and-close' | 'user' }
  | { type: 'tab:open'; href: string; newTab?: boolean; origin?: string }
  | { type: 'tab:navigate'; href: string };

/** Parent → Child */
export type ParentMessage = { type: 'tab:is-active'; active: boolean };

export const CHILD_MESSAGE_TYPES: ReadonlySet<ChildMessage['type']> = new Set([
  'tab:title',
  'tab:dirty',
  'tab:close-me',
  'tab:open',
  'tab:navigate',
]);

export const MAX_TABS = 10;
export const IFRAME_QUERY_FLAG = '__tab_iframe';
