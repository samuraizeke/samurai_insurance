'use client';

import Image from "next/image";
import localFont from "next/font/local";
import type { ChangeEvent, FormEvent } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { submitWaitlist } from "@/app/actions/submitWaitlist";
import type { WaitlistActionResult } from "@/app/actions/submitWaitlist";
import {
  waitlistSchema,
  waitlistSubmissionSchema,
  type WaitlistPayload,
} from "@/lib/schemas";

declare global {
  interface Window {
    grecaptcha?: {
      render: (
        container: HTMLElement,
        parameters: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => number;
      reset: (widgetId: number) => void;
      getResponse: (widgetId: number) => string;
      ready?: (callback: () => void) => void;
    };
  }
}

const createInitialFormValues = () => ({
  firstName: "",
  lastName: "",
  email: "",
  marketingConsent: false,
});
type FormValues = ReturnType<typeof createInitialFormValues>;
type FieldErrors = Partial<Record<keyof WaitlistPayload, string[]>>;
const WAITLIST_SOURCE = "Lander" as const;
const INITIAL_FORM_VALUES: FormValues = createInitialFormValues();

const alteHaasGrotesk = localFont({
  src: [
    {
      path: "../public/fonts/AlteHaasGroteskRegular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/AlteHaasGroteskBold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
  fallback: [],
});

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formValues, setFormValues] = useState<FormValues>(INITIAL_FORM_VALUES);
  const [emailTouched, setEmailTouched] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const captchaContainerRef = useRef<HTMLDivElement | null>(null);
  const [captchaWidgetId, setCaptchaWidgetId] = useState<number | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";
  const recaptchaVersion =
    process.env.NEXT_PUBLIC_RECAPTCHA_VERSION?.toLowerCase() ?? "v2";
  const isRecaptchaV3 = recaptchaVersion === "v3";

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }
    };
  }, []);

  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const clearFieldError = useCallback(
    (field: keyof WaitlistPayload) => {
      setFieldErrors((prev) => {
        if (!prev[field] || prev[field]!.length === 0) {
          return prev;
        }

        const { [field]: _removed, ...rest } = prev;
        return rest as FieldErrors;
      });
    },
    []
  );

  const resetCaptcha = useCallback(
    (options?: { preserveError?: boolean }) => {
      if (
        !isRecaptchaV3 &&
        typeof window !== "undefined" &&
        captchaWidgetId !== null
      ) {
        try {
          window.grecaptcha?.reset(captchaWidgetId);
        } catch (error) {
          console.warn("Failed to reset reCAPTCHA widget", error);
        }
      }
      setCaptchaToken("");
      if (!options?.preserveError) {
        setCaptchaError(null);
        clearFieldError("captchaToken");
      }
    },
    [captchaWidgetId, clearFieldError, isRecaptchaV3]
  );

  useEffect(() => {
    if (!isModalOpen) {
      resetCaptcha();
      setCaptchaWidgetId(null);
    }
  }, [isModalOpen, resetCaptcha]);

  useEffect(() => {
    if (isRecaptchaV3) {
      return;
    }

    if (!isModalOpen || captchaWidgetId !== null) {
      return;
    }

    if (!recaptchaSiteKey) {
      setCaptchaError("Captcha is unavailable. Please try again later.");
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    let cancelled = false;
    let retryHandle: NodeJS.Timeout | null = null;

    const renderCaptcha = () => {
      if (
        cancelled ||
        !captchaContainerRef.current ||
        !window.grecaptcha ||
        typeof window.grecaptcha.render !== "function"
      ) {
        return;
      }

      const widgetId = window.grecaptcha.render(
        captchaContainerRef.current,
        {
          sitekey: recaptchaSiteKey,
          callback: (token: string) => {
            setCaptchaToken(token);
            setCaptchaError(null);
            clearFieldError("captchaToken");
          },
          "expired-callback": () => {
            setCaptchaToken("");
            setCaptchaError("Captcha expired. Please verify again.");
          },
          "error-callback": () => {
            setCaptchaToken("");
            setCaptchaError(
              "Captcha failed to load. Please refresh the page and try again."
            );
          },
        }
      );

      if (!cancelled) {
        setCaptchaWidgetId(widgetId);
      }
    };

    const attemptRender = () => {
      if (cancelled) {
        return;
      }

      const grecaptcha = window.grecaptcha;

      if (!grecaptcha) {
        retryHandle = setTimeout(attemptRender, 300);
        return;
      }

      if (typeof grecaptcha.ready === "function") {
        grecaptcha.ready(() => {
          if (!cancelled) {
            renderCaptcha();
          }
        });
        return;
      }

      renderCaptcha();
    };

    attemptRender();

    return () => {
      cancelled = true;
      if (retryHandle) {
        clearTimeout(retryHandle);
      }
    };
  }, [
    captchaWidgetId,
    clearFieldError,
    isModalOpen,
    recaptchaSiteKey,
    captchaContainerRef,
    isRecaptchaV3,
  ]);

  const executeRecaptchaV3 = useCallback(async () => {
    if (!isRecaptchaV3) {
      return null;
    }

    if (!recaptchaSiteKey) {
      setCaptchaError("Captcha is unavailable. Please try again later.");
      return null;
    }

    if (typeof window === "undefined") {
      return null;
    }

    type Grecaptcha = NonNullable<Window["grecaptcha"]> & {
      execute: (
        sitekey: string,
        parameters?: {
          action?: string;
        }
      ) => Promise<string>;
    };

    const waitForGreCaptcha = () =>
      new Promise<Grecaptcha>((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 20;

        const check = () => {
          if (typeof window === "undefined") {
            reject(new Error("Window is undefined"));
            return;
          }

          const grecaptcha = window.grecaptcha as Grecaptcha | null;

          if (grecaptcha && typeof grecaptcha.execute === "function") {
            resolve(grecaptcha);
            return;
          }

          attempts += 1;
          if (attempts > maxAttempts) {
            reject(new Error("grecaptcha is unavailable"));
            return;
          }

          setTimeout(check, 150);
        };

        check();
      });

    let grecaptchaInstance: Grecaptcha;

    try {
      grecaptchaInstance = await waitForGreCaptcha();
    } catch (error) {
      console.error("Failed to load reCAPTCHA v3", error);
      setCaptchaError(
        "Captcha failed to load. Please refresh the page and try again."
      );
      return null;
    }

    const getToken = () =>
      grecaptchaInstance.execute(recaptchaSiteKey, {
        action: "waitlist_submit",
      });

    try {
      const readyFn = grecaptchaInstance.ready;
      const token =
        typeof readyFn === "function"
          ? await new Promise<string>((resolve, reject) => {
              readyFn.call(grecaptchaInstance, () => {
                getToken().then(resolve).catch(reject);
              });
            })
          : await getToken();

      setCaptchaToken(token);
      setCaptchaError(null);
      clearFieldError("captchaToken");
      return token;
    } catch (error) {
      console.error("Failed to execute reCAPTCHA v3", error);
      setCaptchaError(
        "Captcha verification failed. Please refresh the page and try again."
      );
      setCaptchaToken("");
      return null;
    }
  }, [clearFieldError, isRecaptchaV3, recaptchaSiteKey]);

  useEffect(() => {
    if (!isRecaptchaV3 || !isModalOpen) {
      return;
    }

    void executeRecaptchaV3();
  }, [executeRecaptchaV3, isModalOpen, isRecaptchaV3]);

  const handleFirstNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setFormValues((prev) => ({
        ...prev,
        firstName: event.target.value,
      }));
      clearFieldError("firstName");
    },
    [clearFieldError]
  );

  const handleLastNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setFormValues((prev) => ({
        ...prev,
        lastName: event.target.value,
      }));
      clearFieldError("lastName");
    },
    [clearFieldError]
  );

  const handleEmailChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setFormValues((prev) => ({
        ...prev,
        email: event.target.value,
      }));
      clearFieldError("email");
      setFormMessage(null);
    },
    [clearFieldError]
  );

  const handleConsentChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setFormValues((prev) => ({
        ...prev,
        marketingConsent: event.target.checked,
      }));
      clearFieldError("marketingConsent");
    },
    [clearFieldError]
  );

  const emailFormatIsValid = useMemo(() => {
    return waitlistSchema.shape.email.safeParse(formValues.email.trim()).success;
  }, [formValues.email]);

  const isFormValid = useMemo(() => {
    return waitlistSchema.safeParse({
      ...formValues,
      source: WAITLIST_SOURCE,
    }).success;
  }, [formValues]);

  const emailErrorMessage =
    (fieldErrors.email && fieldErrors.email[0]) ||
    (emailTouched && !emailFormatIsValid ? "Enter a valid email address" : null);
  const firstNameErrors = fieldErrors.firstName ?? [];
  const lastNameErrors = fieldErrors.lastName ?? [];
  const marketingConsentErrors = fieldErrors.marketingConsent ?? [];
  const captchaFieldErrors = fieldErrors.captchaToken ?? [];
  const resolvedCaptchaError =
    captchaError ?? (captchaFieldErrors.length > 0 ? captchaFieldErrors[0] : null);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      setEmailTouched(true);

      const captchaMessage = isRecaptchaV3
        ? "Captcha verification failed. Please try again."
        : "Please verify that you are not a robot.";

      let token = captchaToken;

      if (isRecaptchaV3) {
        const generatedToken = await executeRecaptchaV3();
        if (!generatedToken) {
          setFieldErrors((prev) => ({
            ...prev,
            captchaToken: [captchaMessage],
          }));
          return;
        }
        token = generatedToken;
      } else if (!captchaToken) {
        setCaptchaError(captchaMessage);
        setFieldErrors((prev) => ({
          ...prev,
          captchaToken: [captchaMessage],
        }));
        return;
      }

      const candidate: WaitlistPayload = {
        ...formValues,
        email: formValues.email.trim().toLowerCase(),
        source: WAITLIST_SOURCE,
        captchaToken: token,
      };

      const parsed = waitlistSubmissionSchema.safeParse(candidate);

      if (!parsed.success) {
        setFieldErrors(
          parsed.error.flatten().fieldErrors as FieldErrors
        );
        setFormMessage(null);
        return;
      }

      setFieldErrors({});
      setFormMessage(null);
      setCaptchaError(null);

      startTransition(() => {
        void (async () => {
          try {
            const result: WaitlistActionResult = await submitWaitlist(parsed.data);

            if (!result.success) {
              const errors = result.errors as FieldErrors;
              setFieldErrors(errors);
              const captchaErrors = errors.captchaToken;
              if (captchaErrors && captchaErrors.length > 0) {
                setCaptchaError(captchaErrors[0]);
                resetCaptcha({ preserveError: true });
                if (isRecaptchaV3) {
                  void executeRecaptchaV3();
                }
              }
              if (Object.keys(result.errors).length === 0) {
                setFormMessage("We couldn't submit the form. Please try again.");
              }
              return;
            }

          setFormValues(createInitialFormValues());
            setEmailTouched(false);
            setFieldErrors({});
            setFormMessage(null);
            resetCaptcha();
            if (toastTimeoutRef.current) {
              clearTimeout(toastTimeoutRef.current);
              toastTimeoutRef.current = null;
            }
            setShowSuccessToast(true);
            toastTimeoutRef.current = setTimeout(() => {
              setShowSuccessToast(false);
              toastTimeoutRef.current = null;
            }, 2000);
            handleCloseModal();
          } catch (error) {
            console.error("Unexpected error submitting waitlist form", error);
            setFormMessage("Something went wrong. Please try again.");
          }
        })();
      });
    },
    [
      captchaToken,
      executeRecaptchaV3,
      formValues,
      handleCloseModal,
      isRecaptchaV3,
      resetCaptcha,
      startTransition,
    ]
  );

  return (
    <div className={`${alteHaasGrotesk.className} min-h-screen flex flex-col`}>
      <header className="w-full">
        <div className="flex w-full items-center justify-between px-12 pt-10 sm:px-16">
          <div className="flex items-center gap-4">
            <Image
              src="/SamuraiLogoOrange.png"
              alt="Samurai Insurance logo"
              width={64}
              height={32}
              priority
            />
            <span className="text-base font-bold uppercase text-[#d1d3d4] sm:text-2xl">
              Samurai Insurance
            </span>
          </div>
          <button
            className="focus-outline-brand-sm rounded-full bg-[#de5e48] px-6 py-2 text-med font-bold text-[#f7f6f3] shadow-[0_3px_8px_rgba(222,94,72,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(222,94,72,0.24)]"
            onClick={handleOpenModal}
            type="button"
          >
            Sign Up
          </button>
        </div>
      </header>

      <main className="flex flex-1 items-start">
        <section className="w-full px-12 pb-24 pt-12 sm:px-16 sm:pb-32 sm:pt-16">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-center">
            <div className="max-w-2xl lg:flex-1 lg:max-w-none">
              <h1 className="font-bold leading-tight text-[#d1d3d4] text-4xl sm:text-5xl md:text-6xl lg:text-[64px] lg:leading-[1.05]">
                Never Worry About Your Home & Auto Insurance Again.
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-[#d1d3d4] sm:text-xl">
                Get clarity on your personal home and auto coverage, review your policies, and save money on renewals with
                your always available AI insurance brokerage.
              </p>
              <button
                className="focus-outline-brand-lg mt-10 inline-flex items-center justify-center rounded-full bg-[#de5e48] px-8 py-3 text-lg font-bold text-[#f7f6f3] shadow-[0_4px_12px_rgba(222,94,72,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(222,94,72,0.27)]"
                onClick={handleOpenModal}
                type="button"
              >
                Join the Waitlist
              </button>
            </div>
            <div className="w-full lg:flex-[2]">
              <div className="relative aspect-video w-full overflow-hidden rounded-3xl">
                <video
                  className="h-full w-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                  src="https://samuraiinsurancestorage.blob.core.windows.net/videos/out-2.mp4?sp=r&st=2025-10-17T12:58:17Z&se=2028-10-31T21:13:17Z&spr=https&sv=2024-11-04&sr=b&sig=Ml2b8cU0sG47nhApljxTBDIdgipfuo%2B%2FPOw7MQA67xE%3D"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </div>
        </section>
      </main>

      {showSuccessToast ? (
        <div
          className={`${alteHaasGrotesk.className} pointer-events-none fixed inset-0 z-50 flex items-center justify-center`}
        >
          <div className="scale-100 animate-[fade-in-up_0.35s_ease-out] rounded-[40px] bg-[#de5e48] px-10 py-6 text-center text-lg font-bold uppercase tracking-[0.16em] text-[#f7f6f3] shadow-[0_20px_60px_rgba(222,94,72,0.4)] sm:text-xl">
            Thanks! You&apos;re on the waitlist.
          </div>
        </div>
      ) : null}

      {isModalOpen ? (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="waitlist-modal-title"
        >
          <div
            className="absolute inset-0 bg-[#0f0f10]/60 backdrop-blur-sm"
            onClick={handleCloseModal}
            aria-hidden="true"
          />

          <div className="relative flex h-full w-full items-center justify-center p-4 sm:p-8">
            <div
              className={`${alteHaasGrotesk.className} relative w-full max-w-xl rounded-[48px] bg-[#3a3c43] px-8 py-10 text-[#f5f6f7] shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:px-10`}
            >
              <button
                type="button"
                onClick={handleCloseModal}
                className="focus-outline-modal absolute right-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#2d2f36] text-2xl font-bold text-[#7d8087] transition hover:text-[#f5f6f7]"
                aria-label="Close waitlist modal"
              >
                ×
              </button>

              <h2
                id="waitlist-modal-title"
                className="text-3xl font-bold text-[#f5f6f7] sm:text-4xl"
              >
                Join the Waitlist
              </h2>

              <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
                <label className="flex flex-col gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-[#c7c9cc]">
                  First Name
                  <input
                    type="text"
                    name="firstName"
                    className="h-12 rounded-full border border-transparent bg-[#4a4c53] px-5 text-base font-normal text-[#f7f6f3] placeholder:text-[#93959a] focus:border-[#de5e48] focus:outline-none focus:ring-2 focus:ring-[#de5e48]"
                    placeholder="Enter your first name"
                    value={formValues.firstName}
                    onChange={handleFirstNameChange}
                    required
                    aria-invalid={firstNameErrors.length > 0}
                  />
                  {firstNameErrors.length > 0 ? (
                    <span className="text-xs font-normal uppercase tracking-[0.1em] text-[#f8c0b4]">
                      {firstNameErrors[0]}
                    </span>
                  ) : null}
                </label>

                <label className="flex flex-col gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-[#c7c9cc]">
                  Last Name
                  <input
                    type="text"
                    name="lastName"
                    className="h-12 rounded-full border border-transparent bg-[#4a4c53] px-5 text-base font-normal text-[#f7f6f3] placeholder:text-[#93959a] focus:border-[#de5e48] focus:outline-none focus:ring-2 focus:ring-[#de5e48]"
                    placeholder="Enter your last name"
                    value={formValues.lastName}
                    onChange={handleLastNameChange}
                    required
                    aria-invalid={lastNameErrors.length > 0}
                  />
                  {lastNameErrors.length > 0 ? (
                    <span className="text-xs font-normal uppercase tracking-[0.1em] text-[#f8c0b4]">
                      {lastNameErrors[0]}
                    </span>
                  ) : null}
                </label>

                <label className="flex flex-col gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-[#c7c9cc]">
                  Email
                  <input
                    type="email"
                    name="email"
                    className="h-12 rounded-full border border-transparent bg-[#4a4c53] px-5 text-base font-normal text-[#f7f6f3] placeholder:text-[#93959a] focus:border-[#de5e48] focus:outline-none focus:ring-2 focus:ring-[#de5e48]"
                    placeholder="Enter your email"
                    value={formValues.email}
                    onChange={handleEmailChange}
                    onBlur={() => setEmailTouched(true)}
                    aria-invalid={Boolean(emailErrorMessage)}
                    required
                  />
                  {emailErrorMessage ? (
                    <span className="text-xs font-normal uppercase tracking-[0.1em] text-[#f8c0b4]">
                      {emailErrorMessage}
                    </span>
                  ) : null}
                </label>

                <label className="flex items-start gap-3 text-sm text-[#d1d3d4]">
                  <input
                    type="checkbox"
                    name="marketingConsent"
                    className="mt-[2px] h-5 w-5 rounded border border-[#63656b] bg-[#2c2d33] text-[#de5e48] focus:ring-[#de5e48]"
                    checked={formValues.marketingConsent}
                    onChange={handleConsentChange}
                    required
                    aria-invalid={marketingConsentErrors.length > 0}
                  />
                  I agree to receive future marketing emails from Samurai
                  Insurance.
                </label>
                {marketingConsentErrors.length > 0 ? (
                  <span className="text-xs font-normal uppercase tracking-[0.1em] text-[#f8c0b4]">
                    {marketingConsentErrors[0]}
                  </span>
                ) : null}

                {!isRecaptchaV3 ? (
                  <div className="flex justify-center">
                    <div ref={captchaContainerRef} />
                  </div>
                ) : null}
                {resolvedCaptchaError ? (
                  <span className="text-xs font-normal uppercase tracking-[0.1em] text-[#f8c0b4]">
                    {resolvedCaptchaError}
                  </span>
                ) : null}
                <p className="mt-1 text-center text-xs text-[#a1a3aa]">
                  This site is protected by reCAPTCHA and the Google{" "}
                  <a
                    className="underline transition hover:text-[#f5f6f7]"
                    href="https://policies.google.com/privacy"
                    rel="noreferrer"
                    target="_blank"
                  >
                    Privacy Policy
                  </a>{" "}
                  and{" "}
                  <a
                    className="underline transition hover:text-[#f5f6f7]"
                    href="https://policies.google.com/terms"
                    rel="noreferrer"
                    target="_blank"
                  >
                    Terms of Service
                  </a>{" "}
                  apply.
                </p>

                <button
                  type="submit"
                  className="focus-outline-brand-lg mt-2 inline-flex items-center justify-center rounded-full bg-[#de5e48] px-8 py-3 text-lg font-bold text-[#f7f6f3] shadow-[0_4px_12px_rgba(222,94,72,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(222,94,72,0.27)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                  disabled={
                    !isFormValid || isPending || (!isRecaptchaV3 && !captchaToken)
                  }
                  aria-disabled={
                    !isFormValid || isPending || (!isRecaptchaV3 && !captchaToken)
                  }
                >
                  {isPending ? "Submitting..." : "Submit"}
                </button>
                {formMessage ? (
                  <p className="text-sm font-medium text-[#f8c0b4]">
                    {formMessage}
                  </p>
                ) : null}
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
