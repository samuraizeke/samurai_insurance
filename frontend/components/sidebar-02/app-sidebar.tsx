"use client";

import { useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faHistory } from "@fortawesome/free-solid-svg-icons";
import { Logo } from "@/components/sidebar-02/logo";
import { UserMenu } from "@/components/sidebar-02/user-menu";
import { useChatContext } from "@/app/context/ChatContext";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

// Helper to get session preview text
function getSessionPreview(session: { summary?: string; conversation_context?: string; first_message?: string; started_at: string }): string {
  // Use AI-generated summary if available
  if (session.summary) {
    return session.summary;
  }
  // Fall back to conversation_context if available
  if (session.conversation_context) {
    return session.conversation_context.length > 30
      ? session.conversation_context.substring(0, 30) + "..."
      : session.conversation_context;
  }
  // Fallback to first message truncated
  if (session.first_message) {
    return session.first_message.length > 30
      ? session.first_message.substring(0, 30) + "..."
      : session.first_message;
  }
  // Final fallback
  return "New conversation";
}

export function DashboardSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { user } = useAuth();
  const {
    hasMessages,
    triggerNewChat,
    recentSessions,
    loadRecentSessions,
    isLoadingSessions,
    selectSession,
    currentSessionId
  } = useChatContext();

  // Load recent sessions when user is available
  useEffect(() => {
    if (user?.id) {
      loadRecentSessions(user.id);
    }
  }, [user?.id, loadRecentSessions]);

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader
        className={cn(
          "flex md:pt-3.5",
          isCollapsed
            ? "flex-row items-center justify-between gap-y-4 md:flex-col md:items-start md:justify-start"
            : "flex-row items-center justify-between"
        )}
      >
        <div className="flex items-center">
          <Logo collapsed={isCollapsed} />
        </div>

        {!isCollapsed && (
          <motion.div
            key="header-expanded"
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <SidebarTrigger />
          </motion.div>
        )}
      </SidebarHeader>
      <SidebarContent className="gap-4 px-2 py-4">
        {/* New Chat Button - always visible, only triggers action when there are existing messages */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="New Chat"
              onClick={hasMessages ? triggerNewChat : undefined}
              className={cn(
                "flex items-center rounded-lg px-2 transition-colors text-muted-foreground",
                hasMessages ? "hover:bg-sidebar-muted hover:text-foreground cursor-pointer" : "cursor-default",
                isCollapsed && "justify-center"
              )}
            >
              <span className="text-[#de5e48]">
                <FontAwesomeIcon icon={faPlus} className="size-4" />
              </span>
              {!isCollapsed && (
                <span className="ml-2 text-sm font-medium font-[family-name:var(--font-work-sans)]">
                  New Chat
                </span>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Chat History Link */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Chat History"
              asChild
              className={cn(
                "flex items-center rounded-lg px-2 transition-colors text-muted-foreground hover:bg-sidebar-muted hover:text-foreground",
                isCollapsed && "justify-center"
              )}
            >
              <Link href="/chat/history">
                <span className="text-[#de5e48]">
                  <FontAwesomeIcon icon={faHistory} className="size-4" />
                </span>
                {!isCollapsed && (
                  <span className="ml-2 text-sm font-medium font-[family-name:var(--font-work-sans)]">
                    Chat History
                  </span>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Recents Section */}
        {!isCollapsed && recentSessions.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sm text-muted-foreground font-[family-name:var(--font-work-sans)]">
              Recents
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {isLoadingSessions ? (
                  <SidebarMenuItem>
                    <div className="px-2 py-1 text-sm text-muted-foreground">Loading...</div>
                  </SidebarMenuItem>
                ) : (
                  recentSessions.slice(0, 10).map((session) => (
                    <SidebarMenuItem key={session.id}>
                      <SidebarMenuButton
                        tooltip={getSessionPreview(session)}
                        onClick={() => selectSession(session.id)}
                        className={cn(
                          "flex items-center rounded-lg px-2 py-1.5 transition-colors text-muted-foreground hover:bg-sidebar-muted hover:text-foreground",
                          currentSessionId === session.id && "bg-sidebar-muted text-foreground"
                        )}
                      >
                        <p className="text-sm font-medium truncate font-[family-name:var(--font-work-sans)]">
                          {getSessionPreview(session)}
                        </p>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

      </SidebarContent>
      <SidebarFooter className="px-2">
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
