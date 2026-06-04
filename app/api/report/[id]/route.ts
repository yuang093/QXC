import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/report/[id] - 回報失效連結
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const id = parseInt(params.id, 10);
  const { reason } = await req.json().catch(() => ({}));

  const exists = db.prepare('SELECT id FROM scripts WHERE id = ?').get(id);
  if (!exists) {
    return NextResponse.json({ error: 'script not found' }, { status: 404 });
  }

  const result = db.prepare('INSERT INTO reports (script_id, reason) VALUES (?, ?)').run(
    id,
    (reason || '').slice(0, 500)
  );
  return NextResponse.json({ id: result.lastInsertRowid, ok: true });
}

// GET /api/report - 取得所有失效回報 (管理員用)
export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'yuang093';
  if (key !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const reports = db.prepare(`
    SELECT r.*, s.name as script_name
    FROM reports r
    LEFT JOIN scripts s ON s.id = r.script_id
    ORDER BY r.created_at DESC
  `).all();
  return NextResponse.json({ reports });
}
