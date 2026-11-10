import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const target = new URL('/api/mobile/me', req.url);
  target.search = req.nextUrl.search;
  return NextResponse.redirect(target, 308);
}
