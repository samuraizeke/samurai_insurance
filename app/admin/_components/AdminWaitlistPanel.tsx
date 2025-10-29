"use client";

import { useMemo, useState } from "react";
import { alteHaasGrotesk, workSans } from "@/lib/fonts";

export type WaitlistEntrySummary = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  source: string | null;
  createdAt: string | null;
};

type AdminWaitlistPanelProps = {
  entries: WaitlistEntrySummary[];
  loadError?: string;
};

const joinedFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function AdminWaitlistPanel({
  entries,
  loadError,
}: AdminWaitlistPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const normalizedQuery = searchTerm.trim().toLowerCase();

  const filteredEntries = useMemo(() => {
    if (!normalizedQuery) {
      return entries;
    }

    return entries.filter((entry) => {
      const fullName = [entry.firstName, entry.lastName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const email = entry.email?.toLowerCase() ?? "";
      const source = entry.source?.toLowerCase() ?? "";

      if (fullName.includes(normalizedQuery)) {
        return true;
      }

      if (email.includes(normalizedQuery)) {
        return true;
      }

      if (source.includes(normalizedQuery)) {
        return true;
      }

      return false;
    });
  }, [entries, normalizedQuery]);

  const displayEntries = useMemo(
    () =>
      filteredEntries.map((entry, index) => {
        const joined =
          entry.createdAt && !Number.isNaN(Date.parse(entry.createdAt))
            ? joinedFormatter.format(new Date(entry.createdAt))
            : "—";
        const fullName =
          [entry.firstName, entry.lastName].filter(Boolean).join(" ") ||
          entry.email ||
          "—";
        const source = entry.source || "—";
        const key = entry.id || entry.email || `waitlist-${index}`;

        return {
          key,
          fullName,
          email: entry.email,
          source,
          joined,
        };
      }),
    [filteredEntries]
  );

  const visibleCount = displayEntries.length;
  const totalCount = entries.length;

  return (
    <section className="rounded-2xl border border-[#f7f6f3]/10 bg-[#2a2a2a]/80 p-6 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            className={`${alteHaasGrotesk.className} text-lg font-semibold text-[#f7f6f3]`}
          >
            Waitlist
          </h2>
          <p className="mt-1 text-sm text-[#f7f6f3]/65">
            Review everyone who has signed up and where they came from.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end sm:text-right">
          <label htmlFor="waitlist-search" className="sr-only">
            Search waitlist
          </label>
          <input
            id="waitlist-search"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search waitlist..."
            className="waitlist-search-input min-w-[220px] rounded-full border border-[#f7f6f3]/15 bg-[#1f1f1f] px-4 py-2 text-sm text-[#f7f6f3] placeholder:text-[#f7f6f3]/35 focus:border-[#de5e48]/60 focus:outline-none focus:ring-2 focus:ring-[#de5e48]/40"
          />
          <span className="text-xs font-medium uppercase tracking-wide text-[#f7f6f3]/55">
            {visibleCount} of {totalCount}{" "}
            {totalCount === 1 ? "person" : "people"}
          </span>
        </div>
      </div>

      {loadError ? (
        <p className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {loadError}
        </p>
      ) : displayEntries.length > 0 ? (
        <div className="mt-6 overflow-x-auto">
          <table
            className={`${workSans.className} w-full table-auto text-left text-sm text-[#f7f6f3]/85`}
          >
            <thead className="text-xs uppercase tracking-wide text-[#f7f6f3]/55">
              <tr>
                <th className="px-3 py-2 font-semibold">Name</th>
                <th className="px-3 py-2 font-semibold">Email</th>
                <th className="px-3 py-2 font-semibold">Source</th>
                <th className="px-3 py-2 font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody>
              {displayEntries.map((entry) => (
                <tr
                  key={entry.key}
                  className="border-t border-[#f7f6f3]/10 last:border-b last:border-[#f7f6f3]/10"
                >
                  <td className="px-3 py-3 text-[#f7f6f3]">{entry.fullName}</td>
                  <td className="px-3 py-3">
                    {entry.email ? (
                      <a
                        href={`mailto:${entry.email}`}
                        className="text-[#de5e48] underline-offset-2 hover:underline"
                      >
                        {entry.email}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-3 text-[#f7f6f3]/75">
                    {entry.source}
                  </td>
                  <td className="px-3 py-3 text-[#f7f6f3]/75">
                    {entry.joined}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-6 text-sm text-[#f7f6f3]/65">
          No one has joined the waitlist yet.
        </p>
      )}
    </section>
  );
}
