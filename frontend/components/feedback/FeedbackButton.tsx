"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCommentDots } from "@fortawesome/free-solid-svg-icons";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { FeedbackModal } from "./FeedbackModal";

interface FeedbackButtonProps {
  collapsed?: boolean;
  sessionId?: number | null;
}

export function FeedbackButton({ collapsed = false, sessionId }: FeedbackButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="Send Feedback"
            onClick={() => setModalOpen(true)}
            className={cn(
              "flex items-center rounded-lg px-2 transition-colors text-muted-foreground hover:bg-[#333333]/5 hover:text-foreground cursor-pointer",
              collapsed && "justify-center"
            )}
          >
            <span className="text-[#de5e48]">
              <FontAwesomeIcon icon={faCommentDots} className="size-4" />
            </span>
            {!collapsed && (
              <span className="ml-2 text-sm font-medium font-(family-name:--font-work-sans)">
                Feedback
              </span>
            )}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>

      <FeedbackModal open={modalOpen} onOpenChange={setModalOpen} sessionId={sessionId} />
    </>
  );
}
