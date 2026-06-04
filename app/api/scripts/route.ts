import { NextRequest, NextResponse } from 'next/server';
import { getDb, Script } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/scripts - 取得所有腳本
export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.toLowerCase() || '';
  const tag = searchParams.get('tag') || '';
  const sort = searchParams.get('sort') || 'newest';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = (page - 1) * limit;

  let sql = 'SELECT * FROM scripts WHERE 1=1';
  const params: any[] = [];

  if (q) {
    sql += ' AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(tags) LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like);
  }

  if (tag && tag.toLowerCase() !== 'all') {
    sql += ' AND LOWER(tags) LIKE ?';
    params.push(`%${tag.toLowerCase()}%`);
  }

  if (sort === 'downloads') {
    sql += ' ORDER BY downloads DESC';
  } else if (sort === 'name') {
    sql += ' ORDER BY name ASC';
  } else if (sort === 'oldest') {
    sql += ' ORDER BY created_at ASC';
  } else {
    sql += ' ORDER BY created_at DESC';
  }

  sql += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows = db.prepare(sql).all(...params) as Script[];

  // 取得總數
  let countSql = 'SELECT COUNT(*) as c FROM scripts WHERE 1=1';
  const countParams: any[] = [];
  if (q) {
    countSql += ' AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(tags) LIKE ?)';
    const like = `%${q}%`;
    countParams.push(like, like, like);
  }
  if (tag && tag.toLowerCase() !== 'all') {
    countSql += ' AND LOWER(tags) LIKE ?';
    countParams.push(`%${tag.toLowerCase()}%`);
  }
  const total = (db.prepare(countSql).get(...countParams) as { c: number }).c;

  // 取得所有 tag
  const tagRows = db.prepare("SELECT DISTINCT tags FROM scripts WHERE tags != ''").all() as { tags: string }[];
  const allTags = Array.from(
    new Set(
      tagRows
        .flatMap(r => r.tags.split(','))
        .map(t => t.trim())
        .filter(Boolean)
    )
  ).sort();

  return NextResponse.json({
    scripts: rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    tags: allTags,
  });
}

// POST /api/scripts - 新增腳本
export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { name, url, description, tags, size_kb, version, status } = body;

  if (!name || !url) {
    return NextResponse.json({ error: 'name 和 url 為必填' }, { status: 400 });
  }

  // 字數限制 (與前端一致)
  const MAX_DESC = 3000;
  const MAX_TAGS = 200;
  const MAX_NAME = 200;

  const safeName = String(name).slice(0, MAX_NAME);
  const safeDesc = String(description || '').slice(0, MAX_DESC);
  const safeTags = String(tags || '').slice(0, MAX_TAGS);

  const stmt = db.prepare(`
    INSERT INTO scripts (name, url, description, tags, size_kb, version, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    safeName,
    url,
    safeDesc,
    safeTags,
    size_kb ?? null,
    version ?? null,
    status || 'active'
  );

  return NextResponse.json({ id: result.lastInsertRowid, ok: true });
}
