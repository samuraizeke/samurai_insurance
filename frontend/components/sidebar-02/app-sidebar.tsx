"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faComment } from "@fortawesome/free-solid-svg-icons";
import { Logo } from "@/components/sidebar-02/logo";
import type { Route } from "./nav-main";
import DashboardNavigation from "@/components/sidebar-02/nav-main";
import { NotificationsPopover } from "@/components/sidebar-02/nav-notifications";
import { UserMenu } from "@/components/sidebar-02/user-menu";

const sampleNotifications = [
  {
    id: "1",
    avatar: "/avatars/01.png",
    fallback: "OM",
    text: "New order received.",
    time: "10m ago",
  },
  {
    id: "2",
    avatar: "/avatars/02.png",
    fallback: "JL",
    text: "Server upgrade completed.",
    time: "1h ago",
  },
  {
    id: "3",
    avatar: "/avatars/03.png",
    fallback: "HH",
    text: "New user signed up.",
    time: "2h ago",
  },
];

const chatRoutes: Route[] = [
  {
    id: "new-chat",
    title: "New Chat",
    icon: <FontAwesomeIcon icon={faPlus} className="size-4" />,
    link: "#",
  },
  {
    id: "chats",
    title: "Chats",
    icon: <FontAwesomeIcon icon={faComment} className="size-4" />,
    link: "#",
    subs: [
      {
        title: "Insurance Quote Request",
        link: "#",
      },
      {
        title: "Policy Coverage Question",
        link: "#",
      },
      {
        title: "Claim Status Inquiry",
        link: "#",
      },
    ],
  },
];


export function DashboardSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader
        className={cn(
          "flex md:pt-3.5",
          isCollapsed
            ? "flex-row items-center justify-between gap-y-4 md:flex-col md:items-start md:justify-start"
            : "flex-row items-center justify-between"
        )}
      >
        <div className="flex items-center">
          <Logo collapsed={isCollapsed} />
        </div>

        <motion.div
          key={isCollapsed ? "header-collapsed" : "header-expanded"}
          className={cn(
            "flex items-center gap-2",
            isCollapsed ? "flex-row md:flex-col-reverse" : "flex-row"
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <NotificationsPopover notifications={sampleNotifications} />
          <SidebarTrigger />
        </motion.div>
      </SidebarHeader>
      <SidebarContent className="gap-4 px-2 py-4">
        <DashboardNavigation routes={chatRoutes} />
      </SidebarContent>
      <SidebarFooter className="px-2">
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
