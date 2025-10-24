'use client';

import { useEffect, useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  authenticateAdmin,
  type AdminAuthState,
} from "../actions";

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

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <div className="w-full max-w-sm rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur">
      <h1 className="mb-4 text-2xl font-semibold text-white">Admin Access</h1>
      <p className="mb-6 text-sm text-white/70">
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
            className="w-full rounded-md border border-white/20 bg-black/60 px-3 py-2 text-white focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
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
          <input
            id="password"
            name="password"
            type="password"
            className="w-full rounded-md border border-white/20 bg-black/60 px-3 py-2 text-white focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
            placeholder="Enter password"
            required
            disabled={isPending}
            autoComplete="current-password"
          />
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
          className="flex w-full items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
        >
          {isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
