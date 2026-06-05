import { NextRequest, NextResponse } from 'next/server';
import { getDb, withDb } from '@/lib/firebase-db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    const db = await getDb();
    const script = db.scripts[String(id)];
    if (!script) return NextResponse.json({ error: 'not found' }, { status: 404 });

    // 非同步增加下載數
    withDb(async (d) => {
      const s = d.scripts[String(id)];
      if (s) {
        s.downloads = (s.downloads || 0) + 1;
        s.updated_at = new Date().toISOString();
      }
      return { result: true };
    }).catch(() => {});

    return NextResponse.json({ url: script.url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
