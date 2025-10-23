'use client';

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { alteHaasGrotesk } from "@/lib/fonts";
import { RenewalGuardFeature } from "@/app/components/RenewalGuardFeature";
import { SmartShoppingFeature } from "@/app/components/SmartShoppingFeature";
import { OnDemandSupportFeature } from "@/app/components/OnDemandSupportFeature";
import { SiteHeader } from "@/app/components/SiteHeader";
import { HeroSection } from "@/app/components/HeroSection";
import { ProcessSection } from "@/app/components/ProcessSection";
import { FaqSection } from "@/app/components/FaqSection";
import { MobileWaitlistButton } from "@/app/components/MobileWaitlistButton";
import { SiteFooter } from "@/app/components/SiteFooter";
import { SuccessToast } from "@/app/components/SuccessToast";
import { useWaitlistSuccessToast } from "@/app/hooks/useWaitlistSuccessToast";

const WaitlistModal = dynamic(
  () => import("@/app/components/WaitlistModal"),
  {
    loading: () => null,
    ssr: false,
  }
);

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showSuccessToast, triggerSuccess } = useWaitlistSuccessToast();

  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleWaitlistSuccess = useCallback(() => {
    triggerSuccess();
  }, [triggerSuccess]);

  return (
    <div className={`${alteHaasGrotesk.className} min-h-screen flex flex-col`}>
      <SiteHeader onSignUp={handleOpenModal} />

      <main className="flex flex-1 flex-col">
        <HeroSection onJoinWaitlist={handleOpenModal} />
        <ProcessSection />
        <RenewalGuardFeature />
        <SmartShoppingFeature />
        <OnDemandSupportFeature />
        <FaqSection />
      </main>

      <MobileWaitlistButton onClick={handleOpenModal} />

      <SiteFooter />

      <SuccessToast
        visible={showSuccessToast}
        message="Thanks! You're on the waitlist."
      />

      <WaitlistModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleWaitlistSuccess}
      />
    </div>
  );
}
