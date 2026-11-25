import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const totalUsers = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'customer'").get() as any)?.count || 0;
    const totalFiles = (db.prepare("SELECT COUNT(*) as count FROM uploaded_files").get() as any)?.count || 0;
    const totalReceipts = (db.prepare("SELECT COALESCE(SUM(receipt_count), 0) as total FROM orders").get() as any)?.total || 0;
    const pendingOrders = (db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending_verification'").get() as any)?.count || 0;
    const approvedOrders = (db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'completed'").get() as any)?.count || 0;
    const totalRevenue = (db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = 'completed'").get() as any)?.total || 0;

    return NextResponse.json({
      stats: { totalUsers, totalFiles, totalReceipts, pendingOrders, approvedOrders, totalRevenue },
    });
  } catch (error: any) {
    console.error('[ADMIN_STATS_GET_ERROR]', error);
    return NextResponse.json({
      stats: { totalUsers: 0, totalFiles: 0, totalReceipts: 0, pendingOrders: 0, approvedOrders: 0, totalRevenue: 0 },
    });
  }
}
