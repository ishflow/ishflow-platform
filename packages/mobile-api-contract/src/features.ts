import { z } from 'zod';

export const MobileFeaturesSchema = z.object({
  sales: z.boolean().default(true),
  prices: z.boolean().default(true),
  inventory: z.boolean().default(true),
  purchases: z.boolean().default(false).optional(),
  payments: z.boolean().default(false).optional(),
});

export type MobileFeatures = z.infer<typeof MobileFeaturesSchema>;

export const DEFAULT_MOBILE_FEATURES: MobileFeatures = {
  sales: true,
  prices: true,
  inventory: true,
};
