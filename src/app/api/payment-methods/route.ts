import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  const methods = db.prepare('SELECT id, name, account_number, account_name, instructions, enabled FROM payment_methods WHERE enabled = 1').all();
  return NextResponse.json({ paymentMethods: methods });
}
