import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "pos-journal.db");

declare global {
  var _posDbInstance: Database.Database | undefined;
}

function initSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS uploaded_files (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      upload_status TEXT NOT NULL DEFAULT 'uploaded',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS file_scans (
      id TEXT PRIMARY KEY,
      uploaded_file_id TEXT NOT NULL,
      parser_id TEXT,
      receipt_count INTEGER NOT NULL DEFAULT 0,
      parsed_count INTEGER NOT NULL DEFAULT 0,
      review_count INTEGER NOT NULL DEFAULT 0,
      scan_status TEXT NOT NULL DEFAULT 'pending',
      warnings TEXT,
      scanned_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (uploaded_file_id) REFERENCES uploaded_files(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      uploaded_file_id TEXT NOT NULL,
      scan_id TEXT NOT NULL,
      receipt_count INTEGER NOT NULL,
      unit_price REAL NOT NULL DEFAULT 3.0,
      currency TEXT NOT NULL DEFAULT 'ETB',
      total_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'scan_complete',
      payment_method TEXT,
      transaction_reference TEXT,
      evidence_path TEXT,
      rejection_reason TEXT,
      reviewed_by TEXT,
      output_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (uploaded_file_id) REFERENCES uploaded_files(id),
      FOREIGN KEY (scan_id) REFERENCES file_scans(id)
    );

    CREATE TABLE IF NOT EXISTS payment_methods (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      account_name TEXT NOT NULL,
      instructions TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pricing_settings (
      id TEXT PRIMARY KEY DEFAULT 'default',
      price_per_receipt REAL NOT NULL DEFAULT 3.0,
      currency TEXT NOT NULL DEFAULT 'ETB',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT OR IGNORE INTO pricing_settings (id, price_per_receipt, currency)
    VALUES ('default', 3.0, 'ETB');

    INSERT OR IGNORE INTO payment_methods (id, name, account_number, account_name, instructions, enabled)
    VALUES 
    ('telebirr', 'Telebirr', '0911234567', 'FiscalFlow Enterprise', 'Pay via Telebirr app, copy the transaction reference number or upload payment screenshot.', 1),
    ('cbe', 'Commercial Bank of Ethiopia (CBE)', '1000123456789', 'FiscalFlow Enterprise', 'Transfer via CBE Birr or CBE Mobile Banking, enter the FT reference number or upload screenshot.', 1);
  `);

  // Create default admin user if none exists
  const adminExists = database.prepare("SELECT id FROM users WHERE role = 'admin'").get();
  if (!adminExists) {
    const hash = bcrypt.hashSync("admin123", 10);
    database.prepare(`
      INSERT INTO users (id, full_name, email, password_hash, role)
      VALUES (?, ?, ?, ?, 'admin')
    `).run(uuidv4(), "Administrator", "admin@posjournalconverter.com", hash);
  }

  // Create default guest user if none exists
  const guestExists = database.prepare("SELECT id FROM users WHERE id = 'guest'").get();
  if (!guestExists) {
    const hash = bcrypt.hashSync("guest123", 10);
    database.prepare(`
      INSERT INTO users (id, full_name, email, password_hash, role)
      VALUES ('guest', 'Guest Customer', 'guest@fiscalflow.com', ?, 'customer')
    `).run(hash);
  }
}

function getDatabase(): Database.Database {
  if (!globalThis._posDbInstance) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    const instance = new Database(DB_PATH);
    instance.pragma("journal_mode = WAL");
    instance.pragma("foreign_keys = ON");
    initSchema(instance);
    globalThis._posDbInstance = instance;
  }
  return globalThis._posDbInstance;
}

// Lazy Proxy: prevents 28 worker threads from concurrently opening SQLite during next build
const db = new Proxy({} as Database.Database, {
  get(_target, prop) {
    const instance = getDatabase();
    const value = (instance as any)[prop];
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});

export default db;
