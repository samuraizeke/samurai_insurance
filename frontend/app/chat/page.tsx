"use client";

import ChatWidget from '@/app/components/ChatWidget';
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/sidebar-02/app-sidebar";
import { ChatProvider, useChatContext } from "@/app/context/ChatContext";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import Image from "next/image";

function MobileHeader() {
    const { openMobile } = useSidebar();
    const { hasMessages, triggerNewChat } = useChatContext();

    // Hide trigger when sidebar is open (X is inside sidebar)
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
                {hasMessages ? (
                    <Button
                        className="h-7 w-7 rounded-full bg-[#333333] hover:bg-[#333333]/90"
                        size="icon"
                        variant="default"
                        onClick={triggerNewChat}
                        aria-label="New chat"
                    >
                        <FontAwesomeIcon icon={faPlus} className="text-[#f7f6f3] size-4" aria-hidden="true" />
                    </Button>
                ) : (
                    <div className="size-7" />
                )}
            </div>
        </header>
    );
}

export default function ChatPage() {
    return (
        <ChatProvider>
            <SidebarProvider>
                <div className="relative flex h-screen w-full">
                    <DashboardSidebar />
                    <SidebarInset className="flex flex-col overflow-hidden">
                        <MobileHeader />
                        <main id="main-content" className="flex flex-1 flex-col items-center justify-center p-4 overflow-hidden">
                            <h1 className="sr-only">Chat with Sam - Insurance Assistant</h1>
                            <ChatWidget />
                        </main>
                    </SidebarInset>
                </div>
            </SidebarProvider>
        </ChatProvider>
    );
}