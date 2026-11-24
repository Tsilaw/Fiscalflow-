import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { parsePOSJournal } from '@/lib/parser';
import { generateExcel } from '@/lib/excel';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { orderId } = await params;

  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status !== 'pending_verification') {
      return NextResponse.json({ error: 'Order is not pending verification' }, { status: 400 });
    }

    const uploadedFile = db.prepare('SELECT * FROM uploaded_files WHERE id = ?').get(order.uploaded_file_id) as any;
    const content = fs.readFileSync(uploadedFile.storage_path, 'utf-8');

    const scanResult = parsePOSJournal(content);
    const excelBuffer = await generateExcel(scanResult.receipts, uploadedFile.original_filename);

    const outputDir = path.join(process.cwd(), 'data', 'output');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `${orderId}.xlsx`);
    fs.writeFileSync(outputPath, excelBuffer);

    db.prepare(`
      UPDATE orders SET
        status = 'completed',
        reviewed_by = ?,
        output_path = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(user.id, outputPath, orderId);

    db.prepare(
      'INSERT INTO activity_logs (id, actor_user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)'
    ).run(uuidv4(), user.id, 'payment_approved', 'order', orderId);

    return NextResponse.json({ success: true, status: 'completed' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
