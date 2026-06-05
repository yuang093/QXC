import { NextRequest, NextResponse } from 'next/server';
import { getDb, withDb, checkAdmin } from '@/lib/firebase-db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    const { reason } = await req.json().catch(() => ({}));
    const db = await getDb();
    if (!db.scripts[String(id)]) {
      return NextResponse.json({ error: 'script not found' }, { status: 404 });
    }

    const newId = await withDb<number>(async (d) => {
      const nid = (Object.values(d.reports).reduce((m, r) => Math.max(m, r.id), 0) || 0) + 1;
      d.reports[String(nid)] = {
        id: nid,
        script_id: id,
        reason: (reason || '').slice(0, 500),
        created_at: new Date().toISOString(),
      };
      return { result: nid };
    });
    return NextResponse.json({ id: newId, ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    if (!checkAdmin(key)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const db = await getDb();
    const reports = Object.values(db.reports)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(r => ({
        ...r,
        script_name: db.scripts[String(r.script_id)]?.name || null,
      }));
    return NextResponse.json({ reports });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
