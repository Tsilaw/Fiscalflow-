import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const { id, name, accountNumber, accountName, instructions, enabled } = await req.json();

    if (!id || !accountNumber || !accountName) {
      return NextResponse.json({ error: 'ID, Account Number, and Account Name are required' }, { status: 400 });
    }

    db.prepare(`
      UPDATE payment_methods SET
        name = COALESCE(?, name),
        account_number = ?,
        account_name = ?,
        instructions = COALESCE(?, instructions),
        enabled = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(name, accountNumber, accountName, instructions, enabled ? 1 : 0, id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
