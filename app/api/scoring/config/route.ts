import { NextRequest, NextResponse } from 'next/server';
import {
  decodeScoreConfigFromCookieValue,
  DEFAULT_SCORE_CONFIG,
  encodeScoreConfigToCookieValue,
  getScoreConfigCookieName,
  normalizeScoreConfig,
} from '@/lib/scoreConfig';

export async function GET(req: NextRequest) {
  const raw = req.cookies.get(getScoreConfigCookieName())?.value;
  const config = decodeScoreConfigFromCookieValue(raw) ?? DEFAULT_SCORE_CONFIG;
  return NextResponse.json({ success: true, config });
}

export async function POST(req: NextRequest) {
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const config = normalizeScoreConfig(body?.config ?? body);

  const res = NextResponse.json({ success: true, config });
  res.cookies.set(getScoreConfigCookieName(), encodeScoreConfigToCookieValue(config), {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(getScoreConfigCookieName(), '', {
    path: '/',
    sameSite: 'lax',
    maxAge: 0,
  });
  return res;
}
