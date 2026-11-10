import { z } from 'zod';

export const DashboardWidgetSchema = z.object({
  id: z.string(),
  type: z.enum(['kpi', 'list', 'chart', 'quickAction']),
  data: z.record(z.unknown()),
});

export const DashboardLayoutItemSchema = z.object({
  slot: z.enum(['hero', 'actions', 'quick', 'trends', 'activity']),
  widgets: z.array(DashboardWidgetSchema),
});

export const DashboardResponseSchema = z.object({
  tenant: z.object({ id: z.string(), currency: z.string() }).nullable(),
  layout: z.array(DashboardLayoutItemSchema),
});

export type DashboardWidget = z.infer<typeof DashboardWidgetSchema>;
export type DashboardLayoutItem = z.infer<typeof DashboardLayoutItemSchema>;
export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;
