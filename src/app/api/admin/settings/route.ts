import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const pricing = db.prepare('SELECT price_per_receipt, currency FROM pricing_settings WHERE id = ?').get('default');
    const paymentMethods = db.prepare('SELECT * FROM payment_methods').all();
    const admins = db.prepare("SELECT id, full_name, email, role, created_at FROM users WHERE role = 'admin' ORDER BY created_at DESC").all();

    return NextResponse.json({
      pricing,
      paymentMethods,
      admins,
    });
  } catch (error: any) {
    console.error('[ADMIN_SETTINGS_GET_ERROR]', error);
    return NextResponse.json({
      pricing: { price_per_receipt: 3.0, currency: 'ETB' },
      paymentMethods: [],
      admins: [],
    });
  }
}
