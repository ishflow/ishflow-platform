'use server';

import { collectFeatures } from '@/lib/v2-shell/feature-catalog';
import { assertSuperAdmin } from '@/platform/auth/assert-super-admin';
import { withBypass } from '@/platform/db/tenant-context';
import { revalidatePath } from 'next/cache';

/**
 * Persist the feature on/off switches from the super-admin Features form.
 * The form submits a checkbox per nav-derived feature (`name="enabled"`,
 * `value=<key>`); a key present in the submission is ON, absent is OFF. Every
 * known feature is upserted so toggling off writes an explicit `enabled=false`
 * row. Super-admin gated; revalidates the layout so the nav refreshes.
 */
export async function saveFeatureFlagsAction(formData: FormData): Promise<void> {
  await assertSuperAdmin();
  const checked = new Set(formData.getAll('enabled').map(String));
  const features = collectFeatures();
  await withBypass(async (tx) => {
    for (const f of features) {
      const enabled = checked.has(f.key);
      await tx.featureFlag.upsert({
        where: { key: f.key },
        create: { key: f.key, enabled },
        update: { enabled },
      });
    }
  });
  revalidatePath('/', 'layout');
}
