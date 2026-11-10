import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { LocaleSchema, MessagesResponseSchema } from '@ishflow/mobile-api-contract';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ locale: string }> },
): Promise<Response> {
  const { locale } = await ctx.params;
  const parsed = LocaleSchema.safeParse(locale);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid locale' }, { status: 400 });
  }

  const file = path.join(process.cwd(), 'messages', `${parsed.data}.json`);
  let raw: string;
  try {
    raw = await readFile(file, 'utf8');
  } catch {
    return NextResponse.json({ error: 'locale not found' }, { status: 404 });
  }

  const messages = JSON.parse(raw);
  const body = MessagesResponseSchema.parse({ locale: parsed.data, messages });
  return NextResponse.json(body, {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  });
}
