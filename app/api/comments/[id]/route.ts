import { NextRequest, NextResponse } from 'next/server';
import { getDb, withDb, checkAdmin } from '@/lib/firebase-db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = await getDb();
    const id = parseInt(params.id, 10);
    const comments = Object.values(db.comments)
      .filter(c => c.script_id === id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return NextResponse.json({ comments });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    const { author, content } = await req.json();
    if (!content || !content.trim()) {
      return NextResponse.json({ error: '內容不可空白' }, { status: 400 });
    }
    const db = await getDb();
    if (!db.scripts[String(id)]) {
      return NextResponse.json({ error: 'script not found' }, { status: 404 });
    }

    const newId = await withDb<number>(async (d) => {
      const nid = (Object.values(d.comments).reduce((m, c) => Math.max(m, c.id), 0) || 0) + 1;
      d.comments[String(nid)] = {
        id: nid,
        script_id: id,
        author: (author?.trim() || 'Anonymous').slice(0, 50),
        content: content.trim().slice(0, 1000),
        created_at: new Date().toISOString(),
      };
      return { result: nid };
    });
    return NextResponse.json({ id: newId, ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    if (!checkAdmin(key)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const commentId = parseInt(searchParams.get('commentId') || '0', 10);
    const scriptId = parseInt(params.id, 10);
    if (!commentId) {
      return NextResponse.json({ error: 'commentId required' }, { status: 400 });
    }

    const result = await withDb<boolean>(async (d) => {
      const k = String(commentId);
      if (!d.comments[k] || d.comments[k].script_id !== scriptId) return { result: false };
      delete d.comments[k];
      return { result: true };
    });
    if (!result) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
