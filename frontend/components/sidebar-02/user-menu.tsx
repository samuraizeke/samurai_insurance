"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSort, faGear, faRightFromBracket, faUser } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";

export function UserMenu() {
  const { isMobile } = useSidebar();
  const { user, signOut, isLoading } = useAuth();

  if (isLoading || !user) {
    return null;
  }

  const userInitials = user.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase() || "U";

  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const displayEmail = user.email || "";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="hover:bg-[#333333]/5 data-[state=open]:bg-[#333333]/10 data-[state=open]:text-foreground transition-colors"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.user_metadata?.avatar_url} alt={displayName} />
                <AvatarFallback className="bg-[#333333] text-white text-sm font-bold font-(family-name:--font-alte-haas)">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold font-(family-name:--font-work-sans)">
                  {displayName}
                </span>
                <span className="truncate text-xs text-muted-foreground font-(family-name:--font-work-sans)">
                  {displayEmail}
                </span>
              </div>
              <FontAwesomeIcon icon={faSort} className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-2xl p-1.5 border-[#333333]/10 shadow-xl bg-[hsl(0_0%_98%)] z-10000"
            align="end"
            side="top"
            sideOffset={8}
            collisionPadding={16}
          >
            <DropdownMenuLabel className="font-(family-name:--font-work-sans)">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">{displayEmail}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="gap-2 p-2 cursor-pointer hover:bg-[#333333]/5 focus:bg-[#333333]/5 rounded-lg">
              <Link href="/profile">
                <FontAwesomeIcon icon={faUser} className="size-4" />
                <span className="font-(family-name:--font-work-sans)">Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="gap-2 p-2 cursor-pointer hover:bg-[#333333]/5 focus:bg-[#333333]/5 rounded-lg">
              <Link href="/settings">
                <FontAwesomeIcon icon={faGear} className="size-4" />
                <span className="font-(family-name:--font-work-sans)">Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 p-2 cursor-pointer text-destructive focus:text-destructive hover:bg-red-50 focus:bg-red-50 rounded-lg"
              onClick={() => signOut()}
            >
              <FontAwesomeIcon icon={faRightFromBracket} className="size-4" />
              <span className="font-(family-name:--font-work-sans)">Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
