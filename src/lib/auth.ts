import { NextRequest } from "next/server";
import db from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "pos-journal-secret-key-change-in-production";

// Simple JWT-like token using base64 (for MVP; use jose/jsonwebtoken in production)
export function createToken(userId: string, role: string): string {
  const payload = {
    userId,
    role,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function verifyToken(token: string): { userId: string; role: string } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, "base64url").toString());
    if (payload.exp < Date.now()) return null;
    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}

export function getAuthFromRequest(req: NextRequest) {
  const cookie = req.cookies.get("token")?.value;
  const authHeader = req.headers.get("authorization");
  const token = cookie || authHeader?.replace("Bearer ", "");
  if (!token) return null;
  return verifyToken(token);
}

export function getUserFromRequest(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return null;
  const user = db.prepare("SELECT id, full_name, email, phone, role, status FROM users WHERE id = ?").get(auth.userId) as any;
  if (!user) return null;
  return {
    ...user,
    fullName: user.full_name,
  };
}
