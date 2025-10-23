'use client';

import Image from "next/image";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { alteHaasGrotesk, workSans } from "@/lib/fonts";
import { RenewalGuardFeature } from "@/app/components/RenewalGuardFeature";
import { SmartShoppingFeature } from "@/app/components/SmartShoppingFeature";
import { OnDemandSupportFeature } from "@/app/components/OnDemandSupportFeature";

const faqItems = [
  {
    question: "Are you a marketplace?",
    answer: "No. We are your agent. We work for you from start to finish.",
  },
  {
    question: "Do I have to manage anything?",
    answer: "No. We handle the work and show you the choices. You approve.",
  },
  {
    question: "Will you make me switch carriers?",
    answer: "Only if it helps you. We explain why and you decide.",
  },
  {
    question: "Is my data sold?",
    answer:
      "No. We encrypt your documents in transit and at rest. We do not sell personal data.",
  },
  {
    question: "My renewal already started. Can you help?",
    answer: "Yes. We will flag what changed and give you a clear plan.",
  },
] as const;

const processSteps = [
  {
    number: "01",
    title: "UNDERSTAND",
    description:
      "When we invite you, answer a few simple questions. We learn what you need.",
  },
  {
    number: "02",
    title: "RECOMMEND",
    description:
      "We compare options and set up the policy that fits you best. You approve with one click.",
  },
  {
    number: "03",
    title: "CHECK",
    description:
      "Each year we shop again. If a better option appears, we tell you and handle the switch.",
  },
] as const;

