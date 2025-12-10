"use client";

import ChatWidget from '@/app/components/ChatWidget';
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/sidebar-02/app-sidebar";
import { ChatProvider } from "@/app/context/ChatContext";
import Image from "next/image";

function MobileHeader() {
    const { openMobile } = useSidebar();

    // Hide header when sidebar is open on mobile (trigger moves into sidebar)
    if (openMobile) return null;

    return (
        <header className="md:hidden shrink-0 bg-[#f7f6f3]">
            <div className="flex items-center justify-between h-14 px-4">
                <SidebarTrigger className="h-7 w-7 bg-[#333333] hover:bg-[#333333]/90 text-[#f7f6f3] hover:text-[#f7f6f3] rounded-md [&_svg]:size-4" />
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