import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { parsePOSJournal } from '@/lib/parser';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  const userId = user ? user.id : 'guest';

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.txt')) {
      return NextResponse.json({ error: 'Only .txt files are accepted' }, { status: 400 });
    }

    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 15MB)' }, { status: 400 });
    }

    const content = await file.text();

    if (!content.trim()) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), 'data', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const fileId = uuidv4();
    const storagePath = path.join(uploadsDir, `${fileId}.txt`);
    fs.writeFileSync(storagePath, content, 'utf-8');

    db.prepare(
      'INSERT INTO uploaded_files (id, user_id, original_filename, storage_path, file_size, upload_status) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(fileId, userId, file.name, storagePath, file.size, 'uploaded');

    const scanResult = parsePOSJournal(content);

    const scanId = uuidv4();
    db.prepare(
      'INSERT INTO file_scans (id, uploaded_file_id, parser_id, receipt_count, parsed_count, review_count, scan_status, warnings) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      scanId, fileId, 'fiscalflow-parser-v2',
      scanResult.totalReceipts,
      scanResult.parsedReceipts,
      scanResult.reviewCount,
      scanResult.parsedReceipts > 0 ? 'complete' : 'failed',
      JSON.stringify(scanResult.warnings)
    );

    const pricing = db.prepare('SELECT * FROM pricing_settings WHERE id = ?').get('default') as any;
    const unitPrice = pricing?.price_per_receipt || 3.0;
    const currency = pricing?.currency || 'ETB';
    const totalAmount = scanResult.parsedReceipts * unitPrice;

    const orderId = uuidv4();
    db.prepare(
      'INSERT INTO orders (id, user_id, uploaded_file_id, scan_id, receipt_count, unit_price, currency, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(orderId, userId, fileId, scanId, scanResult.parsedReceipts, unitPrice, currency, totalAmount, 'scan_complete');

    db.prepare(
      'INSERT INTO activity_logs (id, actor_user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(uuidv4(), userId, 'file_uploaded', 'uploaded_file', fileId, JSON.stringify({ filename: file.name, receipts: scanResult.parsedReceipts }));

    const previewReceipts = scanResult.receipts.slice(0, 5).map(r => ({
      receiptNumber: r.receiptNumber,
      date: r.date,
      time: r.time,
      total: r.total,
      itemCount: r.items.length,
      paymentMethod: r.paymentMethod,
    }));

    return NextResponse.json({
      success: true,
      fileId,
      scanId,
      orderId,
      scan: {
        format: scanResult.format,
        totalReceipts: scanResult.totalReceipts,
        parsedReceipts: scanResult.parsedReceipts,
        reviewCount: scanResult.reviewCount,
        warnings: scanResult.warnings,
        preview: previewReceipts,
      },
      pricing: {
        unitPrice,
        currency,
        totalAmount,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
