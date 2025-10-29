import Image from "next/image";
import { AnalyticsRange, getAnalyticsDashboard } from "@/lib/analytics";
import { alteHaasGrotesk } from "@/lib/fonts";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { AdminLoginForm } from "./_components/AdminLoginForm";
import {
  type AdminUserSummary,
} from "./_components/AdminUserManager";
import { AdminDashboardTabs } from "./_components/AdminDashboardTabs";
import { signOutAdmin } from "./actions";
import { resolveAdminContext } from "./adminContext";
import {
  ADMIN_ROLE,
  SUPERADMIN_ROLE,
  userHasSuperAdminAccess,
} from "./authServerUtils";

export const dynamic = "force-dynamic";

type WaitlistSummary = {
  count: number | null;
  error?: string;
};

type WaitlistEntry = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  source: string | null;
  createdAt: string | null;
};

type WaitlistEntriesResult = {
  entries: WaitlistEntry[];
  error?: string;
};

type AdminUsersResult = {
  admins: AdminUserSummary[];
  error?: string;
};

async function getAdminUsers(): Promise<AdminUsersResult> {
  try {
    const supabase = createSupabaseServerClient();
    const admins: AdminUserSummary[] = [];
    const perPage = 200;
    let page = 1;

    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage,
      });

      if (error) {
        console.error("Failed to list Supabase users", error);
        return {
          admins: [],
          error: "Unable to load admin users right now.",
        };
      }

      const users = data?.users ?? [];

      for (const user of users) {
        const email = typeof user.email === "string" ? user.email : null;
        const roles = parseRoles(user.app_metadata?.roles);
        const normalizedRoles = roles.map((role) => role.toLowerCase());
        const hasAdminAccess = normalizedRoles.some(
          (role) => role === ADMIN_ROLE || role === SUPERADMIN_ROLE
        );
        const isSuperAdmin = normalizedRoles.includes(SUPERADMIN_ROLE);
        if (!hasAdminAccess) {
          continue;
        }

        admins.push({
          id: user.id,
          email: email ?? "Unknown user",
          fullName:
            typeof user.user_metadata?.full_name === "string"
              ? user.user_metadata.full_name
              : null,
          createdAt: user.created_at ?? null,
          lastSignInAt: user.last_sign_in_at ?? null,
          isSuperAdmin,
        });
      }

      if (!data || users.length < perPage) {
        break;
      }

      page += 1;
    }

    admins.sort((a, b) =>
      a.email.localeCompare(b.email, "en", { sensitivity: "base" })
    );

    return { admins };
  } catch (error) {
    console.error("Unexpected error loading admin users", error);
    return {
      admins: [],
      error: "Unable to load admin users right now.",
    };
  }
}

async function getWaitlistSummary(): Promise<WaitlistSummary> {
  try {
    const supabase = createSupabaseServerClient();
    const { count, error } = await supabase
      .from("waitlist")
      .select("id", { head: true, count: "exact" });

    if (error) {
      console.error("Failed to fetch waitlist count", error);
      return {
        count: null,
        error: "Unable to load waitlist count right now.",
      };
    }

    return {
      count: typeof count === "number" ? count : 0,
    };
  } catch (error) {
    console.error("Unexpected error fetching waitlist count", error);
    return {
      count: null,
      error: "Unable to load waitlist count right now.",
    };
  }
}

async function getWaitlistEntries(): Promise<WaitlistEntriesResult> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("waitlist")
      .select("id, first_name, last_name, email, source, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch waitlist entries", error);
      return {
        entries: [],
        error: "Unable to load waitlist entries right now.",
      };
    }

    const entries: WaitlistEntry[] = (data ?? []).map((entry) => ({
      id: typeof entry.id === "string" ? entry.id : String(entry.id ?? ""),
      firstName:
        typeof entry.first_name === "string" ? entry.first_name : null,
      lastName: typeof entry.last_name === "string" ? entry.last_name : null,
      email: typeof entry.email === "string" ? entry.email : null,
      source: typeof entry.source === "string" ? entry.source : null,
      createdAt:
        typeof entry.created_at === "string" ? entry.created_at : null,
    }));

    return { entries };
  } catch (error) {
    console.error("Unexpected error fetching waitlist entries", error);
    return {
      entries: [],
      error: "Unable to load waitlist entries right now.",
    };
  }
}

