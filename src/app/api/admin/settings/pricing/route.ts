import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const { pricePerReceipt, currency } = await req.json();

    const price = parseFloat(pricePerReceipt);
    if (isNaN(price) || price <= 0) {
      return NextResponse.json({ error: 'Invalid price per receipt' }, { status: 400 });
    }

    db.prepare(`
      UPDATE pricing_settings SET
        price_per_receipt = ?,
        currency = ?,
        updated_at = datetime('now')
      WHERE id = 'default'
    `).run(price, currency || 'ETB');

    return NextResponse.json({ success: true, pricePerReceipt: price, currency: currency || 'ETB' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
