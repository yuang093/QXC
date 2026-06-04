import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST /api/admin/auth - 驗證管理員密碼
export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'yuang093';

  if (password === ADMIN_PASSWORD) {
    // 用 base64 編碼當作簡單 token
    const token = Buffer.from(`qxc-admin:${Date.now()}`).toString('base64');
    return NextResponse.json({ ok: true, token });
  }
  return NextResponse.json({ ok: false, error: '密碼錯誤' }, { status: 401 });
}
