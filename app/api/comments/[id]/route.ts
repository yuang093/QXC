import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/comments/[id] - 取得留言
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const id = parseInt(params.id, 10);
  const comments = db.prepare('SELECT * FROM comments WHERE script_id = ? ORDER BY created_at DESC').all(id);
  return NextResponse.json({ comments });
}

// POST /api/comments/[id] - 新增留言
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const id = parseInt(params.id, 10);
  const { author, content } = await req.json();

  if (!content || content.trim().length === 0) {
    return NextResponse.json({ error: '內容不可空白' }, { status: 400 });
  }

  // 驗證 script 存在
  const exists = db.prepare('SELECT id FROM scripts WHERE id = ?').get(id);
  if (!exists) {
    return NextResponse.json({ error: 'script not found' }, { status: 404 });
  }

  const result = db.prepare(
    'INSERT INTO comments (script_id, author, content) VALUES (?, ?, ?)'
  ).run(id, author?.trim() || 'Anonymous', content.trim().slice(0, 1000));

  return NextResponse.json({ id: result.lastInsertRowid, ok: true });
}

// DELETE /api/comments/[id] - 刪除留言 (需要管理員密碼)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const adminKey = searchParams.get('key');
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'yuang093';

  if (adminKey !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const id = parseInt(params.id, 10);
  const result = db.prepare('DELETE FROM comments WHERE id = ?').run(id);
  if (result.changes === 0) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
