"use client";

import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/sidebar-02/app-sidebar";
import { ChatProvider } from "@/app/context/ChatContext";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
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
import { deleteAccount } from "@/lib/api";

function MobileHeader() {
  const { openMobile } = useSidebar();

  // Hide header when sidebar is open (X is inside sidebar)
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
        <div className="size-7" />
      </div>
    </header>
  );
}

export default function SettingsPage() {
  const { user, signOut, isLoading } = useAuth();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f7f6f3]">
        <Loader2 className="h-8 w-8 animate-spin text-[#333333]" />
      </div>
    );
  }

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch {
      setIsSigningOut(false);
    }
  };

  const handleDeleteDialogClose = (open: boolean) => {
    if (!open) {
      // Reset state when closing
      setDeleteStep(1);
      setConfirmText("");
      setDeleteError(null);
    }
    setDeleteDialogOpen(open);
  };

  const handleContinueToDelete = () => {
    setDeleteStep(2);
    setDeleteError(null);
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== "DELETE") return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const result = await deleteAccount();

      if (result.success) {
        // Account deleted successfully - sign out and redirect
        await signOut();
      } else if (result.error === "User account not found") {
        // Account was already deleted - just sign out
        await signOut();
      } else {
        setDeleteError(result.error || "Failed to delete account. Please try again.");
        setIsDeleting(false);
      }
    } catch {
      setDeleteError("An unexpected error occurred. Please try again.");
      setIsDeleting(false);
    }
  };

  const isConfirmValid = confirmText === "DELETE";

  return (
    <ChatProvider>
      <SidebarProvider>
        <div className="relative flex h-screen w-full">
          <DashboardSidebar />
          <SidebarInset className="flex flex-col overflow-hidden">
            <MobileHeader />
            <main id="main-content" className="flex flex-1 flex-col items-center p-4 pb-20 md:p-8 md:pb-8 overflow-auto bg-[#f7f6f3]">
              <div className="w-full max-w-2xl space-y-6">
                <div>
                  <h1 className="text-3xl font-semibold font-heading tracking-tight">Settings</h1>
                  <p className="text-muted-foreground font-(family-name:--font-work-sans) mt-1">
                    Manage your account settings
                  </p>
                </div>

                <Card className="border-[#333333]/10 bg-[hsl(0_0%_98%)]">
                  <CardHeader>
                    <CardTitle className="font-heading">Account</CardTitle>
                    <CardDescription className="font-(family-name:--font-work-sans)">
                      Manage your account access
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <button
                        onClick={handleSignOut}
                        disabled={isSigningOut}
                        className="w-full flex items-center gap-3 p-4 rounded-2xl bg-[#f7f6f3] border border-[#333333]/5 hover:bg-[#333333]/5 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="w-10 h-10 bg-[#333333] rounded-full flex items-center justify-center shrink-0">
                          {isSigningOut ? (
                            <Loader2 className="h-5 w-5 animate-spin text-[#f7f6f3]" />
                          ) : (
                            <FontAwesomeIcon icon={faRightFromBracket} className="size-5 text-[#f7f6f3]" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold font-(family-name:--font-work-sans)">Sign out</p>
                          <p className="text-sm text-muted-foreground font-(family-name:--font-work-sans)">
                            Sign out of your account on this device
                          </p>
                        </div>
                      </button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-[#333333]/10 bg-[hsl(0_0%_98%)]">
                  <CardHeader>
                    <CardTitle className="font-heading">Danger Zone</CardTitle>
                    <CardDescription className="font-(family-name:--font-work-sans)">
                      Irreversible actions for your account
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Dialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogClose}>
                        <DialogTrigger asChild>
                          <button
                            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-[#f7f6f3] border border-[#333333]/5 hover:bg-red-50 transition-colors text-left"
                          >
                            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center shrink-0">
                              <FontAwesomeIcon icon={faTrash} className="size-5 text-white" />
                            </div>
                            <div>
                              <p className="font-semibold font-(family-name:--font-work-sans)">Delete account</p>
                              <p className="text-sm text-muted-foreground font-(family-name:--font-work-sans)">
                                Permanently delete your account and all data
                              </p>
                            </div>
                          </button>
                        </DialogTrigger>
                          <DialogContent className="border-[#333333]/10 bg-[hsl(0_0%_98%)]">
                            {deleteStep === 1 ? (
                              <>
                                <DialogHeader>
                                  <DialogTitle className="font-heading flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-red-600" />
                                    Delete Account
                                  </DialogTitle>
                                  <DialogDescription className="font-(family-name:--font-work-sans) text-left">
                                    This will permanently delete your account data.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="font-(family-name:--font-work-sans) text-sm text-muted-foreground">
                                  <p className="mb-2">This includes:</p>
                                  <ul className="list-disc list-inside space-y-1">
                                    <li>Your profile and personal information</li>
                                    <li>All uploaded insurance policies</li>
                                    <li>Chat history and conversations</li>
                                    <li>All insurance quotes and claims data</li>
                                  </ul>
                                  <p className="mt-3 font-medium text-red-600">
                                    This action cannot be undone.
                                  </p>
                                </div>
                                <DialogFooter className="gap-2 sm:gap-0">
                                  <Button
                                    variant="outline"
                                    onClick={() => handleDeleteDialogClose(false)}
                                    className="font-(family-name:--font-work-sans) border-[#333333]/10 rounded-full"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={handleContinueToDelete}
                                    className="gap-2 font-(family-name:--font-work-sans) rounded-full bg-red-600 hover:bg-red-700 text-white"
                                  >
                                    Continue
                                  </Button>
                                </DialogFooter>
                              </>
                            ) : (
                              <>
                                <DialogHeader>
                                  <DialogTitle className="font-heading">Confirm Deletion</DialogTitle>
                                  <DialogDescription className="font-(family-name:--font-work-sans)">
                                    To confirm, type <span className="font-mono font-bold text-red-600">DELETE</span> below:
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                  <Input
                                    type="text"
                                    placeholder="Type DELETE to confirm"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                                    className="font-mono text-center border-[#333333]/20 focus:border-red-500 focus:ring-red-500"
                                    autoComplete="off"
                                    autoFocus
                                  />
                                  {deleteError && (
                                    <p className="mt-2 text-sm text-red-600 font-(family-name:--font-work-sans)">
                                      {deleteError}
                                    </p>
                                  )}
                                </div>
                                <DialogFooter className="gap-2 sm:gap-0">
                                  <Button
                                    variant="outline"
                                    onClick={() => setDeleteStep(1)}
                                    disabled={isDeleting}
                                    className="font-(family-name:--font-work-sans) border-[#333333]/10 rounded-full"
                                  >
                                    Back
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={handleDeleteAccount}
                                    disabled={!isConfirmValid || isDeleting}
                                    className="gap-2 font-(family-name:--font-work-sans) rounded-full bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                                  >
                                    {isDeleting ? (
                                      <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Deleting...
                                      </>
                                    ) : (
                                      <>
                                        <FontAwesomeIcon icon={faTrash} className="size-4" />
                                        Delete My Account
                                      </>
                                    )}
                                  </Button>
                                </DialogFooter>
                              </>
                            )}
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