function parseRoles(roles: unknown): string[] {
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

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string; tab?: string }>;
}) {
  const adminContext = await resolveAdminContext();

  if (!adminContext.authorized) {
    return (
      <div
        className={`${alteHaasGrotesk.className} flex min-h-screen flex-col bg-[#333333] text-[#f7f6f3]`}
      >
        <header className="sticky top-0 z-40 w-full bg-[#333333]">
          <div className="flex w-full flex-col items-center gap-4 px-6 py-8 text-center sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:px-16 sm:py-10 sm:text-left">
            <div className="flex items-center justify-center gap-4 sm:justify-start">
              <Image
                src="/SamuraiLogoOrange.png"
                alt="Samurai Insurance logo"
                width={64}
                height={32}
                priority
              />
              <span className="whitespace-nowrap text-lg font-bold uppercase text-[#f7f6f3] sm:text-2xl">
                Samurai Insurance
              </span>
            </div>
          </div>
        </header>

        <main className="flex flex-1 items-start justify-center px-4 pb-12 pt-20">
          <AdminLoginForm initialMessage={adminContext.message} />
        </main>
      </div>
    );
  }

  const resolvedSearchParams = await searchParams;
  const requestedRange =
    typeof resolvedSearchParams?.range === "string"
      ? resolvedSearchParams.range
      : undefined;
  const requestedTab =
    typeof resolvedSearchParams?.tab === "string"
      ? resolvedSearchParams.tab
      : undefined;
  const analyticsRange: AnalyticsRange =
    requestedRange === "7d" || requestedRange === "30d" ? requestedRange : "24h";

  const canManageAdmins = userHasSuperAdminAccess(adminContext.user);

  const [
    waitlistSummary,
    analyticsDashboard,
    adminUsersResult,
    waitlistEntriesResult,
  ] =
    await Promise.all([
      getWaitlistSummary(),
      getAnalyticsDashboard(analyticsRange),
      canManageAdmins
        ? getAdminUsers()
        : Promise.resolve<AdminUsersResult>({ admins: [] }),
      getWaitlistEntries(),
    ]);
  const adminUsers = adminUsersResult.admins;
  const adminUsersError = canManageAdmins ? adminUsersResult.error : undefined;
  const waitlistEntries = waitlistEntriesResult.entries;
  const waitlistEntriesError = waitlistEntriesResult.error;
  const initialTab =
    requestedTab === "waitlist"
      ? "waitlist"
      : requestedTab === "admins" && canManageAdmins
      ? "admins"
      : undefined;

  return (
    <div
      className={`${alteHaasGrotesk.className} flex min-h-screen flex-col bg-[#333333] text-[#f7f6f3]`}
    >
      <header className="sticky top-0 z-40 w-full bg-[#333333]">
        <div className="flex w-full flex-col items-center gap-4 px-6 py-8 text-center sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:px-16 sm:py-10 sm:text-left">
          <div className="flex items-center justify-center gap-4 sm:justify-start">
            <Image
              src="/SamuraiLogoOrange.png"
              alt="Samurai Insurance logo"
              width={64}
              height={32}
              priority
            />
            <span className="whitespace-nowrap text-lg font-bold uppercase text-[#f7f6f3] sm:text-2xl">
              Samurai Insurance
            </span>
          </div>
          <div className="flex flex-col items-center gap-3 sm:items-end">
            <p className="text-sm text-[#f7f6f3]/70">
              Signed in as{" "}
              <span className="font-medium text-[#f7f6f3]">
                {adminContext.user.email ?? "Unknown user"}
              </span>
            </p>
            <form action={signOutAdmin}>
              <button
                type="submit"
                className="hidden sm:inline-flex focus-outline-brand-sm rounded-full bg-[#de5e48] px-6 py-2 text-med font-bold text-[#f7f6f3] shadow-[0_3px_8px_rgba(222,94,72,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(222,94,72,0.24)]"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-6 py-12">
        <AdminDashboardTabs
          analyticsRange={analyticsRange}
          analyticsDashboard={analyticsDashboard}
          waitlistSummary={waitlistSummary}
          waitlistEntries={waitlistEntries}
          waitlistEntriesError={waitlistEntriesError}
          adminUsers={adminUsers}
          adminUsersError={adminUsersError}
          canManageAdmins={canManageAdmins}
          currentUserId={adminContext.user.id}
          initialTab={initialTab}
        />
      </main>
    </div>
  );
}
