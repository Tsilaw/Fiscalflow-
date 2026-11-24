import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { orderId } = await params;

  try {
    const { reason } = await req.json();

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status !== 'pending_verification') {
      return NextResponse.json({ error: 'Order is not pending verification' }, { status: 400 });
    }

    db.prepare(`
      UPDATE orders SET
        status = 'rejected',
        reviewed_by = ?,
        rejection_reason = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(user.id, reason || 'Payment could not be verified against the receiving account.', orderId);

    db.prepare(
      'INSERT INTO activity_logs (id, actor_user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(uuidv4(), user.id, 'payment_rejected', 'order', orderId, JSON.stringify({ reason }));

    return NextResponse.json({ success: true, status: 'rejected' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
