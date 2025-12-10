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
        <header className="flex md:hidden items-center justify-between h-14 px-4 pt-4 shrink-0">
            <SidebarTrigger className="size-10 text-[#de5e48] hover:text-[#de5e48]/80 hover:bg-transparent [&_svg]:size-10" />
            <Image
                src="/wordmark-only-logo.png"
                alt="Samurai Insurance"
                width={180}
                height={48}
                className="h-12 w-auto object-contain"
            />
            <div className="size-10" /> {/* Spacer for centering */}
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