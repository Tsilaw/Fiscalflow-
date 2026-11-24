import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const orders = db.prepare(`
    SELECT o.*, uf.original_filename, fs.parser_id as scan_format,
           fs.receipt_count as scan_receipt_count, fs.warnings as scan_warnings
    FROM orders o
    JOIN uploaded_files uf ON o.uploaded_file_id = uf.id
    JOIN file_scans fs ON o.scan_id = fs.id
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC
  `).all(user.id);

  return NextResponse.json({ orders });
}
