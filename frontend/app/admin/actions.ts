'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import {
  ADMIN_ROLE,
  SUPERADMIN_ROLE,
  clearAdminSessionCookies,
  readAdminSessionTokens,
  storeAdminSessionCookies,
  userHasAdminAccess,
  userHasSuperAdminAccess,
} from "./authServerUtils";
import { resolveAdminContext } from "./adminContext";

type FieldErrors = {
  email?: string;
  password?: string;
};

export type AdminAuthState = {
  success: boolean;
  error?: string;
  fieldErrors?: FieldErrors;
};

type CreateAdminUserFieldErrors = {
  email?: string;
  fullName?: string;
  password?: string;
};

export type CreateAdminUserState = {
  success: boolean;
  error?: string;
  fieldErrors?: CreateAdminUserFieldErrors;
  email?: string;
  created?: boolean;
  changesApplied?: boolean;
  invited?: boolean;
  note?: string;
};

export type ManageAdminActionResult = {
  success: boolean;
  message?: string;
  error?: string;
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
  const supabase = createSupabaseServerClient();
  const attemptSignIn = () =>
    supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: password!,
    });
  const { data, error } = await attemptSignIn();

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

  if (!userHasAdminAccess(data.user)) {
    console.warn(
      "Admin login blocked for unauthorized user",
      data.user.email
    );
    try {
      await supabase.auth.signOut();
    } catch (signOutError) {
      console.error("Failed to sign out unauthorized admin user", signOutError);
    }
    return {
      success: false,
      error: "You do not have admin access.",
    };
  }

  await storeAdminSessionCookies(data.session);

  return { success: true };
}

