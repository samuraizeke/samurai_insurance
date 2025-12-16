"use client";

import { useEffect, useState } from "react";
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
import { faPlus, faHistory, faEllipsisVertical, faTrash, faPen } from "@fortawesome/free-solid-svg-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Logo } from "@/components/sidebar-02/logo";
import { UserMenu } from "@/components/sidebar-02/user-menu";
import { useChatContext } from "@/app/context/ChatContext";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { FeedbackButton } from "@/components/feedback";

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
  return "New chat";
}

export function DashboardSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isOnChatPage = pathname === "/chat";

  // Check viewport width directly to avoid stale hook state
  const [isMobileView, setIsMobileView] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close mobile sidebar after navigation
  const closeMobileSidebar = () => {
    if (isMobileView) {
      setOpenMobile(false);
    }
  };
  const {
    hasMessages,
    triggerNewChat,
    recentSessions,
    loadRecentSessions,
    isLoadingSessions,
    selectSession,
    currentSessionId,
    removeSession,
    renameSession
  } = useChatContext();

  // Rename dialog state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [sessionToRename, setSessionToRename] = useState<{ id: number; currentName: string } | null>(null);
  const [newSessionName, setNewSessionName] = useState("");

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<{ id: number; title: string } | null>(null);

  const handleOpenDeleteDialog = (e: React.MouseEvent, sessionId: number, title: string) => {
    e.stopPropagation();
    setSessionToDelete({ id: sessionId, title });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!user?.id || !sessionToDelete) return;

    const success = await removeSession(sessionToDelete.id, user.id);
    if (success) {
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    } else {
      alert("Failed to delete chat. Please try again.");
    }
  };

  const handleOpenRenameDialog = (e: React.MouseEvent, sessionId: number, currentName: string) => {
    e.stopPropagation();
    setSessionToRename({ id: sessionId, currentName });
    setNewSessionName(currentName);
    setRenameDialogOpen(true);
  };

  const handleRenameSession = async () => {
    if (!user?.id || !sessionToRename || !newSessionName.trim()) return;

    const success = await renameSession(sessionToRename.id, user.id, newSessionName.trim());
    if (success) {
      setRenameDialogOpen(false);
      setSessionToRename(null);
      setNewSessionName("");
    } else {
      alert("Failed to rename chat. Please try again.");
    }
  };

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
          "flex md:pt-3.5 pt-4",
          isCollapsed
            ? "flex-row items-center justify-between gap-y-4 md:flex-col md:items-start md:justify-start"
            : "flex-row items-center justify-between"
        )}
      >
        <div className="flex items-center">
          <Logo collapsed={isCollapsed} isMobile={isMobileView} />
        </div>

        {/* Mobile: show close trigger in sidebar header */}
        {isMobileView && (
          <SidebarTrigger className="h-7 w-7 bg-[#333333] hover:bg-[#333333]/90 text-[#f7f6f3] hover:text-[#f7f6f3] rounded-full [&_svg]:size-4" />
        )}

        {/* Desktop: show trigger when expanded */}
        {!isMobileView && !isCollapsed && (
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
        {/* New Chat Button - always visible */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="New Chat"
              onClick={() => {
                if (isOnChatPage && hasMessages) {
                  triggerNewChat();
                } else if (!isOnChatPage) {
                  router.push("/chat");
                }
                closeMobileSidebar();
              }}
              className={cn(
                "flex items-center rounded-lg px-2 transition-colors text-muted-foreground",
                (hasMessages || !isOnChatPage) ? "hover:bg-[#333333]/5 hover:text-foreground cursor-pointer" : "cursor-default",
                isCollapsed && "justify-center"
              )}
            >
              <span className="text-[#de5e48]">
                <FontAwesomeIcon icon={faPlus} className="size-4" />
              </span>
              {!isCollapsed && (
                <span className="ml-2 text-sm font-medium font-(family-name:--font-work-sans)">
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
                "flex items-center rounded-lg px-2 transition-colors text-muted-foreground hover:bg-[#333333]/5 hover:text-foreground",
                isCollapsed && "justify-center"
              )}
            >
              <Link href="/chat/history" onClick={closeMobileSidebar}>
                <span className="text-[#de5e48]">
                  <FontAwesomeIcon icon={faHistory} className="size-4" />
                </span>
                {!isCollapsed && (
                  <span className="ml-2 text-sm font-medium font-(family-name:--font-work-sans)">
                    Chat History
                  </span>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Feedback Button */}
        <FeedbackButton collapsed={isCollapsed} sessionId={currentSessionId} />

        {/* Recents Section */}
        {!isCollapsed && recentSessions.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-bold text-muted-foreground font-(family-name:--font-work-sans)">
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
                    <SidebarMenuItem key={session.id} className="group/item">
                      <div className="flex items-center w-full rounded-lg hover:bg-[#333333]/5 transition-colors">
                        <SidebarMenuButton
                          tooltip={getSessionPreview(session)}
                          onClick={() => {
                            if (isOnChatPage) {
                              selectSession(session.id);
                            } else {
                              // Store session ID and navigate to chat
                              localStorage.setItem('samurai_pending_session_id', session.id.toString());
                              router.push("/chat");
                            }
                            closeMobileSidebar();
                          }}
                          className={cn(
                            "flex-1 flex items-center rounded-lg px-2 py-1.5 transition-colors text-muted-foreground hover:text-foreground",
                            currentSessionId === session.id && "bg-[#333333]/10 text-foreground"
                          )}
                        >
                          <p className="text-sm font-medium truncate font-(family-name:--font-work-sans)">
                            {getSessionPreview(session)}
                          </p>
                        </SidebarMenuButton>
                        <DropdownMenu>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="opacity-100 md:opacity-0 md:group-hover/item:opacity-100 data-[state=open]:opacity-100 p-1 text-muted-foreground hover:text-foreground transition-all rounded-md hover:bg-sidebar-muted"
                                  onClick={(e) => e.stopPropagation()}
                                  aria-label="More options"
                                >
                                  <FontAwesomeIcon icon={faEllipsisVertical} className="size-3" aria-hidden="true" />
                                </button>
                              </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              sideOffset={4}
                              className="bg-[#333333] text-[#f7f6f3] font-(family-name:--font-work-sans)"
                            >
                              More options
                            </TooltipContent>
                          </Tooltip>
                          <DropdownMenuContent
                            align="end"
                            side="bottom"
                            sideOffset={4}
                            collisionPadding={16}
                            className="z-10000 rounded-2xl p-1.5 border border-[#e5e5e5] shadow-xl font-(family-name:--font-work-sans) min-w-32"
                            style={{ backgroundColor: '#ffffff' }}
                          >
                            <DropdownMenuItem
                              onClick={(e) => handleOpenRenameDialog(e, session.id, getSessionPreview(session))}
                              className="cursor-pointer hover:bg-[#333333]/5 focus:bg-[#333333]/5 rounded-lg"
                            >
                              <FontAwesomeIcon icon={faPen} className="size-3 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => handleOpenDeleteDialog(e, session.id, getSessionPreview(session))}
                              className="text-red-600 focus:text-red-600 hover:bg-red-50 focus:bg-red-50 cursor-pointer rounded-lg"
                            >
                              <FontAwesomeIcon icon={faTrash} className="size-3 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl font-(family-name:--font-work-sans) p-8">
          <DialogHeader className="pb-4">
            <DialogTitle className="font-(family-name:--font-alte-haas) text-xl">Rename chat</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <input
              type="text"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRenameSession();
                }
              }}
              placeholder="Enter new name"
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#de5e48] focus:border-transparent"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-3 pt-4">
            <button
              onClick={() => setRenameDialogOpen(false)}
              className="px-5 py-2.5 text-base font-medium text-[#fffaf3] bg-[#333333] rounded-lg hover:bg-[#444444] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRenameSession}
              disabled={!newSessionName.trim()}
              className="px-5 py-2.5 text-base font-medium text-white bg-[#de5e48] rounded-lg hover:bg-[#c54d3a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete chat"
        description={`Are you sure you want to delete "${sessionToDelete?.title || "this chat"}"? This action will remove it from your history.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />
    </Sidebar>
  );
}
