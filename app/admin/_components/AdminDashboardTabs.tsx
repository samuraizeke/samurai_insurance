"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AnalyticsDashboard, AnalyticsRange } from "@/lib/analytics";
import { AdminAnalyticsPanel } from "./AdminAnalyticsPanel";
import {
  AdminUserManager,
  type AdminUserSummary,
} from "./AdminUserManager";
import { AdminWaitlistPanel, type WaitlistEntrySummary } from "./AdminWaitlistPanel";

type WaitlistSummary = {
  count: number | null;
  error?: string;
};

type AdminDashboardTabsProps = {
  analyticsRange: AnalyticsRange;
  analyticsDashboard: AnalyticsDashboard;
  waitlistSummary: WaitlistSummary;
  waitlistEntries: WaitlistEntrySummary[];
  waitlistEntriesError?: string;
  adminUsers: AdminUserSummary[];
  adminUsersError?: string;
  canManageAdmins: boolean;
  currentUserId: string;
  initialTab?: "analytics" | "waitlist" | "admins";
};

type TabId = "analytics" | "waitlist" | "admins";
type TabDefinition = { id: TabId; label: string };

const BASE_TABS: TabDefinition[] = [
  { id: "analytics", label: "Web analytics" },
  { id: "waitlist", label: "Waitlist" },
];
const ADMIN_TAB: TabDefinition = { id: "admins", label: "Admin access" };

export function AdminDashboardTabs({
  analyticsRange,
  analyticsDashboard,
  waitlistSummary,
  waitlistEntries,
  waitlistEntriesError,
  adminUsers,
  adminUsersError,
  canManageAdmins,
  currentUserId,
  initialTab,
}: AdminDashboardTabsProps) {
  const tabs = useMemo<TabDefinition[]>(() => {
    return canManageAdmins ? [...BASE_TABS, ADMIN_TAB] : [...BASE_TABS];
  }, [canManageAdmins]);
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const fallback: TabId = "analytics";
    if (!initialTab) {
      return fallback;
    }

    return tabs.some((tab) => tab.id === initialTab) ? initialTab : fallback;
  });

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

  useEffect(() => {
    if (!initialTab) {
      return;
    }

    if (tabs.some((tab) => tab.id === initialTab) && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, tabs, activeTab]);

  const handleShowWaitlist = useCallback(() => {
    setActiveTab("waitlist");
  }, []);

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
            onShowWaitlist={handleShowWaitlist}
          />
        ) : activeTab === "waitlist" ? (
          <AdminWaitlistPanel
            entries={waitlistEntries}
            loadError={waitlistEntriesError}
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
