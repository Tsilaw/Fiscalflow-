import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { orderId } = await params;
  const order = db.prepare('SELECT evidence_path FROM orders WHERE id = ?').get(orderId) as any;

  if (!order || !order.evidence_path) {
    return NextResponse.json({ error: 'No evidence uploaded for this order' }, { status: 404 });
  }

  if (!fs.existsSync(order.evidence_path)) {
    return NextResponse.json({ error: 'Evidence file not found on disk' }, { status: 404 });
  }

  const buffer = fs.readFileSync(order.evidence_path);
  const ext = path.extname(order.evidence_path).toLowerCase();
  let contentType = 'application/octet-stream';
  if (['.jpg', '.jpeg'].includes(ext)) contentType = 'image/jpeg';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.webp') contentType = 'image/webp';
  else if (ext === '.pdf') contentType = 'application/pdf';

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': 'inline',
    },
  });
}
