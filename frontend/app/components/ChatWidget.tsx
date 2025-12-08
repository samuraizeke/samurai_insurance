// frontend/components/ChatWidget.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    faSliders,
    faArrowUp,
    faPlusCircle,
    faClipboard,
    faHistory,
    faPaperclip,
    faPlay,
    faPlus,
    faMagic,
    faFileLines,
    faXmark,
    faCamera,
    faUpload,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    sendChatMessage,
    uploadPolicyDocument,
    createChatSession,
    getStoredSessionId,
    getChatHistory,
    clearStoredSession
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useChatContext } from "@/app/context/ChatContext";

interface AttachedFile {
    id: string;
    name: string;
    file: File;
    preview?: string;
}

interface Message {
    id: string;
    content: string;
    role: "user" | "assistant";
    timestamp: Date;
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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const policyFileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const sessionInitialized = useRef(false);

    const [settings, setSettings] = useState({
        autoComplete: true,
        streaming: false,
        showHistory: false,
    });

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

    // Function to start a new conversation
    const startNewConversation = useCallback(async () => {
        if (!user?.id) return;

        // Clear current session
        clearStoredSession();
        setMessages([]);
        setDbSessionId(null);
        setCurrentSessionId(null);

        // Create new session
        const session = await createChatSession(user.id);
        if (session) {
            setDbSessionId(session.sessionId);
            setCurrentSessionId(session.sessionId);
            setSessionId(`session_${Date.now()}_${Math.random().toString(36).substring(7)}`);
            sessionInitialized.current = true; // Mark as initialized with new session
            console.log('🆕 Started new conversation:', session.sessionId);
            // Refresh recent sessions in sidebar
            loadRecentSessions(user.id);
        } else {
            // If session creation failed, allow re-initialization on next attempt
            sessionInitialized.current = false;
            console.error('Failed to create new conversation');
        }
    }, [user?.id, setCurrentSessionId, loadRecentSessions]);

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

