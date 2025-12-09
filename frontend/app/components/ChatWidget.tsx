// frontend/components/ChatWidget.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    faArrowUp,
    faPlusCircle,
    faClipboard,
    faPaperclip,
    faPlus,
    faFileLines,
    faXmark,
    faCamera,
    faUpload,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
    sendChatMessage,
    uploadPolicyDocument,
    createChatSession,
    getStoredSessionId,
    getChatHistory,
    clearStoredSession,
    getUserPolicies,
    UserPolicy
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useChatContext } from "@/app/context/ChatContext";

interface AttachedFile {
    id: string;
    name: string;
    file: File;
    preview?: string;
}

interface AttachedPolicy {
    policyType: string;
    carrier: string;
}

interface Message {
    id: string;
    content: string;
    role: "user" | "assistant";
    timestamp: Date;
    attachedPolicy?: AttachedPolicy;
}

export default function ChatWidget() {
    const { user } = useAuth();
    const { setHasMessages, onNewChatRequested, onSessionSelected, setCurrentSessionId, loadRecentSessions } = useChatContext();
    const [prompt, setPrompt] = useState("");
    const [isDragOver, setIsDragOver] = useState(false);
    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploadingPolicy, setIsUploadingPolicy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [sessionId, setSessionId] = useState<string>(() => `session_${Date.now()}_${Math.random().toString(36).substring(7)}`);
    const [dbSessionId, setDbSessionId] = useState<number | null>(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [userPolicies, setUserPolicies] = useState<UserPolicy[]>([]);
    const [selectedPolicy, setSelectedPolicy] = useState<UserPolicy | null>(null);
    const [isLoadingPolicies, setIsLoadingPolicies] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const policyFileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const sessionInitialized = useRef(false);

    // Get time-based greeting
    const getTimeBasedGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) {
            return "Good morning";
        } else if (hour >= 12 && hour < 18) {
            return "Good afternoon";
        } else {
            return "Good evening";
        }
    };

    // Get user's display name (check multiple possible metadata fields)
    const getUserFirstName = () => {
        if (!user) return "";

        // Check user_metadata first (works for email signups)
        const metadata = user.user_metadata;
        let fullName = metadata?.full_name || metadata?.name || "";

        // If not found, check identities (works for OAuth like Google)
        if (!fullName && user.identities && user.identities.length > 0) {
            const identityData = user.identities[0].identity_data;
            fullName = identityData?.full_name || identityData?.name || "";
        }

        // Fallback to email username if no name found
        if (!fullName && user.email) {
            const username = user.email.split('@')[0];
            return username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();
        }

        const firstName = fullName.split(' ')[0];
        return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    };

    // Get user initials for avatar
    const getUserInitials = () => {
        if (!user) return "U";

        const metadata = user.user_metadata;
        const fullName = metadata?.full_name || metadata?.name || "";

        if (fullName) {
            return fullName
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);
        }

        return user.email?.slice(0, 2).toUpperCase() || "U";
    };

    const generateFileId = () => Math.random().toString(36).substring(7);

    // Check if message contains upload policy marker
    const hasUploadMarker = (content: string) => content.includes('[UPLOAD_POLICY]');
    const removeUploadMarker = (content: string) => content.replace('[UPLOAD_POLICY]', '').trim();

    // Initialize session and load history for logged-in users
    useEffect(() => {
        const initializeSession = async () => {
            if (!user?.id || sessionInitialized.current) return;
            sessionInitialized.current = true;

            setIsLoadingHistory(true);

            try {
                // Check for existing session in localStorage
                const storedSessionId = getStoredSessionId();

                if (storedSessionId) {
                    // Load existing session history
                    console.log('📂 Loading existing session:', storedSessionId);
                    setDbSessionId(storedSessionId);
                    setCurrentSessionId(storedSessionId);

                    const history = await getChatHistory(storedSessionId);
                    if (history.length > 0) {
                        const loadedMessages: Message[] = history.map(msg => ({
                            id: msg.id,
                            content: msg.content,
                            role: msg.role,
                            timestamp: new Date(msg.timestamp)
                        }));
                        setMessages(loadedMessages);
                        console.log(`✅ Loaded ${history.length} messages from history`);
                    }
                }
                // Don't create a new session here - wait until first message is sent
            } catch (err) {
                console.error('Failed to initialize session:', err);
            } finally {
                setIsLoadingHistory(false);
            }
        };

        initializeSession();
    }, [user?.id, setCurrentSessionId]);

    // Function to start a new chat (just clears state, session created on first message)
    const startNewConversation = useCallback(() => {
        // Clear current session - new session will be created when first message is sent
        clearStoredSession();
        setMessages([]);
        setDbSessionId(null);
        setCurrentSessionId(null);
        setSelectedPolicy(null); // Clear policy selection for new chat
        setSessionId(`session_${Date.now()}_${Math.random().toString(36).substring(7)}`);
        sessionInitialized.current = false; // Allow session creation on first message
        console.log('🆕 Ready for new chat');
    }, [setCurrentSessionId]);

    // Function to load a specific session (called from sidebar)
    const loadSession = useCallback(async (targetSessionId: number) => {
        if (!user?.id) return;

        setIsLoadingHistory(true);
        try {
            // Update localStorage to persist the selection
            localStorage.setItem('samurai_chat_session_id', targetSessionId.toString());
            setDbSessionId(targetSessionId);
            setCurrentSessionId(targetSessionId);

            // Load chat history for this session
            const history = await getChatHistory(targetSessionId);
            if (history.length > 0) {
                const loadedMessages: Message[] = history.map(msg => ({
                    id: msg.id,
                    content: msg.content,
                    role: msg.role,
                    timestamp: new Date(msg.timestamp)
                }));
                setMessages(loadedMessages);
                console.log(`✅ Loaded session ${targetSessionId} with ${history.length} messages`);
            } else {
                setMessages([]);
            }
        } catch (err) {
            console.error('Failed to load session:', err);
        } finally {
            setIsLoadingHistory(false);
        }
    }, [user?.id, setCurrentSessionId]);

    // Sync messages state with chat context for sidebar
    useEffect(() => {
        setHasMessages(messages.length > 0);
    }, [messages.length, setHasMessages]);

    // Register the new chat callback with context for sidebar to use
    useEffect(() => {
        onNewChatRequested(startNewConversation);
    }, [onNewChatRequested, startNewConversation]);

    // Register the session selection callback with context for sidebar to use
    useEffect(() => {
        onSessionSelected(loadSession);
    }, [onSessionSelected, loadSession]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Handle policy document upload
    const handlePolicyUpload = async (file: File) => {
        console.log('📤 Uploading policy document:', file.name);

        setShowUploadModal(false);
        setIsLoading(true);
        setIsUploadingPolicy(true);

        try {
            const result = await uploadPolicyDocument(file, sessionId, user?.id);

            if (result.success && result.message) {
                const assistantMessage: Message = {
                    id: generateFileId(),
                    content: result.message,
                    role: "assistant",
                    timestamp: new Date(),
                };
                setMessages((prev) => [...prev, assistantMessage]);
                // Refresh policies list to show newly uploaded policy
                loadUserPolicies();
            } else {
                const errorMessage: Message = {
                    id: generateFileId(),
                    content: result.error || "I had trouble processing your document. Please try uploading again or use a clearer image.",
                    role: "assistant",
                    timestamp: new Date(),
                };
                setMessages((prev) => [...prev, errorMessage]);
            }
        } catch (error) {
            console.error("Error uploading policy:", error);
            const errorMessage: Message = {
                id: generateFileId(),
                content: "I encountered an error processing your document. Please try again.",
                role: "assistant",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
            setIsUploadingPolicy(false);
        }
    };

    // Handle file selection for policy upload
    const handlePolicyFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handlePolicyUpload(files[0]);
        }
        if (policyFileInputRef.current) {
            policyFileInputRef.current.value = "";
        }
    };

    const processFiles = (files: File[]) => {
        for (const file of files) {
            const fileId = generateFileId();
            const attachedFile: AttachedFile = {
                id: fileId,
                name: file.name,
                file,
            };

            if (file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = () => {
                    setAttachedFiles((prev) =>
                        prev.map((f) =>
                            f.id === fileId ? { ...f, preview: reader.result as string } : f
                        )
                    );
                };
                reader.readAsDataURL(file);
            }

            setAttachedFiles((prev) => [...prev, attachedFile]);
        }
    };

    const submitPrompt = async () => {
        if (prompt.trim() && !isLoading) {
            const userMessageContent = prompt;

            // Build message with policy context if selected
            let messageToSend = userMessageContent;
            if (selectedPolicy) {
                const policyContext = `[Using ${getPolicyDisplayName(selectedPolicy.policyType)} from ${selectedPolicy.carrier} as context]\n\nPolicy Details:\n${selectedPolicy.analysis}\n\n---\n\nUser Question: `;
                messageToSend = policyContext + userMessageContent;
            }

            // Add user message (show original message to user, not the one with context)
            const userMessage: Message = {
                id: generateFileId(),
                content: userMessageContent,
                role: "user",
                timestamp: new Date(),
                attachedPolicy: selectedPolicy ? {
                    policyType: selectedPolicy.policyType,
                    carrier: selectedPolicy.carrier,
                } : undefined,
            };

            setMessages((prev) => [...prev, userMessage]);
            setPrompt("");
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
            setAttachedFiles([]);
            setSelectedPolicy(null); // Clear policy selection after sending
            setIsLoading(true);
            setError(null);

            try {
                // Create session on first message if we don't have one
                let currentDbSessionId = dbSessionId;
                if (!currentDbSessionId && user?.id) {
                    console.log('🆕 Creating new chat session on first message for user:', user.id);
                    const session = await createChatSession(user.id);
                    if (session) {
                        currentDbSessionId = session.sessionId;
                        setDbSessionId(session.sessionId);
                        setCurrentSessionId(session.sessionId);
                        console.log('✅ Created session:', session.sessionId);
                    }
                }

                // Convert messages to the format expected by the backend
                const history = messages.map(msg => ({
                    role: msg.role,
                    content: msg.content,
                }));

                // Call the backend API with session tracking (send message with policy context)
                const response = await sendChatMessage(
                    messageToSend,
                    history,
                    user?.id,
                    currentDbSessionId ?? undefined
                );

                // Add assistant response
                const assistantMessage: Message = {
                    id: generateFileId(),
                    content: response,
                    role: "assistant",
                    timestamp: new Date(),
                };

                setMessages((prev) => [...prev, assistantMessage]);

                // Refresh recent sessions in sidebar to show updated last_message_at
                if (user?.id) {
                    loadRecentSessions(user.id);
                }
            } catch (err) {
                console.error("Error sending message:", err);
                setError("Failed to send message. Please try again.");

                // Add error message to chat
                const errorMessage: Message = {
                    id: generateFileId(),
                    content: "I'm sorry, I encountered an error processing your request. Please try again.",
                    role: "assistant",
                    timestamp: new Date(),
                };
                setMessages((prev) => [...prev, errorMessage]);
            } finally {
                setIsLoading(false);
            }
        }
    };
    // Load user policies
    const loadUserPolicies = useCallback(async () => {
        // Only run on client-side
        if (typeof window === 'undefined') return;
        if (!user?.id) return;

        setIsLoadingPolicies(true);
        try {
            const policies = await getUserPolicies(user.id);
            setUserPolicies(policies);
        } catch (err) {
            console.error('Failed to load policies:', err);
        } finally {
            setIsLoadingPolicies(false);
        }
    }, [user?.id]);

    // Load policies on mount and when user changes
    useEffect(() => {
        // Only run on client-side after mount
        if (typeof window === 'undefined') return;
        loadUserPolicies();
    }, [loadUserPolicies]);

    // Get display name for policy type
    const getPolicyDisplayName = (policyType: string) => {
        const names: Record<string, string> = {
            'auto': 'Auto Insurance',
            'home': 'Home Insurance',
            'renters': 'Renters Insurance',
            'umbrella': 'Umbrella Policy',
            'life': 'Life Insurance',
            'health': 'Health Insurance',
            'other': 'Other Policy'
        };
        return names[policyType] || policyType;
    };
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        submitPrompt();
    };
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };
    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            processFiles(files);
        }
    };
    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setPrompt(e.target.value);

        // Auto-resize textarea
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    };
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submitPrompt();
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        processFiles(files);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleRemoveFile = (fileId: string) => {
        setAttachedFiles((prev) => prev.filter((file) => file.id !== fileId));
    };

    const handlePasteFromClipboard = async () => {
        try {
            const clipboardItems = await navigator.clipboard.read();

            for (const item of clipboardItems) {
                // Check for image types
                const imageType = item.types.find(type => type.startsWith('image/'));
                if (imageType) {
                    const blob = await item.getType(imageType);
                    const file = new File([blob], `clipboard-image-${Date.now()}.png`, { type: imageType });
                    processFiles([file]);
                    return;
                }

                // Check for text
                if (item.types.includes('text/plain')) {
                    const blob = await item.getType('text/plain');
                    const text = await blob.text();
                    setPrompt(prev => prev + text);
                    return;
                }
            }
        } catch (err) {
            console.error('Failed to read clipboard:', err);
        }
    };

    return (
        <div className={cn(
            "mx-auto flex w-full flex-col h-full",
            (messages.length === 0 || isLoadingHistory) ? "justify-center gap-4" : "gap-4"
        )}>
            {isLoadingHistory ? (
                <div className="flex flex-col items-center justify-center gap-4">
                    <div className="flex gap-1">
                        <span className="animate-bounce text-2xl text-[#de5e48]" style={{ animationDelay: "0ms" }}>●</span>
                        <span className="animate-bounce text-2xl text-[#de5e48]" style={{ animationDelay: "150ms" }}>●</span>
                        <span className="animate-bounce text-2xl text-[#de5e48]" style={{ animationDelay: "300ms" }}>●</span>
                    </div>
                    <p className="text-muted-foreground font-[family-name:var(--font-work-sans)]">Loading your chat...</p>
                </div>
            ) : messages.length === 0 && !isUploadingPolicy ? (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6 max-w-2xl w-full mx-auto px-4">
                    <Image
                        src="/sam-body-logo.png"
                        alt="Sam"
                        width={56}
                        height={56}
                        className="object-contain shrink-0"
                    />
                    <h1 className="text-pretty text-center font-heading font-semibold text-[24px] text-foreground tracking-tighter sm:text-[32px] md:text-[46px]">
                        {getUserFirstName()
                            ? `${getTimeBasedGreeting()}, ${getUserFirstName()}`
                            : "How can I help you today?"}
                    </h1>
                </div>
            ) : messages.length === 0 && isUploadingPolicy ? (
                <div className="flex flex-col items-center justify-center gap-4 max-w-2xl w-full mx-auto">
                    <Image
                        src="/sam-body-logo.png"
                        alt="Sam"
                        width={64}
                        height={64}
                        className="object-contain"
                    />
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-lg font-medium text-foreground font-[family-name:var(--font-work-sans)]">
                            Analyzing your policy document...
                        </p>
                        <p className="text-sm text-muted-foreground font-[family-name:var(--font-work-sans)]">
                            This may take a moment
                        </p>
                        <div className="flex gap-1 mt-2">
                            <span className="animate-bounce text-xl text-[#de5e48]" style={{ animationDelay: "0ms" }}>●</span>
                            <span className="animate-bounce text-xl text-[#de5e48]" style={{ animationDelay: "150ms" }}>●</span>
                            <span className="animate-bounce text-xl text-[#de5e48]" style={{ animationDelay: "300ms" }}>●</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto pb-4 space-y-4 max-w-2xl w-full mx-auto scrollbar-hide px-2 sm:px-0">
                    {messages.map((message) => {
                        const showUploadButton = hasUploadMarker(message.content);
                        const displayContent = showUploadButton ? removeUploadMarker(message.content) : message.content;

                        return (
                            <div
                                key={message.id}
                                className={cn(
                                    "flex items-start gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-lg w-fit max-w-[90%] sm:max-w-[80%]",
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
                                <div className="flex flex-col gap-2">
                                    {message.attachedPolicy && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-[family-name:var(--font-work-sans)]">
                                            <FontAwesomeIcon icon={faFileLines} className="size-3 text-[#de5e48]" />
                                            <span>Using {getPolicyDisplayName(message.attachedPolicy.policyType)}</span>
                                        </div>
                                    )}
                                    {message.role === "assistant" ? (
                                        <div className="text-base font-[family-name:var(--font-work-sans)] prose prose-sm max-w-none">
                                            <ReactMarkdown
                                                components={{
                                                    h1: ({ children }) => (
                                                        <h1 className="text-xl font-heading font-bold mt-4 mb-2 first:mt-0">{children}</h1>
                                                    ),
                                                    h2: ({ children }) => (
                                                        <h2 className="text-lg font-heading font-bold mt-3 mb-2 first:mt-0">{children}</h2>
                                                    ),
                                                    h3: ({ children }) => (
                                                        <h3 className="text-base font-heading font-bold mt-2 mb-1 first:mt-0">{children}</h3>
                                                    ),
                                                    h4: ({ children }) => (
                                                        <h4 className="text-base font-heading font-bold mt-2 mb-1 first:mt-0">{children}</h4>
                                                    ),
                                                    strong: ({ children }) => (
                                                        <strong className="font-bold">{children}</strong>
                                                    ),
                                                    p: ({ children }) => (
                                                        <p className="mb-2 last:mb-0">{children}</p>
                                                    ),
                                                    ul: ({ children }) => (
                                                        <ul className="list-disc pl-4 mb-2">{children}</ul>
                                                    ),
                                                    ol: ({ children }) => (
                                                        <ol className="list-decimal pl-4 mb-2">{children}</ol>
                                                    ),
                                                    li: ({ children }) => (
                                                        <li className="mb-1">{children}</li>
                                                    ),
                                                }}
                                            >
                                                {displayContent}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        <p className="text-base whitespace-pre-wrap font-[family-name:var(--font-work-sans)]">{displayContent}</p>
                                    )}
                                    {showUploadButton && (
                                        <Button
                                            onClick={() => setShowUploadModal(true)}
                                            className="mt-2 bg-[#de5e48] hover:bg-[#de5e48]/90 text-white"
                                        >
                                            <FontAwesomeIcon icon={faUpload} className="mr-2 size-4" />
                                            Upload Policy Document
                                        </Button>
                                    )}
                                </div>
                                {message.role === "user" && (
                                    <div className="shrink-0">
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={user?.user_metadata?.avatar_url} alt="User" />
                                            <AvatarFallback className="bg-[#de5e48] text-white text-xs">
                                                {getUserInitials()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {isLoading && (
                        <div className="flex items-start gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-lg bg-muted mr-auto w-fit max-w-[90%] sm:max-w-[80%]">
                            <div className="shrink-0">
                                <Image
                                    src="/sam-head-logo.png"
                                    alt="Sam"
                                    width={32}
                                    height={32}
                                    className="rounded-full object-contain"
                                />
                            </div>
                            <div className="flex flex-col gap-1 justify-center">
                                {isUploadingPolicy ? (
                                    <div className="flex flex-col gap-1">
                                        <p className="text-sm text-muted-foreground animate-pulse">
                                            Analyzing your policy document...
                                        </p>
                                        <div className="flex gap-1">
                                            <span className="animate-bounce text-xs text-[#de5e48]" style={{ animationDelay: "0ms" }}>●</span>
                                            <span className="animate-bounce text-xs text-[#de5e48]" style={{ animationDelay: "150ms" }}>●</span>
                                            <span className="animate-bounce text-xs text-[#de5e48]" style={{ animationDelay: "300ms" }}>●</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-1">
                                        <span className="animate-bounce text-sm" style={{ animationDelay: "0ms" }}>●</span>
                                        <span className="animate-bounce text-sm" style={{ animationDelay: "150ms" }}>●</span>
                                        <span className="animate-bounce text-sm" style={{ animationDelay: "300ms" }}>●</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            )}

            <div className={cn(
                "relative z-10 flex flex-col w-full mx-auto max-w-2xl content-center px-2 sm:px-0",
                messages.length > 0 && "mt-auto"
            )}>
                <form
                    className="overflow-visible rounded-2xl border border-[#333333]/10 p-3 transition-colors duration-200 focus-within:border-[#de5e48]/30 bg-[hsl(0_0%_98%)] shadow-sm"
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onSubmit={handleSubmit}
                >
                    {attachedFiles.length > 0 && (
                        <div className="relative flex w-fit items-center gap-2 mb-2 overflow-hidden">
                            {attachedFiles.map((file) => (
                                <Badge
                                    variant="outline"
                                    className="group relative h-6 max-w-30 cursor-pointer overflow-hidden text-[13px] transition-colors hover:bg-accent px-0"
                                    key={file.id}
                                >
                                    <span className="flex h-full items-center gap-1.5 overflow-hidden pl-1 font-normal">
                                        <div className="relative flex h-4 min-w-4 items-center justify-center">
                                            {file.preview ? (
                                                <Image
                                                    alt={file.name}
                                                    className="absolute inset-0 h-4 w-4 rounded border object-cover"
                                                    src={file.preview}
                                                    width={16}
                                                    height={16}
                                                />
                                            ) : (
                                                <FontAwesomeIcon icon={faPaperclip} className="opacity-60 size-3" />
                                            )}
                                        </div>
                                        <span className="inline overflow-hidden truncate pr-1.5 transition-all">
                                            {file.name}
                                        </span>
                                    </span>
                                    <button
                                        className="absolute right-1 z-10 rounded-sm p-0.5 text-muted-foreground opacity-0 focus-visible:bg-accent focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-background group-hover:opacity-100"
                                        onClick={() => handleRemoveFile(file.id)}
                                        type="button"
                                    >
                                        <FontAwesomeIcon icon={faXmark} className="size-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}
                    {selectedPolicy && (
                        <div className="flex items-center gap-2 mb-2 px-2">
                            <Badge
                                variant="secondary"
                                className="group relative h-7 cursor-pointer overflow-hidden text-xs transition-colors hover:bg-[#de5e48]/20 bg-[#de5e48]/10 border-[#de5e48]/20 pr-7 font-[family-name:var(--font-work-sans)]"
                            >
                                <span className="flex h-full items-center gap-1.5 overflow-hidden font-normal">
                                    <FontAwesomeIcon icon={faFileLines} className="text-[#de5e48] size-3" />
                                    <span className="text-foreground">
                                        Using {getPolicyDisplayName(selectedPolicy.policyType)}
                                    </span>
                                </span>
                                <button
                                    className="absolute right-1.5 z-10 rounded-sm p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                                    onClick={() => setSelectedPolicy(null)}
                                    type="button"
                                >
                                    <FontAwesomeIcon icon={faXmark} className="size-3" />
                                </button>
                            </Badge>
                        </div>
                    )}
                    <Textarea
                        ref={textareaRef}
                        className="max-h-50 min-h-14 resize-none rounded-none border-none bg-transparent! p-0 pl-2 pt-1 text-base md:text-base shadow-none focus-visible:border-transparent focus-visible:ring-0 font-[family-name:var(--font-work-sans)] placeholder:text-base"
                        onChange={handleTextareaChange}
                        onKeyDown={handleKeyDown}
                        placeholder="What can I help you with?"
                        value={prompt}
                    />

                    <div className="flex items-center gap-1">
                        <div className="flex items-end gap-0.5 sm:gap-1">
                            <input
                                className="sr-only"
                                multiple
                                onChange={handleFileSelect}
                                ref={fileInputRef}
                                type="file"
                            />

                            <DropdownMenu>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                className="ml-[-2px] h-7 w-7 rounded-md hover:bg-[#333333]/5 transition-colors"
                                                size="icon"
                                                type="button"
                                                variant="ghost"
                                            >
                                                <FontAwesomeIcon icon={faPlus} className="text-[#de5e48] size-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent
                                        side="top"
                                        sideOffset={4}
                                        className="bg-[#333333] text-[#f7f6f3] font-[family-name:var(--font-work-sans)]"
                                    >
                                        Add
                                    </TooltipContent>
                                </Tooltip>
                                <DropdownMenuContent
                                    align="start"
                                    className="rounded-2xl p-1.5 border-[#333333]/10 shadow-lg bg-[hsl(0_0%_98%)] font-[family-name:var(--font-work-sans)]"
                                >
                                    <DropdownMenuItem
                                        className="cursor-pointer hover:bg-[#333333]/5 focus:bg-[#333333]/5 rounded-lg"
                                        onClick={() => setShowUploadModal(true)}
                                    >
                                        <FontAwesomeIcon icon={faUpload} className="text-[#de5e48] size-3 mr-2" />
                                        Upload Policy Document
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="cursor-pointer hover:bg-[#333333]/5 focus:bg-[#333333]/5 rounded-lg"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <FontAwesomeIcon icon={faPaperclip} className="text-[#de5e48] size-3 mr-2" />
                                        Attach Files
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="cursor-pointer hover:bg-[#333333]/5 focus:bg-[#333333]/5 rounded-lg"
                                        onClick={handlePasteFromClipboard}
                                    >
                                        <FontAwesomeIcon icon={faClipboard} className="text-[#de5e48] size-3 mr-2" />
                                        Paste from Clipboard
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenu>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                className={cn(
                                                    "h-7 w-7 rounded-md hover:bg-[#333333]/5 transition-colors",
                                                    selectedPolicy && "bg-[#de5e48]/10"
                                                )}
                                                size="icon"
                                                type="button"
                                                variant="ghost"
                                            >
                                                <FontAwesomeIcon icon={faFileLines} className="text-[#de5e48] size-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent
                                        side="top"
                                        sideOffset={4}
                                        className="bg-[#333333] text-[#f7f6f3] font-[family-name:var(--font-work-sans)]"
                                    >
                                        {selectedPolicy
                                            ? getPolicyDisplayName(selectedPolicy.policyType)
                                            : "Select Policy"}
                                    </TooltipContent>
                                </Tooltip>
                                <DropdownMenuContent
                                    align="start"
                                    className="w-56 rounded-2xl p-1.5 border-[#333333]/10 shadow-lg bg-[hsl(0_0%_98%)] font-[family-name:var(--font-work-sans)]"
                                >
                                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                        Select a policy for context
                                    </div>
                                    {isLoadingPolicies ? (
                                        <div className="px-2 py-3 text-center">
                                            <span className="text-xs text-muted-foreground">Loading policies...</span>
                                        </div>
                                    ) : userPolicies.length === 0 ? (
                                        <div className="px-2 py-3 text-center">
                                            <p className="text-xs text-muted-foreground mb-2">No policies uploaded yet</p>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-xs h-7"
                                                onClick={() => setShowUploadModal(true)}
                                            >
                                                <FontAwesomeIcon icon={faUpload} className="mr-1.5 size-3" />
                                                Upload Policy
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            {selectedPolicy && (
                                                <DropdownMenuItem
                                                    className="cursor-pointer hover:bg-[#333333]/5 focus:bg-[#333333]/5 rounded-lg text-muted-foreground"
                                                    onClick={() => setSelectedPolicy(null)}
                                                >
                                                    <FontAwesomeIcon icon={faXmark} className="size-3 mr-2" />
                                                    Clear selection
                                                </DropdownMenuItem>
                                            )}
                                            {userPolicies.map((policy) => (
                                                <DropdownMenuItem
                                                    key={policy.policyType}
                                                    className={cn(
                                                        "cursor-pointer hover:bg-[#333333]/5 focus:bg-[#333333]/5 rounded-lg",
                                                        selectedPolicy?.policyType === policy.policyType && "bg-[#de5e48]/10"
                                                    )}
                                                    onClick={() => setSelectedPolicy(policy)}
                                                >
                                                    <div className="flex flex-col gap-0.5 w-full">
                                                        <div className="flex items-center">
                                                            <FontAwesomeIcon icon={faFileLines} className="text-[#de5e48] size-3 mr-2" />
                                                            <span className="font-medium">{getPolicyDisplayName(policy.policyType)}</span>
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground pl-5 truncate">
                                                            {policy.carrier}
                                                        </span>
                                                    </div>
                                                </DropdownMenuItem>
                                            ))}
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        className="h-7 w-7 rounded-md bg-[#de5e48] hover:bg-[#de5e48]/90 disabled:opacity-50"
                                        disabled={!prompt.trim() || isLoading}
                                        size="icon"
                                        type="submit"
                                        variant="default"
                                    >
                                        <FontAwesomeIcon icon={faArrowUp} className="text-[#f7f6f3] size-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent
                                    side="top"
                                    sideOffset={4}
                                    className="bg-[#333333] text-[#f7f6f3] font-[family-name:var(--font-work-sans)]"
                                >
                                    Send
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </div>

                    <div
                        className={cn(
                            "absolute inset-0 flex items-center justify-center pointer-events-none z-20 rounded-[inherit] border border-border border-dashed bg-muted text-foreground text-sm transition-opacity duration-200",
                            isDragOver ? "opacity-100" : "opacity-0"
                        )}
                    >
                        <span className="flex w-full items-center justify-center gap-1 font-medium">
                            <FontAwesomeIcon icon={faPlusCircle} className="min-w-4 size-4" />
                            Drop files here to add as attachments
                        </span>
                    </div>
                </form>
            </div>

            {/* Hidden file input for policy upload */}
            <input
                className="sr-only"
                accept="image/*,application/pdf"
                onChange={handlePolicyFileSelect}
                ref={policyFileInputRef}
                type="file"
            />

            {/* Policy Upload Modal */}
            {showUploadModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onClick={() => setShowUploadModal(false)}
                >
                    <div
                        className="relative w-full max-w-lg bg-white rounded-lg shadow-lg p-4 sm:p-6 max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowUploadModal(false)}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100"
                        >
                            <FontAwesomeIcon icon={faXmark} className="size-5" />
                        </button>

                        <h2 className="text-xl font-semibold mb-2">Upload Policy Document</h2>
                        <p className="text-muted-foreground text-sm mb-6">
                            Upload your insurance documents so I can review your coverage. You can upload:
                        </p>

                        <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <FontAwesomeIcon icon={faCamera} className="text-[#de5e48] size-5" />
                                <div>
                                    <p className="font-medium text-sm">Photo of Insurance Card</p>
                                    <p className="text-xs text-muted-foreground">Take a photo of your insurance ID card</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <FontAwesomeIcon icon={faFileLines} className="text-[#de5e48] size-5" />
                                <div>
                                    <p className="font-medium text-sm">Declarations Page</p>
                                    <p className="text-xs text-muted-foreground">The summary page of your policy</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <FontAwesomeIcon icon={faPaperclip} className="text-[#de5e48] size-5" />
                                <div>
                                    <p className="font-medium text-sm">Policy PDF</p>
                                    <p className="text-xs text-muted-foreground">Your full policy document</p>
                                </div>
                            </div>
                        </div>

                        <div
                            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#de5e48] transition-colors cursor-pointer"
                            onClick={() => policyFileInputRef.current?.click()}
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.add('border-[#de5e48]', 'bg-[#de5e48]/5');
                            }}
                            onDragLeave={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.remove('border-[#de5e48]', 'bg-[#de5e48]/5');
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.remove('border-[#de5e48]', 'bg-[#de5e48]/5');
                                const files = e.dataTransfer.files;
                                if (files && files.length > 0) {
                                    handlePolicyUpload(files[0]);
                                }
                            }}
                        >
                            <FontAwesomeIcon icon={faUpload} className="text-[#de5e48] size-8 mb-3" />
                            <p className="font-medium">Click to upload or drag and drop</p>
                            <p className="text-sm text-muted-foreground mt-1">PDF, JPG, PNG, or HEIC (max 20MB)</p>
                        </div>

                        <p className="text-xs text-center text-muted-foreground mt-4">
                            Your documents are processed securely and used only to analyze your coverage.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
