'use server';

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import {
  clearAdminSessionCookies,
  getAllowedAdminEmails,
  readAdminSessionTokens,
  storeAdminSessionCookies,
} from "./authServerUtils";

type FieldErrors = {
  email?: string;
  password?: string;
};

export type AdminAuthState = {
  success: boolean;
  error?: string;
  fieldErrors?: FieldErrors;
};

export async function authenticateAdmin(
  _prevState: AdminAuthState,
  formData: FormData
): Promise<AdminAuthState> {
  const emailEntry = formData.get("email");
  const passwordEntry = formData.get("password");
  const fieldErrors: FieldErrors = {};

  const email =
    typeof emailEntry === "string" ? emailEntry.trim() : undefined;
  const password =
    typeof passwordEntry === "string" ? passwordEntry : undefined;

  if (!email) {
    fieldErrors.email = "Enter your email address.";
  }

  if (!password) {
    fieldErrors.password = "Enter your password.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      fieldErrors,
    };
  }

  const normalizedEmail = email!.toLowerCase();
  const allowedEmails = getAllowedAdminEmails();
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: password!,
  });

  if (error) {
    console.error("Admin login failed", error);
    return {
      success: false,
      error:
        error.message === "Invalid login credentials"
          ? "Incorrect email or password."
          : "Unable to sign in right now. Try again later.",
    };
  }

  if (!data.session || !data.user) {
    console.error("Admin login missing session or user", data);
    return {
      success: false,
      error: "Unable to sign in right now. Try again later.",
    };
  }

  if (
    allowedEmails &&
    (!data.user.email ||
      !allowedEmails.includes(data.user.email.toLowerCase()))
  ) {
    console.warn(
      "Admin login blocked for unauthorized email",
      data.user.email
    );
    return {
      success: false,
      error: "You do not have admin access.",
    };
  }

  await storeAdminSessionCookies(data.session);

  return { success: true };
}

export async function signOutAdmin() {
  const { accessToken, refreshToken } = await readAdminSessionTokens();

  if (accessToken && refreshToken) {
    try {
      const supabase = createSupabaseServerClient();
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (!sessionError) {
        await supabase.auth.signOut();
      } else {
        console.error("Failed to set session before sign out", sessionError);
      }
    } catch (error) {
      console.error("Failed to sign out admin session", error);
    }
  }

  await clearAdminSessionCookies();
  redirect("/admin");
}
