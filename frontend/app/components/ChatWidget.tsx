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
import {
    IconAdjustmentsHorizontal,
    IconArrowUp,
    IconCirclePlus,
    IconClipboard,
    IconHistory,
    IconLink,
    IconPaperclip,
    IconPlayerPlay,
    IconPlus,
    IconSparkles,
    IconTemplate,
    IconX,
} from "@tabler/icons-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { sendChatMessage } from "@/lib/api";

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
    const [prompt, setPrompt] = useState("");
    const [isDragOver, setIsDragOver] = useState(false);
    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showCanopyModal, setShowCanopyModal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [settings, setSettings] = useState({
        autoComplete: true,
        streaming: false,
        showHistory: false,
    });

    const generateFileId = () => Math.random().toString(36).substring(7);

    // Check if message contains Canopy Connect marker
    const hasCanopyMarker = (content: string) => content.includes('[CANOPY_CONNECT]');
    const removeCanopyMarker = (content: string) => content.replace('[CANOPY_CONNECT]', '').trim();

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

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
                // Convert messages to the format expected by the backend
                const history = messages.map(msg => ({
                    role: msg.role,
                    content: msg.content,
                }));

                // Call the backend API
                const response = await sendChatMessage(userMessageContent, history);

                // Add assistant response
                const assistantMessage: Message = {
                    id: generateFileId(),
                    content: response,
                    role: "assistant",
                    timestamp: new Date(),
                };

                setMessages((prev) => [...prev, assistantMessage]);
            } catch (error) {
                console.error("Error sending message:", error);
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
            messages.length === 0 ? "justify-center gap-4" : "gap-4"
        )}>
            {messages.length === 0 ? (
                <>
                    <h1 className="text-pretty text-center font-heading font-semibold text-[29px] text-foreground tracking-tighter sm:text-[32px] md:text-[46px]">
                        How can I help you today?
                    </h1>
                    <h2 className="-my-5 pb-4 text-center text-xl text-muted-foreground font-[family-name:var(--font-work-sans)]">
                        Never Worry About Your Insurance Again.
                    </h2>
                </>
            ) : (
                <div className="flex-1 overflow-y-auto pb-4 space-y-4 max-w-2xl w-full mx-auto">
                    {messages.map((message) => {
                        const showCanopyButton = hasCanopyMarker(message.content);
                        const displayContent = showCanopyButton ? removeCanopyMarker(message.content) : message.content;

                        return (
                            <div
                                key={message.id}
                                className={cn(
                                    "flex gap-3 p-4 rounded-lg",
                                    message.role === "user"
                                        ? "bg-[#de5e48]/10 ml-auto max-w-[80%]"
                                        : "bg-muted mr-auto max-w-[80%]"
                                )}
                            >
                                <div className="flex flex-col gap-2 w-full">
                                    <p className="text-sm font-medium">
                                        {message.role === "user" ? "You" : "Sam"}
                                    </p>
                                    <p className="text-sm whitespace-pre-wrap">{displayContent}</p>
                                    {showCanopyButton && (
                                        <Button
                                            onClick={() => setShowCanopyModal(true)}
                                            className="mt-2 bg-[#de5e48] hover:bg-[#de5e48]/90 text-white"
                                        >
                                            Connect to Carrier
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {isLoading && (
                        <div className="flex gap-3 p-4 rounded-lg bg-muted mr-auto max-w-[80%]">
                            <div className="flex flex-col gap-1">
                                <p className="text-sm font-medium">Assistant</p>
                                <div className="flex gap-1">
                                    <span className="animate-bounce text-sm" style={{ animationDelay: "0ms" }}>●</span>
                                    <span className="animate-bounce text-sm" style={{ animationDelay: "150ms" }}>●</span>
                                    <span className="animate-bounce text-sm" style={{ animationDelay: "300ms" }}>●</span>
                                </div>
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
                    className="overflow-visible rounded-2xl border border-[#333333]/10 p-2 transition-colors duration-200 focus-within:border-[#de5e48]/30 bg-[hsl(0_0%_98%)] shadow-sm"
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
                                                <IconPaperclip className="opacity-60" size={12} />
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
                                        <IconX size={12} />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}
                    <Textarea
                        className="max-h-50 min-h-12 resize-none rounded-none border-none bg-transparent! p-0 text-sm shadow-none focus-visible:border-transparent focus-visible:ring-0 font-[family-name:var(--font-work-sans)]"
                        onChange={handleTextareaChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask Sam"
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
                                        className="ml-[-2px] h-7 w-7 rounded-md"
                                        size="icon"
                                        type="button"
                                        variant="ghost"
                                    >
                                        <IconPlus size={16} className="text-[#de5e48]" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="start"
                                    className="max-w-xs rounded-2xl p-1.5 border-[#333333]/10 shadow-lg bg-[hsl(0_0%_98%)] font-[family-name:var(--font-work-sans)]"
                                >
                                    <DropdownMenuGroup className="space-y-1">
                                        <DropdownMenuItem
                                            className="rounded-[calc(1rem-6px)] text-xs"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <div className="flex items-center gap-2">
                                                <IconPaperclip className="text-[#de5e48]" size={16} />
                                                <span>Attach Files</span>
                                            </div>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="rounded-[calc(1rem-6px)] text-xs">
                                            <div className="flex items-center gap-2">
                                                <IconLink className="text-[#de5e48]" size={16} />
                                                <span>Import from URL</span>
                                            </div>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="rounded-[calc(1rem-6px)] text-xs">
                                            <div className="flex items-center gap-2">
                                                <IconClipboard className="text-[#de5e48]" size={16} />
                                                <span>Paste from Clipboard</span>
                                            </div>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="rounded-[calc(1rem-6px)] text-xs">
                                            <div className="flex items-center gap-2">
                                                <IconTemplate className="text-[#de5e48]" size={16} />
                                                <span>Use Template</span>
                                            </div>
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        className="size-7 rounded-md"
                                        size="icon"
                                        type="button"
                                        variant="ghost"
                                    >
                                        <IconAdjustmentsHorizontal size={16} className="text-[#de5e48]" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="start"
                                    className="w-48 rounded-2xl p-3 border-[#333333]/10 shadow-lg bg-[hsl(0_0%_98%)] font-[family-name:var(--font-work-sans)]"
                                >
                                    <DropdownMenuGroup className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <IconSparkles className="text-[#de5e48]" size={16} />
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
                                                <IconPlayerPlay className="text-[#de5e48]" size={16} />
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
                                                <IconHistory className="text-[#de5e48]" size={16} />
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
                                <IconArrowUp size={16} className="text-[#f7f6f3]" />
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
                            <IconCirclePlus className="min-w-4" size={16} />
                            Drop files here to add as attachments
                        </span>
                    </div>
                </form>
            </div>

            {/* Canopy Connect Modal */}
            {showCanopyModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                    onClick={() => setShowCanopyModal(false)}
                >
                    <div
                        className="relative w-full max-w-4xl h-[80vh] bg-white rounded-lg shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowCanopyModal(false)}
                            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/90 hover:bg-white shadow-md"
                        >
                            <IconX size={20} />
                        </button>
                        <iframe
                            src="https://app.usecanopy.com/c/samurai-insurance"
                            className="w-full h-full rounded-lg"
                            title="Canopy Connect"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}