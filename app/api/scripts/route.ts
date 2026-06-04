import { NextRequest, NextResponse } from 'next/server';
import { getDb, withDb } from '@/lib/github-db';

export const dynamic = 'force-dynamic';

// GET /api/scripts - 取得所有腳本
export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.toLowerCase() || '';
    const tag = searchParams.get('tag') || '';
    const sort = searchParams.get('sort') || 'newest';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    let scripts = [...db.scripts];

    if (q) {
      scripts = scripts.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    if (tag && tag.toLowerCase() !== 'all') {
      const tagLower = tag.toLowerCase();
      scripts = scripts.filter(s => s.tags.some(t => t.toLowerCase() === tagLower));
    }

    if (sort === 'downloads') {
      scripts.sort((a, b) => b.downloads - a.downloads);
    } else if (sort === 'name') {
      scripts.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'oldest') {
      scripts.sort((a, b) => a.created_at.localeCompare(b.created_at));
    } else {
      scripts.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }

    const total = scripts.length;
    const paged = scripts.slice(offset, offset + limit);

    // 取得所有 tag
    const allTags = Array.from(
      new Set(db.scripts.flatMap(s => s.tags).filter(Boolean))
    ).sort();

    return NextResponse.json({
      scripts: paged,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      tags: allTags,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/scripts - 新增腳本
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, url, description, tags, size_kb, version, status } = body;

    if (!name || !url) {
      return NextResponse.json({ error: 'name 和 url 為必填' }, { status: 400 });
    }

    const MAX_DESC = 3000;
    const MAX_TAGS = 200;
    const MAX_NAME = 200;

    const result = await withDb<number>(async (db) => {
      const newId = (db.scripts.reduce((max, s) => Math.max(max, s.id), 0) || 0) + 1;
      const now = new Date().toISOString();
      const newScript = {
        id: newId,
        name: String(name).slice(0, MAX_NAME),
        url: String(url),
        description: String(description || '').slice(0, MAX_DESC),
        tags: Array.isArray(tags) ? tags.slice(0, 20) :
              (typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 20) : []),
        downloads: 0,
        size_kb: size_kb ? Number(size_kb) : null,
        version: version ? String(version) : null,
        status: (status === 'deprecated' ? 'deprecated' : 'active') as 'active' | 'deprecated',
        created_at: now,
        updated_at: now,
      };
      db.scripts.push(newScript);
      return { result: newId, message: `chore: add script ${newScript.name}` };
    });

    return NextResponse.json({ id: result, ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
