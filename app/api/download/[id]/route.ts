import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/download/[id] - 增加下載次數並返回外部 URL
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const id = parseInt(params.id, 10);
  const script = db.prepare('SELECT * FROM scripts WHERE id = ?').get(id) as any;
  if (!script) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  db.prepare('UPDATE scripts SET downloads = downloads + 1, updated_at = datetime("now") WHERE id = ?').run(id);
  return NextResponse.json({ url: script.url });
}
