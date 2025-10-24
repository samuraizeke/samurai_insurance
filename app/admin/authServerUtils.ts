import { cookies } from "next/headers";
import type { Session } from "@supabase/supabase-js";

export const SUPABASE_ACCESS_COOKIE = "sb-access-token";
export const SUPABASE_REFRESH_COOKIE = "sb-refresh-token";

export function getAllowedAdminEmails(): string[] | null {
  const raw = process.env.ADMIN_ALLOWED_EMAILS;

  if (!raw) {
    return null;
  }

  const emails = raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return emails.length > 0 ? emails : null;
}

export async function storeAdminSessionCookies(session: Session) {
  const store = await cookies();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = session.expires_at ?? now + 60 * 60; // fallback to 1 hour
  const maxAge = Math.max(expiresAt - now, 60);
  const secure = process.env.NODE_ENV === "production";

  store.set({
    name: SUPABASE_ACCESS_COOKIE,
    value: session.access_token,
    httpOnly: true,
    sameSite: "strict",
    secure,
    path: "/",
    maxAge,
  });

  if (session.refresh_token) {
    const refreshMaxAge = 60 * 60 * 24 * 14; // 14 days
    store.set({
      name: SUPABASE_REFRESH_COOKIE,
      value: session.refresh_token,
      httpOnly: true,
      sameSite: "strict",
      secure,
      path: "/",
      maxAge: refreshMaxAge,
    });
  }
}

export async function clearAdminSessionCookies() {
  const store = await cookies();
  store.delete(SUPABASE_ACCESS_COOKIE);
  store.delete(SUPABASE_REFRESH_COOKIE);
}

export async function readAdminSessionTokens(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
}> {
  const store = await cookies();
  return {
    accessToken: store.get(SUPABASE_ACCESS_COOKIE)?.value ?? null,
    refreshToken: store.get(SUPABASE_REFRESH_COOKIE)?.value ?? null,
  };
}
