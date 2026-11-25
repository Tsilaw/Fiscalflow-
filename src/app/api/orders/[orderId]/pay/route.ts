import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import db, { getWritableDataDir } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const user = getUserFromRequest(req);
  const { orderId } = await params;

  try {
    const order = user
      ? (db.prepare('SELECT * FROM orders WHERE id = ? AND (user_id = ? OR user_id = \'guest\')').get(orderId, user.id) as any)
      : (db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status !== 'scan_complete' && order.status !== 'rejected') {
      return NextResponse.json({ error: 'Order is not in a payable state' }, { status: 400 });
    }

    const formData = await req.formData();
    const paymentMethod = (formData.get('paymentMethod') || formData.get('paymentMethodId') || 'telebirr') as string;
    const transactionReference = formData.get('transactionReference') as string;
    const evidence = formData.get('evidence') as File | null;

    if (!paymentMethod) {
      return NextResponse.json({ error: 'Payment method is required' }, { status: 400 });
    }

    let evidencePath = null;
    if (evidence && evidence.size > 0) {
      const evidenceDir = path.join(getWritableDataDir(), 'evidence');
      if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
      evidencePath = path.join(evidenceDir, `${uuidv4()}_${evidence.name}`);
      const buffer = Buffer.from(await evidence.arrayBuffer());
      fs.writeFileSync(evidencePath, buffer);
    }

    db.prepare(`
      UPDATE orders SET
        status = 'pending_verification',
        payment_method = ?,
        transaction_reference = ?,
        evidence_path = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(paymentMethod, transactionReference || null, evidencePath, orderId);

    const actorId = user ? user.id : 'guest';
    db.prepare(
      'INSERT INTO activity_logs (id, actor_user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(uuidv4(), actorId, 'payment_submitted', 'order', orderId, JSON.stringify({ paymentMethod, transactionReference }));

    return NextResponse.json({ success: true, status: 'pending_verification' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
