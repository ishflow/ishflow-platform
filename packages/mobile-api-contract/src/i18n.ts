import { z } from 'zod';

export const SUPPORTED_LOCALES = ['ru', 'en', 'tr', 'uz', 'ky', 'de', 'fr', 'zh'] as const;
export const LocaleSchema = z.enum(SUPPORTED_LOCALES);
export type Locale = z.infer<typeof LocaleSchema>;

export const MessagesResponseSchema = z.object({
  locale: LocaleSchema,
  messages: z.record(z.unknown()),
});
export type MessagesResponse = z.infer<typeof MessagesResponseSchema>;
