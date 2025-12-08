"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { ChatSession, getUserSessions } from "@/lib/api";

interface ChatContextType {
    hasMessages: boolean;
    setHasMessages: (value: boolean) => void;
    triggerNewChat: () => void;
    onNewChatRequested: (callback: () => void) => void;
    recentSessions: ChatSession[];
    loadRecentSessions: (userId: string) => Promise<void>;
    isLoadingSessions: boolean;
    selectSession: (sessionId: number) => void;
    onSessionSelected: (callback: (sessionId: number) => void) => void;
    currentSessionId: number | null;
    setCurrentSessionId: (id: number | null) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
    const [hasMessages, setHasMessages] = useState(false);
    const [newChatCallback, setNewChatCallback] = useState<(() => void) | null>(null);
    const [recentSessions, setRecentSessions] = useState<ChatSession[]>([]);
    const [isLoadingSessions, setIsLoadingSessions] = useState(false);
    const [sessionSelectedCallback, setSessionSelectedCallback] = useState<((sessionId: number) => void) | null>(null);
    const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);

    const triggerNewChat = useCallback(() => {
        if (newChatCallback) {
            newChatCallback();
        }
    }, [newChatCallback]);

    const onNewChatRequested = useCallback((callback: () => void) => {
        setNewChatCallback(() => callback);
    }, []);

    const loadRecentSessions = useCallback(async (userId: string) => {
        setIsLoadingSessions(true);
        try {
            const sessions = await getUserSessions(userId, 20);
            setRecentSessions(sessions);
        } catch (error) {
            console.error('Failed to load recent sessions:', error);
        } finally {
            setIsLoadingSessions(false);
        }
    }, []);

    const selectSession = useCallback((sessionId: number) => {
        if (sessionSelectedCallback) {
            sessionSelectedCallback(sessionId);
        }
    }, [sessionSelectedCallback]);

    const onSessionSelected = useCallback((callback: (sessionId: number) => void) => {
        setSessionSelectedCallback(() => callback);
    }, []);

    return (
        <ChatContext.Provider value={{
            hasMessages,
            setHasMessages,
            triggerNewChat,
            onNewChatRequested,
            recentSessions,
            loadRecentSessions,
            isLoadingSessions,
            selectSession,
            onSessionSelected,
            currentSessionId,
            setCurrentSessionId
        }}>
            {children}
        </ChatContext.Provider>
    );
}

export function useChatContext() {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error("useChatContext must be used within a ChatProvider");
    }
    return context;
}
