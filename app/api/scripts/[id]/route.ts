import { NextRequest, NextResponse } from 'next/server';
import { getDb, withDb } from '@/lib/github-db';

export const dynamic = 'force-dynamic';

// GET /api/scripts/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = await getDb();
    const id = parseInt(params.id, 10);
    const script = db.scripts.find(s => s.id === id);
    if (!script) return NextResponse.json({ error: 'not found' }, { status: 404 });
    const comments = db.comments.filter(c => c.script_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at));
    return NextResponse.json({ script, comments });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT /api/scripts/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    const body = await req.json();
    const { name, url, description, tags, size_kb, version, status } = body;

    const result = await withDb<boolean>(async (db) => {
      const idx = db.scripts.findIndex(s => s.id === id);
      if (idx === -1) return { result: false, message: '' };
      const cur = db.scripts[idx];

      db.scripts[idx] = {
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
      return { result: true, message: `chore: update script #${id}` };
    });

    if (!result) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/scripts/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    const result = await withDb<boolean>(async (db) => {
      const before = db.scripts.length;
      db.scripts = db.scripts.filter(s => s.id !== id);
      db.comments = db.comments.filter(c => c.script_id !== id);
      db.reports = db.reports.filter(r => r.script_id !== id);
      return { result: db.scripts.length < before, message: `chore: delete script #${id}` };
    });

    if (!result) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
