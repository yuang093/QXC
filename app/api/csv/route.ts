import { NextRequest, NextResponse } from 'next/server';
import { getDb, withDb, checkAdmin, Script } from '@/lib/firebase-db';

export const dynamic = 'force-dynamic';

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
  const rows = scripts.map(s => headers.map(h => {
    if (h === 'tags') return escape((s.tags || []).join(','));
    return escape((s as any)[h]);
  }).join(','));
  return [headers.join(','), ...rows].join('\n');
}

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
      if (h === 'tags') {
        row[h] = v ? v.split(',').map(t => t.trim()).filter(Boolean) : [];
      } else if (['downloads', 'size_kb', 'id'].includes(h)) {
        row[h] = v ? parseFloat(v) : null;
      } else {
        row[h] = v;
      }
    });
    return row;
  });
}

export async function GET() {
  try {
    const db = await getDb();
    const csv = toCSV(Object.values(db.scripts));
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="qxc-archive-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    if (!checkAdmin(searchParams.get('key'))) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const csv = await req.text();
    const rows = parseCSV(csv);

    const result = await withDb<number>(async (db) => {
      let inserted = 0;
      db.scripts = {};
      const now = new Date().toISOString();
      for (const r of rows) {
        if (!r.name || !r.url) continue;
        const id = r.id || (inserted + 1);
        const s: Script = {
          id,
          name: String(r.name),
          url: String(r.url),
          description: String(r.description || ''),
          tags: r.tags || [],
          downloads: Number(r.downloads || 0),
          size_kb: r.size_kb ? Number(r.size_kb) : null,
          version: r.version ? String(r.version) : null,
          status: (r.status === 'deprecated' ? 'deprecated' : 'active'),
          created_at: r.created_at || now,
          updated_at: r.updated_at || now,
        };
        db.scripts[String(id)] = s;
        inserted++;
      }
      return { result: inserted };
    });

    return NextResponse.json({ ok: true, inserted: result, total: rows.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
