"use client";

import ChatWidget from '@/app/components/ChatWidget';
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/sidebar-02/app-sidebar";

export default function ChatPage() {
    return (
        <SidebarProvider>
            <div className="relative flex h-screen w-full">
                <DashboardSidebar />
                <SidebarInset className="flex flex-col items-center justify-center p-4">
                    <ChatWidget />
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}