            // Add user message
            const userMessage: Message = {
                id: generateFileId(),
                content: userMessageContent,
                role: "user",
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, userMessage]);
            setPrompt("");
            setAttachedFiles([]);
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

                // Call the backend API with session tracking
                const response = await sendChatMessage(
                    userMessageContent,
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
    const updateSetting = (key: keyof typeof settings, value: boolean) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
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
                    <p className="text-muted-foreground font-[family-name:var(--font-work-sans)]">Loading your conversation...</p>
                </div>
            ) : messages.length === 0 ? (
                <div className="flex items-center justify-center gap-4 mb-6 max-w-2xl w-full mx-auto">
                    <Image
                        src="/sam-body-logo.png"
                        alt="Sam"
                        width={56}
                        height={56}
                        className="object-contain"
                    />
                    <h1 className="text-pretty text-center font-heading font-semibold text-[29px] text-foreground tracking-tighter sm:text-[32px] md:text-[46px]">
                        {getUserFirstName()
                            ? `${getTimeBasedGreeting()}, ${getUserFirstName()}`
                            : "How can I help you today?"}
                    </h1>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto pb-4 space-y-4 max-w-2xl w-full mx-auto scrollbar-hide">
                    {messages.map((message) => {
                        const showUploadButton = hasUploadMarker(message.content);
                        const displayContent = showUploadButton ? removeUploadMarker(message.content) : message.content;

                        return (
                            <div
                                key={message.id}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-2 rounded-lg w-fit max-w-[80%]",
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
                                    <p className="text-base whitespace-pre-wrap font-[family-name:var(--font-work-sans)]">{displayContent}</p>
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
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={user?.user_metadata?.avatar_url} alt="User" />
                                            <AvatarFallback className="bg-[#de5e48] text-white text-sm">
                                                {getUserInitials()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {isLoading && (
                        <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-muted mr-auto w-fit max-w-[80%]">
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
                "relative z-10 flex flex-col w-full mx-auto max-w-2xl content-center",
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
                    <Textarea
                        className="max-h-50 min-h-14 resize-none rounded-none border-none bg-transparent! p-0 pl-2 pt-1 text-base shadow-none focus-visible:border-transparent focus-visible:ring-0 font-[family-name:var(--font-work-sans)] placeholder:text-base"
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
                                <DropdownMenuContent
                                    align="start"
                                    className="max-w-xs rounded-2xl p-1.5 border-[#333333]/10 shadow-lg bg-[hsl(0_0%_98%)] font-[family-name:var(--font-work-sans)]"
                                >
                                    <DropdownMenuGroup className="space-y-1">
                                        <DropdownMenuItem
                                            className="rounded-lg text-xs hover:bg-[#333333]/5 focus:bg-[#333333]/5 cursor-pointer"
                                            onClick={() => setShowUploadModal(true)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <FontAwesomeIcon icon={faUpload} className="text-[#de5e48] size-4" />
                                                <span>Upload Policy Document</span>
                                            </div>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="rounded-lg text-xs hover:bg-[#333333]/5 focus:bg-[#333333]/5 cursor-pointer"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <div className="flex items-center gap-2">
                                                <FontAwesomeIcon icon={faPaperclip} className="text-[#de5e48] size-4" />
                                                <span>Attach Files</span>
                                            </div>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="rounded-lg text-xs hover:bg-[#333333]/5 focus:bg-[#333333]/5 cursor-pointer">
                                            <div className="flex items-center gap-2">
                                                <FontAwesomeIcon icon={faClipboard} className="text-[#de5e48] size-4" />
                                                <span>Paste from Clipboard</span>
                                            </div>
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        className="size-7 rounded-md hover:bg-[#333333]/5 transition-colors"
                                        size="icon"
                                        type="button"
                                        variant="ghost"
                                    >
                                        <FontAwesomeIcon icon={faSliders} className="text-[#de5e48] size-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="start"
                                    className="w-48 rounded-2xl p-3 border-[#333333]/10 shadow-lg bg-[hsl(0_0%_98%)] font-[family-name:var(--font-work-sans)]"
                                >
                                    <DropdownMenuGroup className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <FontAwesomeIcon icon={faMagic} className="text-[#de5e48] size-4" />
                                                <Label className="text-xs">Auto-complete</Label>
                                            </div>
                                            <Switch
                                                checked={settings.autoComplete}
                                                className="scale-75"
                                                onCheckedChange={(value) =>
                                                    updateSetting("autoComplete", value)
                                                }
                                            />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <FontAwesomeIcon icon={faPlay} className="text-[#de5e48] size-4" />
                                                <Label className="text-xs">Streaming</Label>
                                            </div>
                                            <Switch
                                                checked={settings.streaming}
                                                className="scale-75"
                                                onCheckedChange={(value) =>
                                                    updateSetting("streaming", value)
                                                }
                                            />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <FontAwesomeIcon icon={faHistory} className="text-[#de5e48] size-4" />
                                                <Label className="text-xs">Show History</Label>
                                            </div>
                                            <Switch
                                                checked={settings.showHistory}
                                                className="scale-75"
                                                onCheckedChange={(value) =>
                                                    updateSetting("showHistory", value)
                                                }
                                            />
                                        </div>
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
                            <Button
                                className="h-7 w-7 rounded-md bg-[#de5e48] hover:bg-[#de5e48]/90 disabled:opacity-50"
                                disabled={!prompt.trim() || isLoading}
                                size="icon"
                                type="submit"
                                variant="default"
                            >
                                <FontAwesomeIcon icon={faArrowUp} className="text-[#f7f6f3] size-4" />
                            </Button>
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
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                    onClick={() => setShowUploadModal(false)}
                >
                    <div
                        className="relative w-full max-w-lg bg-white rounded-lg shadow-lg p-6"
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
