import { z } from 'zod';

export const PushPlatformSchema = z.enum(['ios', 'android']);

export const TokenKindSchema = z.enum(['apns', 'expo']);

export const PushRegisterRequestSchema = z.object({
  token: z.string().min(1),
  platform: PushPlatformSchema,
  deviceName: z.string().optional(),
  tokenKind: TokenKindSchema.optional(),
});

export const PushRegisterResponseSchema = z.object({
  ok: z.literal(true),
});

export const PushUnregisterRequestSchema = z.object({
  token: z.string().min(1),
});

export type PushRegisterRequest = z.infer<typeof PushRegisterRequestSchema>;
