import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const orders = db.prepare(`
    SELECT o.*, uf.original_filename, u.full_name as customer_name, u.email as customer_email,
           fs.receipt_count as scan_receipt_count, fs.warnings as scan_warnings
    FROM orders o
    JOIN uploaded_files uf ON o.uploaded_file_id = uf.id
    JOIN users u ON o.user_id = u.id
    JOIN file_scans fs ON o.scan_id = fs.id
    ORDER BY o.created_at DESC
  `).all();

  return NextResponse.json({ orders });
}
