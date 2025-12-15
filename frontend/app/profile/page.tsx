"use client";

import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/sidebar-02/app-sidebar";
import { ChatProvider } from "@/app/context/ChatContext";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase";
import { getUserPolicies, deleteUserPolicy, renameUserPolicy, UserPolicy, PolicyType } from "@/lib/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faPen, faPlus, faCar, faHome, faUmbrella, faHeart, faHospital, faFile, faBuilding } from "@fortawesome/free-solid-svg-icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";

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

const policyTypeIcons: Record<PolicyType, typeof faCar> = {
  auto: faCar,
  home: faHome,
  renters: faBuilding,
  umbrella: faUmbrella,
  life: faHeart,
  health: faHospital,
  other: faFile,
};

const policyTypeLabels: Record<PolicyType, string> = {
  auto: "Auto Insurance",
  home: "Home Insurance",
  renters: "Renters Insurance",
  umbrella: "Umbrella Insurance",
  life: "Life Insurance",
  health: "Health Insurance",
  other: "Other Insurance",
};

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Policy management state
  const [policies, setPolicies] = useState<UserPolicy[]>([]);
  const [policiesLoading, setPoliciesLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState<UserPolicy | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [policyToRename, setPolicyToRename] = useState<UserPolicy | null>(null);
  const [newCarrierName, setNewCarrierName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  const loadPolicies = useCallback(async () => {
    if (!user) return;
    setPoliciesLoading(true);
    try {
      const userPolicies = await getUserPolicies(user.id);
      setPolicies(userPolicies);
    } catch (err) {
      console.error("Error loading policies:", err);
    } finally {
      setPoliciesLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      loadPolicies();
    }
  }, [user, loadPolicies]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f7f6f3]">
        <Loader2 className="h-8 w-8 animate-spin text-[#333333]" />
      </div>
    );
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

  const handleDeletePolicy = async () => {
    if (!policyToDelete || !user) return;
    setIsDeleting(true);
    try {
      const success = await deleteUserPolicy(user.id, policyToDelete.policyType);
      if (success) {
        setPolicies(policies.filter(p => p.policyType !== policyToDelete.policyType));
        setDeleteDialogOpen(false);
        setPolicyToDelete(null);
      }
    } catch (err) {
      console.error("Error deleting policy:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRenamePolicy = async () => {
    if (!policyToRename || !user || !newCarrierName.trim()) return;
    setIsRenaming(true);
    try {
      const success = await renameUserPolicy(user.id, policyToRename.policyType, newCarrierName.trim());
      if (success) {
        setPolicies(policies.map(p =>
          p.policyType === policyToRename.policyType
            ? { ...p, carrier: newCarrierName.trim() }
            : p
        ));
        setRenameDialogOpen(false);
        setPolicyToRename(null);
        setNewCarrierName("");
      }
    } catch (err) {
      console.error("Error renaming policy:", err);
    } finally {
      setIsRenaming(false);
    }
  };

  const openDeleteDialog = (policy: UserPolicy) => {
    setPolicyToDelete(policy);
    setDeleteDialogOpen(true);
  };

  const openRenameDialog = (policy: UserPolicy) => {
    setPolicyToRename(policy);
    setNewCarrierName(policy.carrier);
    setRenameDialogOpen(true);
  };

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
                  <h1 className="text-3xl font-semibold font-heading tracking-tight">Profile</h1>
                  <p className="text-muted-foreground font-(family-name:--font-work-sans) mt-1">
                    Manage your account information
                  </p>
                </div>

                <Card className="border-[#333333]/10 bg-[hsl(0_0%_98%)]">
                  <CardHeader>
                    <CardTitle className="font-heading">Your Profile</CardTitle>
                    <CardDescription className="font-(family-name:--font-work-sans)">
                      View and update your personal information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={user.user_metadata?.avatar_url} alt={displayName} />
                        <AvatarFallback className="bg-[#333333] text-white text-xl font-bold font-(family-name:--font-alte-haas)">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-lg font-semibold font-(family-name:--font-work-sans)">{displayName}</p>
                        <p className="text-sm text-muted-foreground font-(family-name:--font-work-sans)">{displayEmail}</p>
                        {createdAt && (
                          <p className="text-xs text-muted-foreground font-(family-name:--font-work-sans) mt-1">
                            Member since {createdAt}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="h-px bg-[#333333]/10" />

                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="font-(family-name:--font-work-sans)">
                          Full Name
                        </Label>
                        <Input
                          id="fullName"
                          placeholder={displayName}
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="h-11 font-(family-name:--font-work-sans) border-[#333333]/10 bg-white rounded-lg"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="font-(family-name:--font-work-sans)">
                          Email
                        </Label>
                        <Input
                          id="email"
                          value={displayEmail}
                          disabled
                          className="h-11 font-(family-name:--font-work-sans) border-[#333333]/10 bg-[#f7f6f3] rounded-lg"
                        />
                        <p className="text-xs text-muted-foreground font-(family-name:--font-work-sans)">
                          Email cannot be changed
                        </p>
                      </div>

                      {error && (
                        <div
                          role="alert"
                          className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-(family-name:--font-work-sans)"
                        >
                          {error}
                        </div>
                      )}

                      {saveSuccess && (
                        <div
                          role="status"
                          className="p-3 rounded-lg bg-green-100 text-green-800 text-sm font-(family-name:--font-work-sans)"
                        >
                          Profile updated successfully
                        </div>
                      )}

                      <Button
                        type="submit"
                        className="h-11 bg-[#333333] hover:bg-[#333333]/90 text-[#f7f6f3] font-bold font-(family-name:--font-work-sans) rounded-lg"
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

                <Card className="border-[#333333]/10 bg-[hsl(0_0%_98%)]">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="font-heading">Your Policies</CardTitle>
                        <CardDescription className="font-(family-name:--font-work-sans)">
                          Manage your uploaded insurance policies
                        </CardDescription>
                      </div>
                      <Button
                        asChild
                        className="gap-2 bg-[#333333] hover:bg-[#333333]/90 text-[#f7f6f3] font-(family-name:--font-work-sans) rounded-lg"
                      >
                        <Link href="/chat">
                          <FontAwesomeIcon icon={faPlus} className="size-4" />
                          Add Policy
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {policiesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-[#333333]" />
                      </div>
                    ) : policies.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="mx-auto w-16 h-16 bg-[#333333]/5 rounded-full flex items-center justify-center mb-4">
                          <FontAwesomeIcon icon={faFile} className="size-6 text-[#333333]/40" />
                        </div>
                        <p className="text-muted-foreground font-(family-name:--font-work-sans)">
                          No policies uploaded yet
                        </p>
                        <p className="text-sm text-muted-foreground font-(family-name:--font-work-sans) mt-1">
                          Start a chat and upload your insurance documents
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {policies.map((policy) => (
                          <div
                            key={policy.policyType}
                            className="flex items-center justify-between p-4 rounded-lg bg-[#f7f6f3] border border-[#333333]/5"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-[#333333] rounded-lg flex items-center justify-center">
                                <FontAwesomeIcon
                                  icon={policyTypeIcons[policy.policyType]}
                                  className="size-5 text-[#f7f6f3]"
                                />
                              </div>
                              <div>
                                <p className="font-semibold font-(family-name:--font-work-sans)">
                                  {policyTypeLabels[policy.policyType]}
                                </p>
                                <p className="text-sm text-muted-foreground font-(family-name:--font-work-sans)">
                                  {policy.carrier}
                                </p>
                                <p className="text-xs text-muted-foreground font-(family-name:--font-work-sans)">
                                  {new Date(policy.uploadedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openRenameDialog(policy)}
                                className="h-8 w-8 hover:bg-[#333333]/10"
                                title="Rename carrier"
                              >
                                <FontAwesomeIcon icon={faPen} className="size-4 text-[#333333]" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeleteDialog(policy)}
                                className="h-8 w-8 hover:bg-red-50 text-destructive"
                                title="Delete policy"
                              >
                                <FontAwesomeIcon icon={faTrash} className="size-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </main>
          </SidebarInset>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="border-[#333333]/10 bg-[hsl(0_0%_98%)]">
            <DialogHeader>
              <DialogTitle className="font-heading">Delete Policy</DialogTitle>
              <DialogDescription className="font-(family-name:--font-work-sans)">
                Are you sure you want to delete your {policyToDelete && policyTypeLabels[policyToDelete.policyType].toLowerCase()}?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                className="font-(family-name:--font-work-sans) border-[#333333]/10 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeletePolicy}
                disabled={isDeleting}
                className="gap-2 font-(family-name:--font-work-sans) rounded-lg"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faTrash} className="size-4" />
                    Delete
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rename Dialog */}
        <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
          <DialogContent className="border-[#333333]/10 bg-[hsl(0_0%_98%)]">
            <DialogHeader>
              <DialogTitle className="font-heading">Rename Carrier</DialogTitle>
              <DialogDescription className="font-(family-name:--font-work-sans)">
                Update the carrier name for your {policyToRename && policyTypeLabels[policyToRename.policyType].toLowerCase()}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="carrierName" className="font-(family-name:--font-work-sans)">
                  Carrier Name
                </Label>
                <Input
                  id="carrierName"
                  value={newCarrierName}
                  onChange={(e) => setNewCarrierName(e.target.value)}
                  placeholder="e.g., State Farm, Allstate"
                  className="h-11 font-(family-name:--font-work-sans) border-[#333333]/10 bg-white rounded-lg"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setRenameDialogOpen(false)}
                className="font-(family-name:--font-work-sans) border-[#333333]/10 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRenamePolicy}
                disabled={isRenaming || !newCarrierName.trim()}
                className="gap-2 bg-[#333333] hover:bg-[#333333]/90 text-[#f7f6f3] font-(family-name:--font-work-sans) rounded-lg"
              >
                {isRenaming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarProvider>
    </ChatProvider>
  );
}