export async function createAdminUser(
  _prevState: CreateAdminUserState,
  formData: FormData
): Promise<CreateAdminUserState> {
  const emailEntry = formData.get("email");
  const fullNameEntry = formData.get("fullName");
  const passwordEntry = formData.get("password");
  const fieldErrors: CreateAdminUserFieldErrors = {};

  const email =
    typeof emailEntry === "string" ? emailEntry.trim() : "";
  const fullName =
    typeof fullNameEntry === "string" ? fullNameEntry.trim() : "";
  const password =
    typeof passwordEntry === "string" ? passwordEntry.trim() : "";
  const hasPassword = password.length > 0;

  if (!email) {
    fieldErrors.email = "Enter an email address.";
  } else {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      fieldErrors.email = "Enter a valid email address.";
    }
  }

  if (hasPassword && password.length < 8) {
    fieldErrors.password = "Enter a password with at least 8 characters.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      fieldErrors,
    };
  }

  const normalizedEmail = email.toLowerCase();
  const adminContext = await resolveAdminContext();

  if (
    !adminContext.authorized ||
    !userHasSuperAdminAccess(adminContext.user)
  ) {
    return {
      success: false,
      error: "You do not have permission to manage admin access.",
    };
  }

  const supabase = createSupabaseServerClient();

  try {
    const existingUser = await findUserByEmail(supabase, normalizedEmail);

    if (existingUser) {
      const existingRoles = extractRoles(existingUser.app_metadata?.roles);
      const hasAdminRole = roleArrayHasAdmin(existingRoles);
      const shouldAddAdminRole = !hasAdminRole;
      const updatedRoles = shouldAddAdminRole
        ? [...existingRoles, ADMIN_ROLE]
        : existingRoles;
      const updateAttributes: Parameters<
        typeof supabase.auth.admin.updateUserById
      >[1] = {
      };

      if (shouldAddAdminRole) {
        updateAttributes.app_metadata = {
          ...existingUser.app_metadata,
          roles: updatedRoles,
        };
      }

      if (fullName) {
        updateAttributes.user_metadata = {
          ...existingUser.user_metadata,
          full_name: fullName,
        };
      }

      if (hasPassword) {
        updateAttributes.password = password;
        updateAttributes.email_confirm = true;
      }

      const shouldApplyUpdate =
        shouldAddAdminRole ||
        !!updateAttributes.user_metadata ||
        hasPassword;

      if (!shouldApplyUpdate) {
        return {
          success: true,
          email: normalizedEmail,
          created: false,
          changesApplied: false,
          invited: false,
          note: "User already has admin access.",
        };
      }

      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        updateAttributes
      );

      if (updateError) {
        console.error(
          "Failed to promote existing user to admin",
          normalizedEmail,
          updateError
        );
        return {
          success: false,
          error: "Unable to update admin access right now.",
        };
      }

      revalidatePath("/admin");

      const noteParts: string[] = [];
      if (shouldAddAdminRole) {
        noteParts.push("Admin access updated.");
      }
      if (updateAttributes.user_metadata) {
        noteParts.push("Name updated.");
      }
      if (hasPassword) {
        noteParts.push("Password set; share it securely with the user.");
      }

      return {
        success: true,
        email: normalizedEmail,
        created: false,
        changesApplied: true,
        invited: false,
        note:
          noteParts.length > 0
            ? noteParts.join(" ")
            : "Existing user promoted to admin.",
      };
    }

    if (hasPassword) {
      const { data: createData, error: createError } =
        await supabase.auth.admin.createUser({
          email: normalizedEmail,
          password,
          email_confirm: true,
          app_metadata: {
            roles: [ADMIN_ROLE],
          },
          user_metadata: fullName
            ? {
              full_name: fullName,
            }
            : undefined,
        });

      if (createError || !createData?.user) {
        console.error(
          "Failed to create admin user with password",
          normalizedEmail,
          createError ?? createData
        );
        return {
          success: false,
          error: "Unable to create admin user right now.",
        };
      }

      revalidatePath("/admin");

      return {
        success: true,
        email: normalizedEmail,
        created: true,
        invited: false,
        changesApplied: true,
        note: "Admin user created and password set. Share the credentials securely.",
      };
    }

    const inviteOptions = fullName
      ? {
        data: {
          full_name: fullName,
        },
      }
      : undefined;

    const { data: inviteData, error: inviteError } =
      await supabase.auth.admin.inviteUserByEmail(normalizedEmail, inviteOptions);

    if (inviteError) {
      console.error("Failed to invite admin user", normalizedEmail, inviteError);
      return {
        success: false,
        error:
          "Unable to send the invite email. Confirm that Supabase email settings are configured.",
      };
    }

    let invitee: User | null = null;

    if (isSupabaseUser(inviteData)) {
      invitee = inviteData;
    } else if (inviteData && typeof inviteData === "object" && "user" in inviteData) {
      const { user } = inviteData as { user?: unknown };
      if (isSupabaseUser(user)) {
        invitee = user;
      }
    }

    if (!invitee) {
      invitee = await findUserByEmail(supabase, normalizedEmail);
    }

    if (!invitee) {
      console.warn(
        "Invite succeeded but user lookup failed for",
        normalizedEmail
      );
      revalidatePath("/admin");
      return {
        success: true,
        email: normalizedEmail,
        created: true,
        invited: true,
        changesApplied: false,
        note:
          "Invitation email sent. If the user cannot access the admin area after accepting, update their roles manually in Supabase.",
      };
    }

    const existingRoles = extractRoles(invitee.app_metadata?.roles);
    const hasAdminRole = roleArrayHasAdmin(existingRoles);
    const targetRoles = hasAdminRole
      ? existingRoles
      : [...existingRoles, ADMIN_ROLE];

    const shouldUpdateRoles = !hasAdminRole;
    const existingFullName =
      typeof invitee.user_metadata?.full_name === "string"
        ? invitee.user_metadata.full_name
        : undefined;
    const shouldUpdateName = !!fullName && existingFullName !== fullName;

    let changesApplied = false;

    if (shouldUpdateRoles || shouldUpdateName) {
      const updateAttributes: Parameters<
        typeof supabase.auth.admin.updateUserById
      >[1] = {};

      if (shouldUpdateRoles) {
        updateAttributes.app_metadata = {
          ...(invitee.app_metadata ?? {}),
          roles: targetRoles,
        };
      }

      if (shouldUpdateName) {
        updateAttributes.user_metadata = {
          ...(invitee.user_metadata ?? {}),
          full_name: fullName,
        };
      }

      const { error: updateAfterInviteError } =
        await supabase.auth.admin.updateUserById(invitee.id, updateAttributes);

      if (updateAfterInviteError) {
        console.error(
          "Failed to assign admin role after invite",
          normalizedEmail,
          updateAfterInviteError
        );
        return {
          success: false,
          error:
            "Invite email sent, but updating admin access failed. Try again later or update the role in Supabase manually.",
        };
      }

      changesApplied = true;
    }

    revalidatePath("/admin");

    return {
      success: true,
      email: normalizedEmail,
      created: true,
      invited: true,
      changesApplied,
      note:
        "Invitation email sent. They can set their password from the invite and will have admin access once they accept.",
    };
  } catch (error) {
    console.error("Unexpected error creating admin user", normalizedEmail, error);
    return {
      success: false,
      error: "Unable to create admin user right now.",
    };
  }
}

