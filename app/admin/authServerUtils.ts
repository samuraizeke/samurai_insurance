import { cookies } from "next/headers";
import type { Session, User } from "@supabase/supabase-js";

export const SUPABASE_ACCESS_COOKIE = "sb-access-token";
export const SUPABASE_REFRESH_COOKIE = "sb-refresh-token";
export const ADMIN_ROLE = "admin";
export const SUPERADMIN_ROLE = "superadmin";

function extractRoles(user: User): string[] {
  const rawRoles = user.app_metadata?.roles;

  if (Array.isArray(rawRoles)) {
    return rawRoles
      .filter((role): role is string => typeof role === "string")
      .map((role) => role.toLowerCase());
  }

  if (typeof rawRoles === "string") {
    return [rawRoles.toLowerCase()];
  }

  return [];
}

export function userHasAdminAccess(user: User): boolean {
  const roles = extractRoles(user);
  return roles.includes(ADMIN_ROLE) || roles.includes(SUPERADMIN_ROLE);
}

export function userHasSuperAdminAccess(user: User): boolean {
  const roles = extractRoles(user);
  return roles.includes(SUPERADMIN_ROLE);
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
