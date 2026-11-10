import { notFound } from 'next/navigation';
import { resolveContext } from './current-context';
import { isPlatformAdmin } from './platform-admin';

/**
 * Hard 404 gate for the `/super-admin` route group.
 *
 * Returns the resolved `AppContext` when the viewer passes
 * `isPlatformAdmin`. Otherwise calls `notFound()` so the route group never
 * leaks its existence to non-operators.
 */
export async function assertSuperAdmin() {
  const ctx = await resolveContext();
  if (!ctx) notFound();
  if (!isPlatformAdmin(ctx)) notFound();
  return ctx;
}
