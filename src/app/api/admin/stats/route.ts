import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const totalUsers = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'customer'").get() as any).count;
  const totalFiles = (db.prepare("SELECT COUNT(*) as count FROM uploaded_files").get() as any).count;
  const totalReceipts = (db.prepare("SELECT COALESCE(SUM(receipt_count), 0) as total FROM orders").get() as any).total;
  const pendingOrders = (db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending_verification'").get() as any).count;
  const approvedOrders = (db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'completed'").get() as any).count;
  const totalRevenue = (db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = 'completed'").get() as any).total;

  return NextResponse.json({
    stats: { totalUsers, totalFiles, totalReceipts, pendingOrders, approvedOrders, totalRevenue },
  });
}
