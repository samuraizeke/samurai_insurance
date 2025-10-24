import type { User } from "@supabase/supabase-js";
import { alteHaasGrotesk } from "@/lib/fonts";
import { getAnalyticsSummaryFromDrain } from "@/lib/analytics";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { AdminLoginForm } from "./_components/AdminLoginForm";
import { signOutAdmin } from "./actions";
import {
  clearAdminSessionCookies,
  getAllowedAdminEmails,
  readAdminSessionTokens,
  storeAdminSessionCookies,
} from "./authServerUtils";

export const dynamic = "force-dynamic";

type WaitlistSummary = {
  count: number | null;
  error?: string;
};

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

function formatNumber(value: number | null) {
  if (typeof value !== "number") {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

type AdminContext =
  | { authorized: false; message?: string }
  | { authorized: true; user: User };

async function resolveAdminContext(): Promise<AdminContext> {
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

export default async function AdminPage() {
  const adminContext = await resolveAdminContext();

  if (!adminContext.authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-zinc-900 to-black px-4">
        <AdminLoginForm initialMessage={adminContext.message} />
      </div>
    );
  }

  const [waitlistSummary, analyticsSummary] = await Promise.all([
    getWaitlistSummary(),
    getAnalyticsSummaryFromDrain(),
  ]);

  return (
    <div
      className={`${alteHaasGrotesk.className} flex min-h-screen flex-col bg-black text-white`}
    >
      <header className="border-b border-white/10 bg-black/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">
              Samurai Insurance
            </p>
            <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-white/60">
              Signed in as{" "}
              <span className="font-medium text-white">
                {adminContext.user.email ?? "Unknown user"}
              </span>
            </p>
          </div>

          <form action={signOutAdmin}>
            <button
              type="submit"
              className="rounded-md border border-white/20 px-3 py-1.5 text-sm font-medium text-white transition hover:border-white/40 hover:bg-white/10"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-6 py-12">
        <section>
          <h2 className="text-lg font-semibold text-white/80">
            Key metrics (last 24h)
          </h2>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6 shadow-lg shadow-black/40">
              <p className="text-sm uppercase tracking-widest text-white/50">
                Waitlist size
              </p>
              <p className="mt-4 text-4xl font-semibold">
                {formatNumber(waitlistSummary.count)}
              </p>
              {waitlistSummary.error && (
                <p className="mt-2 text-sm text-rose-300/80">
                  {waitlistSummary.error}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6 shadow-lg shadow-black/40">
              <p className="text-sm uppercase tracking-widest text-white/50">
                Active visitors
              </p>
              <p className="mt-4 text-4xl font-semibold">
                {formatNumber(analyticsSummary.visitors)}
              </p>
              {analyticsSummary.error && (
                <p className="mt-2 text-sm text-rose-300/80">
                  {analyticsSummary.error}
                </p>
              )}
              {!analyticsSummary.error && analyticsSummary.lastEventAt && (
                <p className="mt-2 text-xs text-white/50">
                  Last event {new Date(analyticsSummary.lastEventAt).toLocaleString()}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6 shadow-lg shadow-black/40">
              <p className="text-sm uppercase tracking-widest text-white/50">
                Page views
              </p>
              <p className="mt-4 text-4xl font-semibold">
                {formatNumber(analyticsSummary.pageViews)}
              </p>
              {analyticsSummary.error && (
                <p className="mt-2 text-sm text-rose-300/80">
                  {analyticsSummary.error}
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
