"use client";

import { useEffect, useState } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/sidebar-02/app-sidebar";
import { ChatProvider } from "@/app/context/ChatContext";
import { useAuth } from "@/lib/auth-context";
import { ChatSession, getUserSessions, getChatHistory, StoredMessage } from "@/lib/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMessage, faArrowLeft, faTrash, faSearch } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) {
        return "Today";
    } else if (diffDays === 1) {
        return "Yesterday";
    } else if (diffDays < 7) {
        return date.toLocaleDateString("en-US", { weekday: "long" });
    } else {
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
}

function formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function getSessionTitle(session: ChatSession): string {
    // Use AI-generated summary if available
    if (session.summary) {
        return session.summary;
    }
    // Fall back to conversation_context
    if (session.conversation_context) {
        return session.conversation_context;
    }
    // Fallback to first message truncated
    if (session.first_message) {
        return session.first_message.length > 50
            ? session.first_message.substring(0, 50) + "..."
            : session.first_message;
    }
    return "New conversation";
}

interface SessionWithPreview extends ChatSession {
    firstMessage?: string;
    preview?: string;
}

function ChatHistoryContent() {
    const { user } = useAuth();
    const router = useRouter();
    const [sessions, setSessions] = useState<SessionWithPreview[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSession, setSelectedSession] = useState<SessionWithPreview | null>(null);
    const [sessionMessages, setSessionMessages] = useState<StoredMessage[]>([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);

    useEffect(() => {
        const loadSessions = async () => {
            if (!user?.id) return;

            setIsLoading(true);
            try {
                const allSessions = await getUserSessions(user.id, 100);

                // Backend now returns first_message, so we can use it directly
                const sessionsWithPreviews = allSessions.map(session => ({
                    ...session,
                    firstMessage: session.first_message,
                    preview: session.first_message?.substring(0, 100)
                }));

                setSessions(sessionsWithPreviews);
            } catch (error) {
                console.error("Failed to load sessions:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadSessions();
    }, [user?.id]);

    const loadSessionMessages = async (session: SessionWithPreview) => {
        setSelectedSession(session);
        setIsLoadingMessages(true);
        try {
            const messages = await getChatHistory(session.id);
            setSessionMessages(messages);
        } catch (error) {
            console.error("Failed to load session messages:", error);
        } finally {
            setIsLoadingMessages(false);
        }
    };

    const continueSession = (sessionId: number) => {
        // Store the session ID to load and navigate to chat
        localStorage.setItem("samurai_chat_session_id", sessionId.toString());
        router.push("/chat");
    };

    const filteredSessions = sessions.filter(session => {
        if (!searchQuery) return true;
        const title = getSessionTitle(session).toLowerCase();
        const preview = session.preview?.toLowerCase() || "";
        return title.includes(searchQuery.toLowerCase()) || preview.includes(searchQuery.toLowerCase());
    });

    // Group sessions by date
    const groupedSessions = filteredSessions.reduce((groups, session) => {
        const date = formatDate(session.last_message_at);
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(session);
        return groups;
    }, {} as Record<string, SessionWithPreview[]>);

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <p className="text-muted-foreground font-[family-name:var(--font-work-sans)]">
                    Please sign in to view your chat history
                </p>
                <Button asChild>
                    <Link href="/login">Sign In</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="flex h-full w-full max-w-6xl mx-auto">
            {/* Session List */}
            <div className={cn(
                "flex flex-col border-r border-border h-full",
                selectedSession ? "w-1/3 hidden md:flex" : "w-full md:w-1/3"
            )}>
                <div className="p-4 border-b border-border">
                    <div className="flex items-center gap-3 mb-4">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/chat">
                                <FontAwesomeIcon icon={faArrowLeft} className="size-4" />
                            </Link>
                        </Button>
                        <h1 className="text-xl font-semibold font-[family-name:var(--font-work-sans)]">
                            Chat History
                        </h1>
                    </div>
                    <div className="relative">
                        <FontAwesomeIcon
                            icon={faSearch}
                            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
                        />
                        <Input
                            placeholder="Search conversations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 font-[family-name:var(--font-work-sans)]"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-2">
                            <div className="flex gap-1">
                                <span className="animate-bounce text-lg text-[#de5e48]" style={{ animationDelay: "0ms" }}>●</span>
                                <span className="animate-bounce text-lg text-[#de5e48]" style={{ animationDelay: "150ms" }}>●</span>
                                <span className="animate-bounce text-lg text-[#de5e48]" style={{ animationDelay: "300ms" }}>●</span>
                            </div>
                            <p className="text-sm text-muted-foreground">Loading conversations...</p>
                        </div>
                    ) : filteredSessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-2 p-4">
                            <FontAwesomeIcon icon={faMessage} className="size-8 text-muted-foreground/50" />
                            <p className="text-sm text-muted-foreground text-center font-[family-name:var(--font-work-sans)]">
                                {searchQuery ? "No conversations match your search" : "No conversations yet"}
                            </p>
                            {!searchQuery && (
                                <Button asChild size="sm" className="mt-2 bg-[#de5e48] hover:bg-[#de5e48]/90">
                                    <Link href="/chat">Start a conversation</Link>
                                </Button>
                            )}
                        </div>
                    ) : (
                        Object.entries(groupedSessions).map(([date, dateSessions]) => (
                            <div key={date}>
                                <div className="px-4 py-2 bg-muted/50 sticky top-0">
                                    <p className="text-xs font-medium text-muted-foreground font-[family-name:var(--font-work-sans)]">
                                        {date}
                                    </p>
                                </div>
                                {dateSessions.map((session) => (
                                    <button
                                        key={session.id}
                                        onClick={() => loadSessionMessages(session)}
                                        className={cn(
                                            "w-full p-4 text-left border-b border-border hover:bg-muted/50 transition-colors",
                                            selectedSession?.id === session.id && "bg-muted"
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <FontAwesomeIcon
                                                icon={faMessage}
                                                className="size-4 text-[#de5e48] mt-1 shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate font-[family-name:var(--font-work-sans)]">
                                                    {getSessionTitle(session)}
                                                </p>
                                                {session.preview && (
                                                    <p className="text-xs text-muted-foreground truncate mt-0.5 font-[family-name:var(--font-work-sans)]">
                                                        {session.preview}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] text-muted-foreground font-[family-name:var(--font-work-sans)]">
                                                        {formatTime(session.last_message_at)}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">•</span>
                                                    <span className="text-[10px] text-muted-foreground font-[family-name:var(--font-work-sans)]">
                                                        {session.total_messages} messages
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Message Preview */}
            <div className={cn(
                "flex-1 flex flex-col h-full",
                !selectedSession && "hidden md:flex"
            )}>
                {selectedSession ? (
                    <>
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="md:hidden"
                                    onClick={() => setSelectedSession(null)}
                                >
                                    <FontAwesomeIcon icon={faArrowLeft} className="size-4" />
                                </Button>
                                <div>
                                    <h2 className="font-medium font-[family-name:var(--font-work-sans)]">
                                        {getSessionTitle(selectedSession)}
                                    </h2>
                                    <p className="text-xs text-muted-foreground font-[family-name:var(--font-work-sans)]">
                                        {formatDate(selectedSession.started_at)} • {selectedSession.total_messages} messages
                                    </p>
                                </div>
                            </div>
                            <Button
                                onClick={() => continueSession(selectedSession.id)}
                                className="bg-[#de5e48] hover:bg-[#de5e48]/90"
                            >
                                Continue Chat
                            </Button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {isLoadingMessages ? (
                                <div className="flex flex-col items-center justify-center h-40 gap-2">
                                    <div className="flex gap-1">
                                        <span className="animate-bounce text-lg text-[#de5e48]" style={{ animationDelay: "0ms" }}>●</span>
                                        <span className="animate-bounce text-lg text-[#de5e48]" style={{ animationDelay: "150ms" }}>●</span>
                                        <span className="animate-bounce text-lg text-[#de5e48]" style={{ animationDelay: "300ms" }}>●</span>
                                    </div>
                                </div>
                            ) : (
                                sessionMessages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={cn(
                                            "flex gap-3 p-4 rounded-lg max-w-[80%]",
                                            message.role === "user"
                                                ? "bg-[#de5e48]/10 ml-auto"
                                                : "bg-muted mr-auto"
                                        )}
                                    >
                                        {message.role === "assistant" && (
                                            <div className="shrink-0">
                                                <Image
                                                    src="/sam-head-logo.png"
                                                    alt="Sam"
                                                    width={32}
                                                    height={32}
                                                    className="rounded-full object-contain"
                                                />
                                            </div>
                                        )}
                                        <p className="text-sm whitespace-pre-wrap font-[family-name:var(--font-work-sans)]">
                                            {message.content}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-4">
                        <FontAwesomeIcon icon={faMessage} className="size-12 text-muted-foreground/30" />
                        <div>
                            <h2 className="text-lg font-medium font-[family-name:var(--font-work-sans)]">
                                Select a conversation
                            </h2>
                            <p className="text-sm text-muted-foreground font-[family-name:var(--font-work-sans)]">
                                Choose a conversation from the list to view messages
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ChatHistoryPage() {
    return (
        <ChatProvider>
            <SidebarProvider>
                <div className="relative flex h-screen w-full">
                    <DashboardSidebar />
                    <SidebarInset className="flex flex-col">
                        <ChatHistoryContent />
                    </SidebarInset>
                </div>
            </SidebarProvider>
        </ChatProvider>
    );
}
