"use client";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/sidebar-02/app-sidebar";
import { ChatProvider } from "@/app/context/ChatContext";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase";

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f7f6f3]">
        <Loader2 className="h-8 w-8 animate-spin text-[#333333]" />
      </div>
    );
  }

  if (!user) {
    router.push("/login");
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
  const createdAt = user.created_at ? new Date(user.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }) : null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName || displayName }
      });

      if (error) {
        setError(error.message);
      } else {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ChatProvider>
      <SidebarProvider>
        <div className="relative flex h-screen w-full">
          <DashboardSidebar />
          <SidebarInset className="flex flex-col overflow-hidden">
            <header className="md:hidden shrink-0 bg-[#f7f6f3]">
              <div className="flex items-center justify-between h-14 px-4">
                <SidebarTrigger className="h-7 w-7 bg-[#333333] hover:bg-[#333333]/90 text-[#f7f6f3] hover:text-[#f7f6f3] rounded-full [&_svg]:size-4" />
                <Image
                  src="/wordmark-only-logo.png"
                  alt="Samurai Insurance"
                  width={180}
                  height={48}
                  className="h-12 w-auto object-contain"
                />
                <div className="size-7" />
              </div>
            </header>
            <main id="main-content" className="flex flex-1 flex-col items-center p-4 md:p-8 overflow-auto bg-[#f7f6f3]">
              <div className="w-full max-w-2xl space-y-6">
                <div>
                  <h1 className="text-3xl font-semibold font-heading tracking-tight">Profile</h1>
                  <p className="text-muted-foreground font-[family-name:var(--font-work-sans)] mt-1">
                    Manage your account information
                  </p>
                </div>

                <Card className="border-[#333333]/10 bg-[hsl(0_0%_98%)]">
                  <CardHeader>
                    <CardTitle className="font-heading">Your Profile</CardTitle>
                    <CardDescription className="font-[family-name:var(--font-work-sans)]">
                      View and update your personal information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={user.user_metadata?.avatar_url} alt={displayName} />
                        <AvatarFallback className="bg-[#333333] text-white text-xl font-bold font-[family-name:var(--font-alte-haas)]">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-lg font-semibold font-[family-name:var(--font-work-sans)]">{displayName}</p>
                        <p className="text-sm text-muted-foreground font-[family-name:var(--font-work-sans)]">{displayEmail}</p>
                        {createdAt && (
                          <p className="text-xs text-muted-foreground font-[family-name:var(--font-work-sans)] mt-1">
                            Member since {createdAt}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="h-px bg-[#333333]/10" />

                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="font-[family-name:var(--font-work-sans)]">
                          Full Name
                        </Label>
                        <Input
                          id="fullName"
                          placeholder={displayName}
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="h-11 font-[family-name:var(--font-work-sans)] border-[#333333]/10 bg-white rounded-lg"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="font-[family-name:var(--font-work-sans)]">
                          Email
                        </Label>
                        <Input
                          id="email"
                          value={displayEmail}
                          disabled
                          className="h-11 font-[family-name:var(--font-work-sans)] border-[#333333]/10 bg-[#f7f6f3] rounded-lg"
                        />
                        <p className="text-xs text-muted-foreground font-[family-name:var(--font-work-sans)]">
                          Email cannot be changed
                        </p>
                      </div>

                      {error && (
                        <div
                          role="alert"
                          className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-[family-name:var(--font-work-sans)]"
                        >
                          {error}
                        </div>
                      )}

                      {saveSuccess && (
                        <div
                          role="status"
                          className="p-3 rounded-lg bg-green-100 text-green-800 text-sm font-[family-name:var(--font-work-sans)]"
                        >
                          Profile updated successfully
                        </div>
                      )}

                      <Button
                        type="submit"
                        className="h-11 bg-[#333333] hover:bg-[#333333]/90 text-[#f7f6f3] font-bold font-[family-name:var(--font-work-sans)] rounded-lg"
                        disabled={isSaving || !fullName}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Saving...
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ChatProvider>
  );
}
