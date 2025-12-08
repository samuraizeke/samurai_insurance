"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import * as React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSort, faPlus } from "@fortawesome/free-solid-svg-icons";

type Team = {
  name: string;
  logo: React.ElementType;
  plan: string;
};

export function TeamSwitcher({ teams }: { teams: Team[] }) {
  const { isMobile } = useSidebar();
  const [activeTeam, setActiveTeam] = React.useState(teams[0]);

  if (!activeTeam) return null;

  const LogoComponent = activeTeam.logo;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="hover:bg-[#333333]/5 data-[state=open]:bg-[#333333]/10 data-[state=open]:text-foreground transition-colors"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-background text-foreground overflow-hidden">
                <LogoComponent collapsed={true} className="size-8" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold font-[family-name:var(--font-work-sans)]">
                  {activeTeam.name}
                </span>
                <span className="truncate text-xs font-[family-name:var(--font-work-sans)]">{activeTeam.plan}</span>
              </div>
              <FontAwesomeIcon icon={faSort} className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg mb-4"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Teams
            </DropdownMenuLabel>
            {teams.map((team, index) => {
              const TeamLogo = team.logo;
              return (
                <DropdownMenuItem
                  key={team.name}
                  onClick={() => setActiveTeam(team)}
                  className="gap-2 p-2 hover:bg-[#333333]/5 focus:bg-[#333333]/5 rounded-lg cursor-pointer"
                >
                  <div className="flex size-6 items-center justify-center rounded-sm border overflow-hidden">
                    <TeamLogo collapsed={true} className="size-6" />
                  </div>
                  <span className="font-[family-name:var(--font-work-sans)]">{team.name}</span>
                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2 hover:bg-[#333333]/5 focus:bg-[#333333]/5 rounded-lg cursor-pointer">
              <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                <FontAwesomeIcon icon={faPlus} className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground font-[family-name:var(--font-work-sans)]">Add team</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
