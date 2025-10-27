import "server-only";

import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import {
  clearAdminSessionCookies,
  getAllowedAdminEmails,
  readAdminSessionTokens,
  storeAdminSessionCookies,
} from "./authServerUtils";

export type AdminContext =
  | { authorized: false; message?: string }
  | { authorized: true; user: User };

export async function resolveAdminContext(): Promise<AdminContext> {
  const { accessToken, refreshToken } = await readAdminSessionTokens();

  if (!accessToken || !refreshToken) {
    return { authorized: false };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error || !data.session || !data.user) {
    console.error("Failed to restore admin session", error ?? data);
    await clearAdminSessionCookies();
    return {
      authorized: false,
      message: "Your session expired. Please sign in again.",
    };
  }

  const allowedEmails = getAllowedAdminEmails();
  if (
    allowedEmails &&
    (!data.user.email ||
      !allowedEmails.includes(data.user.email.toLowerCase()))
  ) {
    console.warn(
      "Admin access denied for unauthorized email",
      data.user.email
    );
    await clearAdminSessionCookies();
    return {
      authorized: false,
      message: "You do not have admin access.",
    };
  }

  if (
    data.session.access_token !== accessToken ||
    data.session.refresh_token !== refreshToken
  ) {
    await storeAdminSessionCookies(data.session);
  }

  return {
    authorized: true,
    user: data.user,
  };
}
