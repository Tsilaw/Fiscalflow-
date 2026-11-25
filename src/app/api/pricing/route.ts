import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const pricing = db.prepare('SELECT price_per_receipt, currency FROM pricing_settings WHERE id = ?').get('default') as any;
    return NextResponse.json({ pricing: pricing || { price_per_receipt: 3.0, currency: 'ETB' } });
  } catch {
    return NextResponse.json({ pricing: { price_per_receipt: 3.0, currency: 'ETB' } });
  }
}
