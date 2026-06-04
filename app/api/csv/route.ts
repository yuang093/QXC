import { NextRequest, NextResponse } from 'next/server';
import { getDb, Script } from '@/lib/db';

export const dynamic = 'force-dynamic';

// 將資料庫轉成 CSV 格式
function toCSV(scripts: Script[]): string {
  const headers = ['id', 'name', 'url', 'description', 'tags', 'downloads', 'size_kb', 'version', 'status', 'created_at', 'updated_at'];
  const escape = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const rows = scripts.map(s => headers.map(h => escape((s as any)[h])).join(','));
  return [headers.join(','), ...rows].join('\n');
}

// 解析 CSV
function parseCSV(csv: string): Partial<Script>[] {
  const lines = csv.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return [];

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQuote) {
        if (c === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (c === '"') { inQuote = false; }
        else { current += c; }
      } else {
        if (c === '"') inQuote = true;
        else if (c === ',') { result.push(current); current = ''; }
        else current += c;
      }
    }
    result.push(current);
    return result;
  };

  const headers = parseLine(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = parseLine(line);
    const row: any = {};
    headers.forEach((h, i) => {
      const v = values[i] ?? '';
      if (['downloads', 'size_kb'].includes(h)) {
        row[h] = v ? parseFloat(v) : null;
      } else {
        row[h] = v;
      }
    });
    return row;
  });
}

// GET /api/csv - 匯出 CSV
export async function GET() {
  const db = getDb();
  const scripts = db.prepare('SELECT * FROM scripts ORDER BY id ASC').all() as Script[];
  const csv = toCSV(scripts);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="qxc-archive-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

// POST /api/csv - 匯入 CSV (管理員)
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'yuang093';
  if (key !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const csv = await req.text();
  const rows = parseCSV(csv);
  const db = getDb();

  // 策略: 完全清空後重建, 確保 CSV 是 single source of truth
  // 保留 comments 與 visits
  const insert = db.prepare(`
    INSERT INTO scripts (name, url, description, tags, downloads, size_kb, version, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM scripts').run();
    for (const r of rows) {
      if (!r.name || !r.url) continue;
      insert.run(
        String(r.name),
        String(r.url),
        String(r.description || ''),
        String(r.tags || ''),
        Number(r.downloads || 0),
        r.size_kb ? Number(r.size_kb) : null,
        r.version ? String(r.version) : null,
        String(r.status || 'active')
      );
      inserted++;
    }
  });

  try {
    tx();
    return NextResponse.json({ ok: true, inserted, total: rows.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
