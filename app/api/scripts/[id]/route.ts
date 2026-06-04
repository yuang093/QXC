import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/scripts/[id] - 取得單一腳本
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const id = parseInt(params.id, 10);
  const script = db.prepare('SELECT * FROM scripts WHERE id = ?').get(id) as any;
  if (!script) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  // 包含留言
  const comments = db.prepare('SELECT * FROM comments WHERE script_id = ? ORDER BY created_at DESC').all(id);
  return NextResponse.json({ script, comments });
}

// PUT /api/scripts/[id] - 更新腳本
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const id = parseInt(params.id, 10);
  const body = await req.json();
  const { name, url, description, tags, size_kb, version, status } = body;

  const existing = db.prepare('SELECT * FROM scripts WHERE id = ?').get(id);
  if (!existing) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  db.prepare(`
    UPDATE scripts SET
      name = ?, url = ?, description = ?, tags = ?,
      size_kb = ?, version = ?, status = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    (name ?? (existing as any).name).toString().slice(0, 200),
    url ?? (existing as any).url,
    (description ?? (existing as any).description).toString().slice(0, 1000),
    (tags ?? (existing as any).tags).toString().slice(0, 200),
    size_kb ?? (existing as any).size_kb,
    version ?? (existing as any).version,
    status ?? (existing as any).status,
    id
  );

  return NextResponse.json({ ok: true });
}

// DELETE /api/scripts/[id] - 刪除腳本
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const id = parseInt(params.id, 10);
  const result = db.prepare('DELETE FROM scripts WHERE id = ?').run(id);
  if (result.changes === 0) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
