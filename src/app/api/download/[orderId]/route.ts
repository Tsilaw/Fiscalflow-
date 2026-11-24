import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import db from '@/lib/db';
import fs from 'fs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const user = getUserFromRequest(req);
  const { orderId } = await params;

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (user && order.user_id !== 'guest' && order.user_id !== user.id && user.role !== 'admin') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  if (order.status !== 'completed' || !order.output_path) {
    return NextResponse.json({ error: 'File not ready for download' }, { status: 400 });
  }

  if (!fs.existsSync(order.output_path)) {
    return NextResponse.json({ error: 'Output file not found' }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(order.output_path);
  const uploadedFile = db.prepare('SELECT original_filename FROM uploaded_files WHERE id = ?').get(order.uploaded_file_id) as any;
  const outputName = (uploadedFile?.original_filename || 'journal').replace('.txt', '') + '_converted.xlsx';

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${outputName}"`,
    },
  });
}
