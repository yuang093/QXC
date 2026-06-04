import { NextRequest, NextResponse } from 'next/server';
import { checkAdmin } from '@/lib/github-db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (checkAdmin(password)) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, error: '密碼錯誤' }, { status: 401 });
}
