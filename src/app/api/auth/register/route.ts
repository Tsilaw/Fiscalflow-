import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { createToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { fullName, email, phone, password } = await req.json();

    if (!fullName || !email || !password) {
      return NextResponse.json({ error: 'Full name, email, and password are required' }, { status: 400 });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const id = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 10);

    db.prepare(
      'INSERT INTO users (id, full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, fullName, email, phone || null, passwordHash, 'customer');

    const token = createToken(id, 'customer');

    const response = NextResponse.json({ success: true, user: { id, fullName, email, role: 'customer' } });
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 86400,
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
