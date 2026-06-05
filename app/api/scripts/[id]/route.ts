import { NextRequest, NextResponse } from 'next/server';
import { getDb, withDb } from '@/lib/firebase-db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = await getDb();
    const id = parseInt(params.id, 10);
    const script = db.scripts[String(id)];
    if (!script) return NextResponse.json({ error: 'not found' }, { status: 404 });
    const comments = Object.values(db.comments)
      .filter(c => c.script_id === id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return NextResponse.json({ script, comments });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    const body = await req.json();
    const { name, url, description, tags, size_kb, version, status } = body;

    const result = await withDb<boolean>(async (db) => {
      const key = String(id);
      const cur = db.scripts[key];
      if (!cur) return { result: false };

      db.scripts[key] = {
        ...cur,
        name: name ? String(name).slice(0, 200) : cur.name,
        url: url ?? cur.url,
        description: description !== undefined ? String(description).slice(0, 3000) : cur.description,
        tags: Array.isArray(tags) ? tags :
              (typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : cur.tags),
        size_kb: size_kb !== undefined ? (size_kb ? Number(size_kb) : null) : cur.size_kb,
        version: version !== undefined ? (version ? String(version) : null) : cur.version,
        status: status === 'deprecated' ? 'deprecated' : (status === 'active' ? 'active' : cur.status),
        updated_at: new Date().toISOString(),
      };
      return { result: true };
    });

    if (!result) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    const result = await withDb<boolean>(async (db) => {
      const key = String(id);
      if (!db.scripts[key]) return { result: false };
      delete db.scripts[key];
      // 同時刪除留言與回報
      for (const c of Object.keys(db.comments)) {
        if (db.comments[c].script_id === id) delete db.comments[c];
      }
      for (const r of Object.keys(db.reports)) {
        if (db.reports[r].script_id === id) delete db.reports[r];
      }
      return { result: true };
    });

    if (!result) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
