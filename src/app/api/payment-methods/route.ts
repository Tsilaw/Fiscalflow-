import { NextResponse } from 'next/server';
import db from '@/lib/db';

const DEFAULT_METHODS = [
  {
    id: 'telebirr',
    name: 'Telebirr',
    account_number: '0911234567',
    account_name: 'FiscalFlow Enterprise',
    instructions: 'Pay via Telebirr app, copy the transaction reference number or upload payment screenshot.',
    enabled: 1,
  },
  {
    id: 'cbe',
    name: 'Commercial Bank of Ethiopia (CBE)',
    account_number: '1000123456789',
    account_name: 'FiscalFlow Enterprise',
    instructions: 'Transfer via CBE Birr or CBE Mobile Banking, enter the FT reference number or upload screenshot.',
    enabled: 1,
  },
];

export async function GET() {
  try {
    const methods = db.prepare('SELECT id, name, account_number, account_name, instructions, enabled FROM payment_methods WHERE enabled = 1').all();
    if (methods && methods.length > 0) {
      return NextResponse.json({ paymentMethods: methods });
    }
    return NextResponse.json({ paymentMethods: DEFAULT_METHODS });
  } catch {
    return NextResponse.json({ paymentMethods: DEFAULT_METHODS });
  }
}
