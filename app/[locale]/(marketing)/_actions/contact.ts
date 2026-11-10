'use server';

import { prisma } from '@/platform/db';
import { notifyOpsOfLead } from '@/platform/marketing/send-emails';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  company: z.string().trim().max(160).optional().or(z.literal('')),
  size: z.string().trim().max(40).optional().or(z.literal('')),
  message: z.string().trim().min(10).max(4000),
  source: z.string().trim().max(64).optional(),
});

export type ContactFormError = 'invalid_name' | 'invalid_email' | 'invalid_message' | 'failed';

export interface ContactFormResult {
  ok: boolean;
  error?: ContactFormError;
}

export async function submitContactForm(input: {
  name: string;
  email: string;
  company?: string;
  size?: string;
  message: string;
  source?: string;
}): Promise<ContactFormResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    if (flat.fieldErrors.email) return { ok: false, error: 'invalid_email' };
    if (flat.fieldErrors.name) return { ok: false, error: 'invalid_name' };
    if (flat.fieldErrors.message) return { ok: false, error: 'invalid_message' };
    return { ok: false, error: 'failed' };
  }

  const { name, email, company, size, message, source } = parsed.data;

  try {
    await prisma.marketingLead.create({
      data: {
        name,
        email,
        company: company || null,
        size: size || null,
        message,
        source: source ?? 'contact',
        status: 'new',
      },
    });

    // fire-and-forget ops notification
    await notifyOpsOfLead({
      name,
      email,
      company: company || undefined,
      size: size || undefined,
      message,
      source: source ?? 'contact',
    });

    return { ok: true };
  } catch (err) {
    console.error('[marketing] submitContactForm failed:', err);
    return { ok: false, error: 'failed' };
  }
}
