import { NextRequest, NextResponse } from 'next/server';
import { getDb, withDb } from '@/lib/github-db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 非同步增加 visit (不阻塞)
    withDb(async (db) => {
      db.visits.total = (db.visits.total || 0) + 1;
      return { result: true, message: 'chore: increment visit' };
    }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = await getDb();
    return NextResponse.json({ total: db.visits.total || 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
