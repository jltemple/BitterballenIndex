import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export const ADMIN_COOKIE = "admin_token";
export const ADMIN_COOKIE_VALUE = "authenticated";

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE);
  return token?.value === process.env.ADMIN_COOKIE_SECRET;
}

// Call in API routes to guard admin endpoints
export async function requireAdmin(): Promise<Response | null> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}