const WaitlistModal = dynamic(
  () => import("@/app/components/WaitlistModal"),
  {
    loading: () => null,
    ssr: false,
  }
);

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);
  const processVideoRef = useRef<HTMLVideoElement | null>(null);
  const [openFaqs, setOpenFaqs] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }
    };
  }, []);
  useEffect(() => {
    const videos = [heroVideoRef.current, processVideoRef.current].filter(
      (video): video is HTMLVideoElement => Boolean(video)
    );
    const cleanups: Array<() => void> = [];

    videos.forEach((video) => {
      video.defaultMuted = true;
      video.muted = true;

      const attemptPlay = () => {
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {
            window.setTimeout(() => {
              video.play().catch(() => {
                // If autoplay is still blocked, the user will tap to play.
              });
            }, 150);
          });
        }
      };

      if (
        video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA ||
        video.readyState === HTMLMediaElement.HAVE_FUTURE_DATA
      ) {
        attemptPlay();
        return;
      }

      const handleLoaded = () => {
        video.removeEventListener("loadeddata", handleLoaded);
        video.removeEventListener("loadedmetadata", handleLoaded);
        attemptPlay();
      };

      video.addEventListener("loadeddata", handleLoaded);
      video.addEventListener("loadedmetadata", handleLoaded);
      cleanups.push(() => {
        video.removeEventListener("loadeddata", handleLoaded);
        video.removeEventListener("loadedmetadata", handleLoaded);
      });
    });

    return () => {
      cleanups.forEach((cleanup) => {
        cleanup();
      });
    };
  }, []);
  useEffect(() => {
    const video = processVideoRef.current;
    if (!video) {
      return;
    }

    const applyPlaybackRate = () => {
      video.playbackRate = 0.6;
    };

    applyPlaybackRate();
    video.addEventListener("loadedmetadata", applyPlaybackRate);
    video.addEventListener("loadeddata", applyPlaybackRate);

    return () => {
      video.removeEventListener("loadedmetadata", applyPlaybackRate);
      video.removeEventListener("loadeddata", applyPlaybackRate);
    };
  }, []);

  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);
  const handleWaitlistSuccess = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setShowSuccessToast(true);
    toastTimeoutRef.current = setTimeout(() => {
      setShowSuccessToast(false);
      toastTimeoutRef.current = null;
    }, 2000);
  }, []);

  const handleToggleFaq = useCallback((index: number) => {
    setOpenFaqs((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  return (
    <div className={`${alteHaasGrotesk.className} min-h-screen flex flex-col`}>
      <header className="sticky top-0 z-40 w-full bg-[#333333]">
        <div className="flex w-full flex-col items-center gap-4 px-6 py-8 text-center sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:px-16 sm:py-10 sm:text-left">
          <div className="flex items-center justify-center gap-4 sm:justify-start">
            <Image
              src="/SamuraiLogoOrange.png"
              alt="Samurai Insurance logo"
              width={64}
              height={32}
              priority
            />
            <span className="whitespace-nowrap text-lg font-bold uppercase text-[#f7f6f3] sm:text-2xl">
              Samurai Insurance
            </span>
          </div>
          <button
            className="hidden sm:inline-flex focus-outline-brand-sm rounded-full bg-[#de5e48] px-6 py-2 text-med font-bold text-[#f7f6f3] shadow-[0_3px_8px_rgba(222,94,72,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(222,94,72,0.24)]"
            onClick={handleOpenModal}
            type="button"
          >
            Sign Up
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="w-full px-12 pt-6 pb-16 sm:px-16 sm:pt-16 sm:pb-44">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-center">
            <div className="max-w-2xl text-center lg:flex-1 lg:max-w-none lg:text-left">
              <h1 className="font-bold leading-tight text-[#f7f6f3] text-4xl sm:text-5xl md:text-6xl lg:text-[64px] lg:leading-[1.05]">
                Never Worry About Your Insurance Again.
              </h1>
              <p
                className={`${workSans.className} mt-6 text-lg leading-relaxed text-[#f7f6f3] sm:text-xl`}
              >
                We handle everything on your car and home insurance so you can relax and save money. AI that shops for better rates, guides you through claims, and makes updates when you need it.
              </p>
              <button
                className="focus-outline-brand-lg mt-10 hidden items-center justify-center rounded-full bg-[#de5e48] px-8 py-3 text-lg font-bold text-[#f7f6f3] shadow-[0_4px_12px_rgba(222,94,72,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(222,94,72,0.27)] sm:flex mx-auto lg:mx-0"
                onClick={handleOpenModal}
                type="button"
              >
                Join the Waitlist
              </button>
            </div>
            <div className="w-full lg:flex-[2]">
              <div className="relative aspect-video w-full overflow-hidden rounded-3xl">
                <video
                  ref={heroVideoRef}
                  className="h-full w-full object-cover"
                  autoPlay
                  muted
                  playsInline
                  preload="metadata"
                  onEnded={(event) => event.currentTarget.pause()}
                  src="https://samuraiinsurancestorage.blob.core.windows.net/videos/out.mp4?sp=r&st=2025-10-17T20:30:19Z&se=2028-12-31T05:45:19Z&spr=https&sv=2024-11-04&sr=b&sig=PHRlMyRp0HKt09E62qHJ5fbNsrk2vQ0ZJeinMaIeE6o%3D"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </div>
        </section>
        <section className="relative isolate min-h-[calc(100vh-160px)] overflow-hidden lg:h-[min(900px,calc(100vh-80px))] lg:overflow-y-auto">
          <video
            ref={processVideoRef}
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            src="https://samuraiinsurancestorage.blob.core.windows.net/videos/traffic%20background.mp4?sp=r&st=2025-10-20T23:36:36Z&se=2027-12-31T08:51:36Z&spr=https&sv=2024-11-04&sr=b&sig=%2FI%2FI4hmtypmJof3J%2FP%2B0UNgVvpa%2B0HMKyiJg%2FrV3lPk%3D"
          >
            Your browser does not support the video tag.
          </video>
          <div
            className="absolute inset-0 bg-[#0f0f10]/70 mix-blend-multiply"
            aria-hidden="true"
          />
          <div className="relative mx-auto grid w-full max-w-7xl grid-cols-1 gap-12 px-4 pt-24 pb-16 sm:px-10 sm:py-32 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.25fr)] lg:items-start lg:gap-24">
            <div className="w-full text-center lg:col-start-2 lg:row-start-1 lg:flex lg:h-full lg:flex-col lg:items-end lg:justify-center lg:pl-6 lg:text-right">
              <p className="text-4xl font-bold leading-tight text-[#f7f6f3] sm:text-[56px] lg:max-w-lg lg:text-[64px] lg:leading-[1.08]">
                <span className="block whitespace-nowrap">Go from Worried</span>
                <span className="block">to Relieved</span>
              </p>
            </div>
            <ul className="flex flex-col gap-8 lg:col-start-1 lg:row-start-1">
              {processSteps.map((step) => (
                <li key={step.title}>
                  <div
                    tabIndex={0}
                    className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0f0f10]/40 px-7 py-8 transition duration-300 ease-out hover:border-[#f7f6f3]/40 hover:bg-[#0f0f10]/55 focus:outline-none focus-visible:border-[#f7f6f3]/40 focus-visible:ring-2 focus-visible:ring-[#f7f6f3]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                  >
                    <div className="flex flex-wrap items-baseline gap-4 sm:flex-nowrap sm:items-center sm:gap-7">
                      <span className="text-4xl font-bold text-[#de5e48] sm:text-6xl lg:text-7xl">
                        {step.number}
                      </span>
                      <span className="text-2xl font-bold uppercase tracking-wide text-[#f7f6f3] sm:text-4xl lg:text-5xl">
                        {step.title}
                      </span>
                    </div>
                    <div
                      className={`${workSans.className} max-h-none overflow-visible pt-6 text-lg leading-relaxed text-[#f7f6f3]/90 opacity-100 transition-all duration-300 ease-in-out sm:max-h-0 sm:overflow-hidden sm:pt-0 sm:opacity-0 sm:group-hover:max-h-48 sm:group-hover:pt-6 sm:group-hover:opacity-100 sm:group-focus-within:max-h-48 sm:group-focus-within:pt-6 sm:group-focus-within:opacity-100 sm:text-xl`}
                    >
                      <p>{step.description}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <RenewalGuardFeature />
        <SmartShoppingFeature />
        <OnDemandSupportFeature />
        <section className="w-full px-12 pb-16 pt-16 sm:px-16 sm:pb-36 sm:pt-20">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-20">
            <div className="lg:w-1/3">
              <h2 className="text-center text-[56px] font-bold tracking-tight text-[#f7f6f3] sm:text-[64px] lg:text-left">
                FAQ<span className="lowercase">s</span>
              </h2>
            </div>
            <div className="flex-1">
              <ul className="flex flex-col">
                {faqItems.map((faq, index) => {
                  const isOpen = openFaqs.has(index);
                  return (
                    <li
                      key={faq.question}
                      className="border-b border-[#de5e48]"
                    >
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-4 py-5 text-left text-xl font-bold text-[#f7f6f3] transition hover:text-[#ffb8a9] sm:text-2xl"
                        onClick={() => handleToggleFaq(index)}
                        aria-expanded={isOpen}
                        aria-controls={`faq-panel-${index}`}
                      >
                        <span>{faq.question}</span>
                        <span
                          className={`flex h-7 w-7 items-center justify-center text-2xl text-[#de5e48] transition-transform duration-300 ease-in-out origin-center ${isOpen ? "rotate-45" : "rotate-0"}`}
                          aria-hidden="true"
                        >
                          +
                        </span>
                      </button>
                      <div
                        id={`faq-panel-${index}`}
                        className={`${workSans.className} overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${isOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0"}`}
                        aria-hidden={!isOpen}
                      >
                        <p className="pb-6 pr-12 text-base text-[#f7f6f3]/90 sm:text-lg">
                          {faq.answer}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>
      </main>

      <button
        className="focus-outline-brand-lg fixed bottom-16 left-1/2 z-40 flex w-[calc(100%-3rem)] max-w-xs -translate-x-1/2 items-center justify-center rounded-full bg-[#de5e48] px-6 py-3 text-base font-bold text-[#f7f6f3] shadow-[0_8px_20px_rgba(222,94,72,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(222,94,72,0.32)] sm:hidden"
        onClick={handleOpenModal}
        type="button"
      >
        Join the Waitlist
      </button>

      <footer className="pt-8 pb-28 sm:pb-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className={`${workSans.className} text-sm text-[#f7f6f3]/80`}>
            © 2025 Samurai Insurance. All Rights Reserved.
          </p>
          <nav aria-label="Social media">
            <ul className="flex flex-wrap items-center justify-center gap-3">
              <li>
                <a
                  href="https://www.facebook.com/profile.php?id=61579597801044"
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Facebook"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#de5e48] transition hover:text-[#ffb8a9] hover:bg-[#de5e48]/15"
                >
                  <span className="sr-only">Facebook</span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="currentColor"
                  >
                    <path d="M22 12.07C22 6.476 17.523 2 11.93 2S1.86 6.476 1.86 12.07c0 4.97 3.657 9.09 8.438 9.87v-6.99H7.898v-2.88h2.4V9.845c0-2.37 1.422-3.677 3.6-3.677 1.043 0 2.134.186 2.134.186v2.35h-1.202c-1.185 0-1.556.738-1.556 1.49v1.79h2.65l-.423 2.88h-2.227v6.99c4.78-.78 8.437-4.9 8.437-9.87Z" />
                  </svg>
                </a>
              </li>
              <li>
                <a
                  href="https://www.instagram.com/samuraicodeai?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Instagram"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#de5e48] transition hover:text-[#ffb8a9] hover:bg-[#de5e48]/15"
                >
                  <span className="sr-only">Instagram</span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="currentColor"
                  >
                    <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9Z" />
                    <path d="M12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" />
                    <circle cx="17.5" cy="6.5" r="1.25" />
                  </svg>
                </a>
              </li>
              <li>
                <a
                  href="https://x.com/SamuraiCodeAi"
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="X"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#de5e48] transition hover:text-[#ffb8a9] hover:bg-[#de5e48]/15"
                >
                  <span className="sr-only">X</span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="currentColor"
                  >
                    <path d="M3.5 3h4.2l4.1 6.1L16.6 3H21l-6.7 8 7 10h-4.2l-4.4-6.5L7.4 21H3l7.1-8.4L3.5 3Z" />
                  </svg>
                </a>
              </li>
              <li>
                <a
                  href="https://www.youtube.com/@SamuraiCodeAi"
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="YouTube"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#de5e48] transition hover:text-[#ffb8a9] hover:bg-[#de5e48]/15"
                >
                  <span className="sr-only">YouTube</span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-[22px] w-[22px]"
                    fill="none"
                  >
                    <path
                      fill="currentColor"
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M21.8 7.8c-.1-.8-.3-1.5-.8-2-.6-.7-1.4-.9-1.8-.9-2.9-.2-7.2-.2-7.2-.2s-4.3 0-7.2.2c-.4 0-1.2.2-1.8.9-.5.5-.7 1.2-.8 2-.2 1.5-.2 3.2-.2 3.2s0 1.7.2 3.2c.1.8.3 1.5.8 2 .6.7 1.4.9 1.8.9 2.9.2 7.2.2 7.2.2s4.3 0 7.2-.2c.4 0 1.2-.2 1.8-.9.5-.5.7-1.2.8-2 .2-1.5.2-3.2.2-3.2s0-1.7-.2-3.2ZM10 9.75v4.5l3.75-2.25L10 9.75Z"
                    />
                  </svg>
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </footer>

      {showSuccessToast ? (
        <div
          className={`${alteHaasGrotesk.className} pointer-events-none fixed inset-0 z-50 flex items-center justify-center`}
        >
          <div className="scale-100 animate-[fade-in-up_0.35s_ease-out] rounded-[40px] bg-[#de5e48] px-10 py-6 text-center text-lg font-bold uppercase tracking-[0.16em] text-[#f7f6f3] shadow-[0_20px_60px_rgba(222,94,72,0.4)] sm:text-xl">
            Thanks! You&apos;re on the waitlist.
          </div>
        </div>
      ) : null}

      <WaitlistModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleWaitlistSuccess}
      />
    </div>
  );
}
