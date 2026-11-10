import { Resend } from 'resend';

let cached: Resend | undefined;

export function resend(): Resend {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error('RESEND_API_KEY is not set');
  }
  cached = new Resend(key);
  return cached;
}

export function resetResendForTests(client?: Resend): void {
  cached = client;
}
