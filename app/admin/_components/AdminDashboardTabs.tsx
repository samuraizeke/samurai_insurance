'use client';

import { useEffect, useMemo, useState } from "react";
import type { AnalyticsDashboard, AnalyticsRange } from "@/lib/analytics";
import { AdminAnalyticsPanel } from "./AdminAnalyticsPanel";
import {
  AdminUserManager,
  type AdminUserSummary,
} from "./AdminUserManager";

type WaitlistSummary = {
  count: number | null;
  error?: string;
};

type AdminDashboardTabsProps = {
  analyticsRange: AnalyticsRange;
  analyticsDashboard: AnalyticsDashboard;
  waitlistSummary: WaitlistSummary;
  adminUsers: AdminUserSummary[];
  adminUsersError?: string;
  canManageAdmins: boolean;
  currentUserId: string;
};

const ALL_TABS: Array<{ id: "analytics" | "admins"; label: string }> = [
  { id: "analytics", label: "Web analytics" },
  { id: "admins", label: "Admin access" },
];

export function AdminDashboardTabs({
  analyticsRange,
  analyticsDashboard,
  waitlistSummary,
  adminUsers,
  adminUsersError,
  canManageAdmins,
  currentUserId,
}: AdminDashboardTabsProps) {
  const tabs = useMemo(
    () => (canManageAdmins ? ALL_TABS : [ALL_TABS[0]]),
    [canManageAdmins]
  );
  const [activeTab, setActiveTab] = useState<"analytics" | "admins">(
    "analytics"
  );

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

  return (
    <div className="space-y-8">
      {tabs.length > 1 ? (
        <nav className="flex flex-wrap gap-3">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#2a2a2a] ${
                  isActive
                    ? "border-[#de5e48] bg-[#de5e48] text-[#f7f6f3] shadow-[0_10px_22px_rgba(222,94,72,0.35)]"
                    : "border-[#f7f6f3]/15 bg-[#2a2a2a] text-[#f7f6f3]/70 hover:border-[#f7f6f3]/35 hover:text-[#f7f6f3]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      ) : null}

      <div>
        {activeTab === "analytics" ? (
          <AdminAnalyticsPanel
            analyticsRange={analyticsRange}
            analyticsDashboard={analyticsDashboard}
            waitlistSummary={waitlistSummary}
          />
        ) : canManageAdmins ? (
          <AdminUserManager
            admins={adminUsers}
            loadError={adminUsersError}
            currentUserId={currentUserId}
          />
        ) : null}
      </div>
    </div>
  );
}
