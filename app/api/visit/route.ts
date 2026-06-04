import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/visit - 記錄一次訪問
export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json().catch(() => ({}));
  const path = body?.path || '/';

  // 取得 IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  const ua = req.headers.get('user-agent') || '';

  db.prepare('INSERT INTO visits (path, user_agent, ip) VALUES (?, ?, ?)').run(path, ua.slice(0, 200), ip);
  return NextResponse.json({ ok: true });
}

// GET /api/visit - 取得訪問統計
export async function GET() {
  const db = getDb();
  const total = (db.prepare('SELECT COUNT(*) as c FROM visits').get() as { c: number }).c;
  const today = (db.prepare(
    "SELECT COUNT(*) as c FROM visits WHERE date(visited_at) = date('now')"
  ).get() as { c: number }).c;
  const last7 = (db.prepare(
    "SELECT COUNT(*) as c FROM visits WHERE visited_at >= datetime('now', '-7 days')"
  ).get() as { c: number }).c;

  return NextResponse.json({ total, today, last7 });
}
