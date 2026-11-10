import type { AppContext } from '@/platform/auth/current-context';
import { hasPermission } from '@/platform/engine/permissions';
import type { WidgetDataEntry, WidgetSlot } from './widget-registry.data';

export type SelectedWidgets = Record<WidgetSlot, WidgetDataEntry[]>;

const SLOT_ORDER: WidgetSlot[] = ['hero', 'actions', 'activity'];

export function selectWidgets(ctx: AppContext, registry: WidgetDataEntry[]): SelectedWidgets {
  const filtered = registry.filter((w) => {
    // At least one required permission must match
    const permitted = w.requires.some((pat) => hasPermission(ctx.permissions, pat));
    if (!permitted) return false;

    // Scope check: when widget is 'own'-scoped, only show to users who actually
    // have an ownership scope on any of the required entities (i.e. they are not
    // an unscoped viewer for this entity). We approximate this by checking whether
    // the user has any scoped permission for the entity family.
    if (w.scope === 'own') {
      const entityFamily = w.requires[0]?.split('.')[0];
      const hasScopedAccess = entityFamily
        ? Array.from(ctx.permissions).some(
            (p) => p.startsWith(`${entityFamily}.`) && p.includes(':'),
          )
        : true;
      if (!hasScopedAccess) return false;
    }

    return true;
  });

  // Deterministic order: by registry array index
  const bySlot: SelectedWidgets = {
    hero: [],
    actions: [],
    quick: [],
    trends: [],
    activity: [],
  };

  for (const w of filtered) {
    bySlot[w.slot].push(w);
  }

  return bySlot;
}

export function orderedSlots(selected: SelectedWidgets): WidgetSlot[] {
  return SLOT_ORDER.filter((s) => selected[s].length > 0);
}
