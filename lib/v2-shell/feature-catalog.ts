import { PANELS } from './nav';

export type FeatureEntry = {
  /** Global feature-flag key (the entity id, e.g. `assets.fixed_asset`). */
  key: string;
  /** Nav item i18n key for the human label. */
  i18nKey: string;
  /** Rail the item lives under — used to group features by module in the UI. */
  railKey: string;
};

/**
 * Every nav item that declares a `feature` key, in nav order, de-duplicated.
 * This is the canonical list of hideable features — derived from the nav so
 * there is no second list to keep in sync (super-admin UI + seed both read it).
 */
export function collectFeatures(): FeatureEntry[] {
  const out: FeatureEntry[] = [];
  const seen = new Set<string>();
  for (const [railKey, sections] of Object.entries(PANELS)) {
    for (const section of sections) {
      for (const item of section.items) {
        if (item.feature && !seen.has(item.feature)) {
          seen.add(item.feature);
          out.push({ key: item.feature, i18nKey: item.i18nKey, railKey });
        }
      }
    }
  }
  return out;
}
