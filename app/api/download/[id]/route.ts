import { NextRequest, NextResponse } from 'next/server';
import { getDb, withDb } from '@/lib/github-db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    const db = await getDb();
    const script = db.scripts.find(s => s.id === id);
    if (!script) return NextResponse.json({ error: 'not found' }, { status: 404 });

    // 非同步更新下載數 (不阻塞回應)
    withDb(async (d) => {
      const s = d.scripts.find(x => x.id === id);
      if (s) {
        s.downloads = (s.downloads || 0) + 1;
        s.updated_at = new Date().toISOString();
      }
      return { result: true, message: `chore: increment downloads #${id}` };
    }).catch(() => {});

    return NextResponse.json({ url: script.url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
