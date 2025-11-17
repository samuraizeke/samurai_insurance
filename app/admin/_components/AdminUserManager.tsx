'use client';

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  createAdminUser,
  type CreateAdminUserState,
  removeAdminAccessAction,
  resendAdminInviteAction,
} from "../actions";
import { alteHaasGrotesk, workSans } from "@/lib/fonts";

export type AdminUserSummary = {
  id: string;
  email: string;
  fullName?: string | null;
  createdAt?: string | null;
  lastSignInAt?: string | null;
  isSuperAdmin: boolean;
};

type AdminUserManagerProps = {
  admins: AdminUserSummary[];
  loadError?: string;
  currentUserId: string;
};

const initialState: CreateAdminUserState = {
  success: false,
};

export function AdminUserManager({
  admins,
  loadError,
  currentUserId,
}: AdminUserManagerProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    createAdminUser,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    userId: string;
    type: "resend" | "remove";
  } | null>(null);
  const [showCreateAdminSuccess, setShowCreateAdminSuccess] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmedEmailInput = emailInput.trim();
  const isEmailValid = emailPattern.test(trimmedEmailInput);

  useEffect(() => {
    let timeoutId: number | undefined;

    if (state.success) {
      router.refresh();
      formRef.current?.reset();

      setShowCreateAdminSuccess(true);
      setEmailInput("");
      setEmailTouched(false);
      timeoutId = window.setTimeout(() => {
        setShowCreateAdminSuccess(false);
      }, 5000);
    } else {
      setShowCreateAdminSuccess(false);
    }

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [state, router]);

  useEffect(() => {
    if (isPending) {
      setShowCreateAdminSuccess(false);
    }
  }, [isPending]);

  const sortedAdmins = useMemo(
    () =>
      [...admins].sort((a, b) => a.email.localeCompare(b.email, "en", { sensitivity: "base" })),
    [admins]
  );

  const handleResendInvite = async (admin: AdminUserSummary) => {
    setFeedback(null);
    setPendingAction({ userId: admin.id, type: "resend" });

    try {
      const result = await resendAdminInviteAction({ email: admin.email });
      if (result.success) {
        setFeedback({
          tone: "success",
          message: result.message ?? `Invitation email sent to ${admin.email}.`,
        });
        router.refresh();
      } else {
        setFeedback({
          tone: "error",
          message: result.error ?? "Unable to send invite.",
        });
      }
    } catch (error) {
      console.error("Unexpected error resending invite", admin.email, error);
      setFeedback({
        tone: "error",
        message: "Unexpected error sending the invite.",
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleRemoveAdmin = async (admin: AdminUserSummary) => {
    if (!window.confirm(`Remove admin access for ${admin.email}?`)) {
      return;
    }

    setFeedback(null);
    setPendingAction({ userId: admin.id, type: "remove" });

    try {
      const result = await removeAdminAccessAction({ userId: admin.id });
      if (result.success) {
        setFeedback({
          tone: "success",
          message: result.message ?? "Admin access removed.",
        });
        router.refresh();
      } else {
        setFeedback({
          tone: "error",
          message: result.error ?? "Unable to remove admin access.",
        });
      }
    } catch (error) {
      console.error("Unexpected error removing admin access", admin.email, error);
      setFeedback({
        tone: "error",
        message: "Unexpected error removing admin access.",
      });
    } finally {
      setPendingAction(null);
    }
  };

  useEffect(() => {
    if (feedback?.tone !== "success") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFeedback(null);
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [feedback]);

  return (
    <section className="rounded-2xl border border-[#f7f6f3]/10 bg-[#2a2a2a]/80 p-6 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            className={`${alteHaasGrotesk.className} text-lg font-semibold text-[#333333]`}
          >
            Admin access
          </h2>
          <p className="mt-1 text-sm text-[#333333]/65">
            Invite new admins or promote existing Supabase accounts.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {feedback ? (
          <p
            className={`rounded-xl border px-4 py-3 text-sm ${
              feedback.tone === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                : "border-rose-500/30 bg-rose-500/10 text-rose-100"
            }`}
          >
            {feedback.message}
          </p>
        ) : null}

        {loadError ? (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {loadError}
          </p>
        ) : sortedAdmins.length === 0 ? (
          <p className="text-sm text-[#333333]/60">
            No admin users found yet.
          </p>
        ) : (
          <ul className={`space-y-3 ${workSans.className}`}>
            {sortedAdmins.map((admin) => {
              const isCurrentUser = admin.id === currentUserId;
              return (
                <li
                  key={admin.id}
                  className="rounded-xl border border-[#f7f6f3]/10 bg-[#1f1f1f]/70 px-4 py-4 transition hover:border-[#f7f6f3]/25"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#333333]">
                      {admin.email}
                    </p>
                    {admin.fullName ? (
                      <p className="text-xs text-[#333333]/55">
                        {admin.fullName}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                      admin.isSuperAdmin
                        ? "border border-indigo-400/40 bg-indigo-500/10 text-indigo-200"
                        : "border border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                    }`}
                  >
                    Roles: {admin.isSuperAdmin ? "superadmin" : "admin"}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-1 gap-3 text-xs text-[#333333]/55 sm:grid-cols-3">
                  <div>
                    <dt className="uppercase tracking-wide text-[#333333]/40">
                      Created
                    </dt>
                    <dd className="mt-1 text-[#333333]/70">
                      {formatTimestamp(admin.createdAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-[#333333]/40">
                      Last signin
                    </dt>
                    <dd className="mt-1 text-[#333333]/70">
                      {formatTimestamp(admin.lastSignInAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-[#333333]/40">
                      Status
                    </dt>
                    <dd className="mt-1 text-[#333333]/70">Ready</dd>
                  </div>
                </dl>
                  <div className="mt-4 flex flex-wrap gap-2">
                  {!isCurrentUser ? (
                    <button
                      type="button"
                      onClick={() => handleResendInvite(admin)}
                      className="inline-flex items-center rounded-full border border-[#f7f6f3]/20 px-3 py-1.5 text-xs font-semibold text-[#333333] transition hover:border-[#f7f6f3]/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={pendingAction?.userId === admin.id}
                    >
                      {pendingAction?.userId === admin.id &&
                      pendingAction.type === "resend"
                        ? "Sending…"
                        : "Resend invite"}
                    </button>
                  ) : null}
                  {admin.isSuperAdmin ? (
                    <span className="inline-flex items-center rounded-full border border-indigo-400/40 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-200">
                      Superadmin
                    </span>
                  ) : !isCurrentUser ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveAdmin(admin)}
                      className="inline-flex items-center rounded-full border border-rose-500/40 px-3 py-1.5 text-xs font-semibold text-rose-200 transition hover:border-rose-400/60 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={pendingAction?.userId === admin.id}
                    >
                      {pendingAction?.userId === admin.id &&
                      pendingAction.type === "remove"
                        ? "Removing…"
                        : "Remove access"}
                    </button>
                  ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="h-px w-full bg-[#f7f6f3]/10" />

        <form
          ref={formRef}
          action={formAction}
          className={`${workSans.className} space-y-4`}
        >
          <div>
            <label
              htmlFor="admin-email"
              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#333333]/55"
            >
              Email
            </label>
            <input
              id="admin-email"
              name="email"
              type="email"
              required
              placeholder="admin@example.com"
              className="w-full rounded-md border border-[#f7f6f3]/15 bg-[#f7f6f3] px-3 py-2 text-sm text-black focus:border-[#de5e48] focus:outline-none focus:ring-2 focus:ring-[#de5e48]/40"
              disabled={isPending}
              autoComplete="off"
              value={emailInput}
              onChange={(event) => {
                setEmailInput(event.target.value);
              }}
              onBlur={() => setEmailTouched(true)}
            />
            {state.fieldErrors?.email ? (
              <p className="mt-2 text-xs font-medium text-rose-300">
                {state.fieldErrors.email}
              </p>
            ) : null}
            {!state.fieldErrors?.email && emailTouched && !isEmailValid ? (
              <p className="mt-2 text-xs font-medium text-rose-300">
                Enter a valid email address.
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#333333]/55"
            >
              Password (optional)
            </label>
            <input
              id="admin-password"
              name="password"
              type="password"
              placeholder="Set a password or leave blank to email invite"
              className="w-full rounded-md border border-[#f7f6f3]/15 bg-[#f7f6f3] px-3 py-2 text-sm text-black focus:border-[#de5e48] focus:outline-none focus:ring-2 focus:ring-[#de5e48]/40"
              disabled={isPending}
              autoComplete="new-password"
              minLength={8}
            />
            {state.fieldErrors?.password ? (
              <p className="mt-2 text-xs font-medium text-rose-300">
                {state.fieldErrors.password}
              </p>
            ) : null}
          </div>

          {state.error ? (
            <p className="text-sm font-medium text-rose-300">
              {state.error}
            </p>
          ) : null}

          {showCreateAdminSuccess && state.success ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              <p className="font-semibold">
                {state.created
                  ? state.invited
                    ? `Invitation email sent to ${state.email}.`
                    : `Admin account created for ${state.email}.`
                  : state.changesApplied
                      ? `Admin access updated for ${state.email}.`
                      : `No changes were needed for ${state.email}.`}
              </p>
              {state.note ? (
                <p className="mt-2 text-xs text-emerald-200/80">
                  {state.note}
                </p>
              ) : null}
            </div>
          ) : null}

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-[#de5e48] px-5 py-2 text-sm font-semibold text-[#f7f6f3] transition hover:bg-[#de5e48]/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending || !isEmailValid}
          >
            {isPending ? "Saving…" : "Add admin"}
          </button>
        </form>
      </div>
    </section>
  );
}

function formatTimestamp(value?: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString();
}
