"use client";

import { useEffect, useState } from "react";
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import Image from "next/image";
import { DashboardSidebar } from "@/components/sidebar-02/app-sidebar";
import { ChatProvider, useChatContext } from "@/app/context/ChatContext";
import { useAuth } from "@/lib/auth-context";
import { ChatSession, getUserSessions, deleteSession, renameSession } from "@/lib/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMessage, faSearch, faPlus, faTrash, faEllipsisVertical, faPen } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import Link from "next/link";
import { useRouter } from "next/navigation";

function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 60) {
        if (diffMinutes <= 1) return "Last message just now";
        return `Last message ${diffMinutes} ${diffMinutes === 1 ? "minute" : "minutes"} ago`;
    } else if (diffHours < 24) {
        return `Last message ${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
    } else if (diffDays < 7) {
        return `Last message ${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
    } else {
        return `Last message ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    }
}

function getSessionTitle(session: ChatSession): string {
    if (session.summary) {
        return session.summary;
    }
    if (session.conversation_context) {
        return session.conversation_context;
    }
    if (session.first_message) {
        return session.first_message.length > 40
            ? session.first_message.substring(0, 40) + "..."
            : session.first_message;
    }
    return "New chat";
}

function ChatHistoryContent() {
    const { user } = useAuth();
    const router = useRouter();
    const { onNewChatRequested, onSessionSelected, setHasMessages } = useChatContext();
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [sessionToRename, setSessionToRename] = useState<{ id: number; currentName: string } | null>(null);
    const [newSessionName, setNewSessionName] = useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState<{ id: number; title: string } | null>(null);

    // Enable "New Chat" button in sidebar on history page
    useEffect(() => {
        setHasMessages(true);
    }, [setHasMessages]);

    // Register sidebar callbacks for navigation
    useEffect(() => {
        // When "New Chat" is clicked in sidebar, clear session and navigate to chat
        onNewChatRequested(() => {
            localStorage.removeItem("samurai_chat_session_id");
            router.push("/chat");
        });
    }, [onNewChatRequested, router]);

    useEffect(() => {
        // When a session is selected in sidebar, set session and navigate to chat
        onSessionSelected((sessionId: number) => {
            localStorage.setItem("samurai_chat_session_id", sessionId.toString());
            router.push("/chat");
        });
    }, [onSessionSelected, router]);

    useEffect(() => {
        const loadSessions = async () => {
            if (!user?.id) return;

            setIsLoading(true);
            try {
                const allSessions = await getUserSessions(user.id, 100);
                setSessions(allSessions);
            } catch (error) {
                console.error("Failed to load sessions:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadSessions();
    }, [user?.id]);

    const continueSession = (sessionId: number) => {
        localStorage.setItem("samurai_chat_session_id", sessionId.toString());
        router.push("/chat");
    };

    const handleOpenDeleteDialog = (e: React.MouseEvent, session: ChatSession) => {
        e.stopPropagation();
        setSessionToDelete({ id: session.id, title: getSessionTitle(session) });
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!user?.id || !sessionToDelete) return;

        const success = await deleteSession(sessionToDelete.id, user.id);
        if (success) {
            setSessions(prev => prev.filter(s => s.id !== sessionToDelete.id));
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
            setSessions(prev => prev.map(s =>
                s.id === sessionToRename.id ? { ...s, summary: newSessionName.trim() } : s
            ));
            setRenameDialogOpen(false);
            setSessionToRename(null);
            setNewSessionName("");
        } else {
            alert("Failed to rename chat. Please try again.");
        }
    };

    const filteredSessions = sessions.filter(session => {
        if (!searchQuery) return true;
        const title = getSessionTitle(session).toLowerCase();
        return title.includes(searchQuery.toLowerCase());
    });

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <p className="text-muted-foreground font-(family-name:--font-work-sans)">
                    Please sign in to view your chat history
                </p>
                <Button asChild>
                    <Link href="/login">Sign In</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-full w-full max-w-3xl mx-auto bg-background pb-20 md:pb-8">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 md:pt-12 pb-4">
                <h1 className="text-3xl font-bold font-(family-name:--font-alte-haas) text-[#333333]">
                    Chat History
                </h1>
                <Button asChild className="bg-[#333333] hover:bg-[#333333]/90 font-(family-name:--font-work-sans) font-bold text-white rounded-full">
                    <Link href="/chat">
                        <FontAwesomeIcon icon={faPlus} className="size-3 -mr-1" />
                        New Chat
                    </Link>
                </Button>
            </div>

            {/* Search */}
            <div className="px-2 pt-4">
                <div className="relative">
                    <FontAwesomeIcon
                        icon={faSearch}
                        className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
                    />
                    <Input
                        placeholder="Search chats..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 text-base font-(family-name:--font-work-sans) border-[#333333]/10 h-11 placeholder:text-base bg-[hsl(0_0%_98%)] rounded-full"
                    />
                </div>
            </div>

            {/* Chat Count */}
            <div className="px-6 py-4">
                <p className="text-sm text-muted-foreground font-(family-name:--font-work-sans)">
                    {filteredSessions.length} {filteredSessions.length === 1 ? "chat" : "chats"} with Sam
                    {searchQuery && ` matching "${searchQuery}"`}
                </p>
            </div>

            {/* Chat List */}
            <div className="flex-1">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-2">
                        <div className="flex gap-1">
                            <span className="animate-bounce text-lg text-[#de5e48]" style={{ animationDelay: "0ms" }}>●</span>
                            <span className="animate-bounce text-lg text-[#de5e48]" style={{ animationDelay: "150ms" }}>●</span>
                            <span className="animate-bounce text-lg text-[#de5e48]" style={{ animationDelay: "300ms" }}>●</span>
                        </div>
                        <p className="text-base text-muted-foreground">Loading chats...</p>
                    </div>
                ) : filteredSessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-2 p-4">
                        <FontAwesomeIcon icon={faMessage} className="size-8 text-muted-foreground/50" />
                        <p className="text-base text-muted-foreground text-center font-(family-name:--font-work-sans)">
                            {searchQuery ? "No chats match your search" : "No chats yet"}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-[#333333]/20 border-t border-[#333333]/20">
                        {filteredSessions.map((session) => (
                            <div
                                key={session.id}
                                className="group w-full flex items-center gap-2 px-4 py-4 hover:bg-[#333333]/5 transition-colors cursor-pointer"
                            >
                                <button
                                    onClick={() => continueSession(session.id)}
                                    className="flex-1 flex flex-col gap-1 text-left min-w-0"
                                >
                                    <p className="text-sm font-bold truncate font-(family-name:--font-work-sans) text-[#333333]">
                                        {getSessionTitle(session)}
                                    </p>
                                    <span className="text-xs text-muted-foreground font-normal font-(family-name:--font-work-sans)">
                                        {formatRelativeTime(session.last_message_at)}
                                    </span>
                                </button>
                                <DropdownMenu>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 data-[state=open]:opacity-100 p-2 text-muted-foreground hover:text-foreground transition-all rounded-md hover:bg-muted"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <FontAwesomeIcon icon={faEllipsisVertical} className="size-4" />
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
                                    <DropdownMenuContent align="end" side="bottom" className="rounded-2xl p-1.5 border-[#333333]/10 shadow-lg bg-[hsl(0_0%_98%)] font-(family-name:--font-work-sans)">
                                        <DropdownMenuItem
                                            onClick={(e) => handleOpenRenameDialog(e, session.id, getSessionTitle(session))}
                                            className="cursor-pointer hover:bg-[#333333]/5 focus:bg-[#333333]/5 rounded-lg"
                                        >
                                            <FontAwesomeIcon icon={faPen} className="size-4 mr-2" />
                                            Rename
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={(e) => handleOpenDeleteDialog(e, session)}
                                            className="text-red-600 focus:text-red-600 hover:bg-red-50 focus:bg-red-50 cursor-pointer rounded-lg"
                                        >
                                            <FontAwesomeIcon icon={faTrash} className="size-4 mr-2" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        ))}
                    </div>
                )}
            </div>

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
        </div>
    );
}

function MobileHeader() {
    const { openMobile } = useSidebar();

    // Hide header when sidebar is open (X is inside sidebar)
    if (openMobile) return null;

    return (
        <header className="md:hidden shrink-0 bg-[#f7f6f3] pt-3">
            <div className="flex items-center justify-between h-14 px-4">
                <SidebarTrigger className="h-7 w-7 bg-[#333333] hover:bg-[#333333]/90 text-[#f7f6f3] hover:text-[#f7f6f3] rounded-full [&_svg]:size-4" />
                <Image
                    src="/wordmark-only-logo.png"
                    alt="Samurai Insurance"
                    width={180}
                    height={48}
                    className="h-12 w-auto object-contain"
                />
                <div className="size-10" /> {/* Spacer for centering */}
            </div>
        </header>
    );
}

export default function ChatHistoryPage() {
    return (
        <ChatProvider>
            <SidebarProvider>
                <div className="relative flex h-screen w-full">
                    <DashboardSidebar />
                    <SidebarInset className="flex flex-col overflow-auto">
                        <MobileHeader />
                        <ChatHistoryContent />
                    </SidebarInset>
                </div>
            </SidebarProvider>
        </ChatProvider>
    );
}