export async function resendAdminInviteAction({
  email,
}: {
  email: string;
}): Promise<ManageAdminActionResult> {
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

  if (!normalizedEmail) {
    return {
      success: false,
      error: "An email address is required.",
    };
  }

  const adminContext = await resolveAdminContext();
  if (
    !adminContext.authorized ||
    !userHasSuperAdminAccess(adminContext.user)
  ) {
    return {
      success: false,
      error: "You do not have permission to manage admin access.",
    };
  }

  const supabase = createSupabaseServerClient();

  try {
    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      normalizedEmail
    );

    if (inviteError) {
      console.error(
        "Failed to resend admin invite",
        normalizedEmail,
        inviteError
      );
      return {
        success: false,
        error:
          "Unable to send the invite email. Confirm Supabase email settings and try again.",
      };
    }

    // Ensure role metadata stays in sync if the user already exists.
    try {
      const existingUser = await findUserByEmail(supabase, normalizedEmail);
      if (existingUser) {
        const existingRoles = extractRoles(existingUser.app_metadata?.roles);
        if (!roleArrayHasAdmin(existingRoles)) {
          const updatedRoles = [...existingRoles, ADMIN_ROLE];
          const { error: updateError } =
            await supabase.auth.admin.updateUserById(existingUser.id, {
              app_metadata: {
                ...existingUser.app_metadata,
                roles: updatedRoles,
              },
            });

          if (updateError) {
            console.error(
              "Failed to update roles while resending invite",
              normalizedEmail,
              updateError
            );
          }
        }
      }
    } catch (syncError) {
      console.error(
        "Unexpected error ensuring admin role during invite resend",
        normalizedEmail,
        syncError
      );
    }

    revalidatePath("/admin");
    return {
      success: true,
      message: `Invitation email sent to ${normalizedEmail}.`,
    };
  } catch (error) {
    console.error("Unexpected error resending admin invite", normalizedEmail, error);
    return {
      success: false,
      error: "Unable to send the invite right now. Try again later.",
    };
  }
}

export async function removeAdminAccessAction({
  userId,
}: {
  userId: string;
}): Promise<ManageAdminActionResult> {
  if (typeof userId !== "string" || userId.trim().length === 0) {
    return {
      success: false,
      error: "A valid user ID is required.",
    };
  }

  const adminContext = await resolveAdminContext();
  if (
    !adminContext.authorized ||
    !userHasSuperAdminAccess(adminContext.user)
  ) {
    return {
      success: false,
      error: "You do not have permission to manage admin access.",
    };
  }

  const supabase = createSupabaseServerClient();

  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId);

    if (error || !data.user) {
      console.error("Failed to load target admin user", userId, error);
      return {
        success: false,
        error: "Unable to find that admin user.",
      };
    }

    const targetUser = data.user;
    const existingRoles = extractRoles(targetUser.app_metadata?.roles);

    const hasSuperAdmin = roleArrayHasSuperAdmin(existingRoles);
    if (hasSuperAdmin) {
      return {
        success: false,
        error: "You cannot remove superadmin access using this tool.",
      };
    }

    if (!roleArrayHasAdmin(existingRoles)) {
      return {
        success: true,
        message: "Admin access was already removed.",
      };
    }

    const updatedRoles = existingRoles.filter(
      (role) => role.toLowerCase() !== ADMIN_ROLE
    );

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      targetUser.id,
      {
        app_metadata: {
          ...targetUser.app_metadata,
          roles: updatedRoles,
        },
      }
    );

    if (updateError) {
      console.error(
        "Failed to remove admin access",
        targetUser.email,
        updateError
      );
      return {
        success: false,
        error: "Unable to remove admin access right now.",
      };
    }

    revalidatePath("/admin");

    return {
      success: true,
      message: "Admin access removed.",
    };
  } catch (error) {
    console.error("Unexpected error removing admin access", userId, error);
    return {
      success: false,
      error: "Unable to remove admin access right now.",
    };
  }
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

type SupabaseServerClient = ReturnType<typeof createSupabaseServerClient>;

async function findUserByEmail(
  supabase: SupabaseServerClient,
  email: string
): Promise<User | null> {
  const perPage = 200;
  let page = 1;

  // Supabase currently lacks a direct lookup by email, so we page through until found or exhausted.
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const users = data?.users ?? [];
    const match = users.find(
      (candidate) =>
        typeof candidate.email === "string" &&
        candidate.email.toLowerCase() === email
    );

    if (match) {
      return match;
    }

    if (!data || users.length < perPage) {
      return null;
    }

    page += 1;
  }
}

function isSupabaseUser(value: unknown): value is User {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as { id?: unknown; app_metadata?: unknown };
  return (
    typeof candidate.id === "string" &&
    typeof candidate.app_metadata === "object"
  );
}

function extractRoles(roles: unknown): string[] {
  if (Array.isArray(roles)) {
    return roles
      .filter((role): role is string => typeof role === "string")
      .map((role) => role.trim())
      .filter(Boolean);
  }

  if (typeof roles === "string" && roles.trim().length > 0) {
    return [roles.trim()];
  }

  return [];
}

function roleArrayHasAdmin(roles: string[]): boolean {
  return roles.some((role) => {
    const normalized = role.toLowerCase();
    return normalized === ADMIN_ROLE || normalized === SUPERADMIN_ROLE;
  });
}

function roleArrayHasSuperAdmin(roles: string[]): boolean {
  return roles.some((role) => role.toLowerCase() === SUPERADMIN_ROLE);
}
