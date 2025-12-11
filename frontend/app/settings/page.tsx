"use client";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/sidebar-02/app-sidebar";
import { ChatProvider } from "@/app/context/ChatContext";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket, faTrash } from "@fortawesome/free-solid-svg-icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function SettingsPage() {
  const { user, signOut, isLoading } = useAuth();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch {
      setIsSigningOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch("/api/account/delete", {
        method: "DELETE",
      });

      if (response.ok) {
        await signOut();
      } else {
        setIsDeleting(false);
        setDeleteDialogOpen(false);
      }
    } catch {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
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
                  <h1 className="text-3xl font-semibold font-heading tracking-tight">Settings</h1>
                  <p className="text-muted-foreground font-[family-name:var(--font-work-sans)] mt-1">
                    Manage your account settings
                  </p>
                </div>

                <Card className="border-[#333333]/10 bg-[hsl(0_0%_98%)]">
                  <CardHeader>
                    <CardTitle className="font-heading">Account</CardTitle>
                    <CardDescription className="font-[family-name:var(--font-work-sans)]">
                      Manage your account access
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-[#f7f6f3]">
                      <div>
                        <p className="font-semibold font-[family-name:var(--font-work-sans)]">Sign out</p>
                        <p className="text-sm text-muted-foreground font-[family-name:var(--font-work-sans)]">
                          Sign out of your account on this device
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleSignOut}
                        disabled={isSigningOut}
                        className="gap-2 font-[family-name:var(--font-work-sans)] border-[#333333]/10 rounded-lg"
                      >
                        {isSigningOut ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FontAwesomeIcon icon={faRightFromBracket} className="size-4" />
                        )}
                        Sign out
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-destructive/20 bg-[hsl(0_0%_98%)]">
                  <CardHeader>
                    <CardTitle className="font-heading text-destructive">Danger Zone</CardTitle>
                    <CardDescription className="font-[family-name:var(--font-work-sans)]">
                      Irreversible actions for your account
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                      <div>
                        <p className="font-semibold font-[family-name:var(--font-work-sans)]">Delete account</p>
                        <p className="text-sm text-muted-foreground font-[family-name:var(--font-work-sans)]">
                          Permanently delete your account and all data
                        </p>
                      </div>
                      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="destructive"
                            className="gap-2 font-[family-name:var(--font-work-sans)] rounded-lg"
                          >
                            <FontAwesomeIcon icon={faTrash} className="size-4" />
                            Delete
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="border-[#333333]/10 bg-[hsl(0_0%_98%)]">
                          <DialogHeader>
                            <DialogTitle className="font-heading">Delete Account</DialogTitle>
                            <DialogDescription className="font-[family-name:var(--font-work-sans)]">
                              Are you sure you want to delete your account? This action cannot be undone.
                              All your data, including chat history and uploaded policies, will be permanently deleted.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                              variant="outline"
                              onClick={() => setDeleteDialogOpen(false)}
                              className="font-[family-name:var(--font-work-sans)] border-[#333333]/10 rounded-lg"
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={handleDeleteAccount}
                              disabled={isDeleting}
                              className="gap-2 font-[family-name:var(--font-work-sans)] rounded-lg"
                            >
                              {isDeleting ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <FontAwesomeIcon icon={faTrash} className="size-4" />
                                  Delete Account
                                </>
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
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
