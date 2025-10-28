'use client';

import { useEffect, useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  authenticateAdmin,
  type AdminAuthState,
} from "../actions";
import { alteHaasGrotesk, workSans } from "@/lib/fonts";

const EyeIcon = ({ open }: { open: boolean }) => (
  <svg
    aria-hidden="true"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.75}
    stroke="currentColor"
  >
    <path
      d="M2.25 12s3.75-6 9.75-6 9.75 6 9.75 6-3.75 6-9.75 6-9.75-6-9.75-6z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 15a3 3 0 100-6 3 3 0 000 6z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {open ? null : (
      <path d="M4 4l16 16" strokeLinecap="round" strokeLinejoin="round" />
    )}
  </svg>
);

type AdminLoginFormProps = {
  initialMessage?: string;
};

export function AdminLoginForm({ initialMessage }: AdminLoginFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    authenticateAdmin,
    {
      success: false,
      error: initialMessage,
      fieldErrors: undefined,
    } satisfies AdminAuthState
  );
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <div
      className={`${workSans.className} admin-login-card w-full max-w-sm rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur`}
    >
      <h1
        className={`${alteHaasGrotesk.className} mb-4 text-2xl font-semibold text-[#f7f6f3] text-center`}
      >
        Admin Access
      </h1>
      <p className="mb-6 text-sm text-[#f7f6f3]">
        Sign in with your Supabase admin credentials to view the dashboard.
      </p>

      <form action={formAction} className="space-y-4">
        <div>
          <label
            className="mb-2 block text-sm font-medium text-white/80"
            htmlFor="email"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="w-full rounded-md border border-white/20 bg-[#f7f6f3] px-3 py-2 text-black focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
            placeholder="your@email.com"
            required
            disabled={isPending}
            autoComplete="username"
          />
          {state.fieldErrors?.email && (
            <p className="mt-2 text-sm font-medium text-rose-300">
              {state.fieldErrors.email}
            </p>
          )}
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-medium text-white/80"
            htmlFor="password"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              className="w-full rounded-md border border-white/20 bg-[#f7f6f3] px-3 py-2 pr-11 text-black focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
              placeholder="Enter password"
              required
              disabled={isPending}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#de5e48] transition hover:text-[#de5e48]/80 focus:outline-none focus:ring-2 focus:ring-[#de5e48]/40"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
          {state.fieldErrors?.password && (
            <p className="mt-2 text-sm font-medium text-rose-300">
              {state.fieldErrors.password}
            </p>
          )}
        </div>

        {state.error && (
          <p className="text-sm font-medium text-rose-300">{state.error}</p>
        )}

        <button
          type="submit"
          className="flex w-full items-center justify-center rounded-md bg-[#de5e48] px-4 py-2 text-sm font-semibold text-[#f7f6f3] transition hover:bg-[#de5e48]/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
        >
          {isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <style jsx>{`
        .admin-login-card input:-webkit-autofill,
        .admin-login-card input:-webkit-autofill:hover,
        .admin-login-card input:-webkit-autofill:focus {
          box-shadow: 0 0 0px 1000px #f7f6f3 inset;
          -webkit-text-fill-color: #111111;
          caret-color: #111111;
        }
      `}</style>
    </div>
  );
}
