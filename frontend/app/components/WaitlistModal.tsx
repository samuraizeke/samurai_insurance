'use client';

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
import { alteHaasGrotesk, workSans } from "@/lib/fonts";

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
      execute?: (
        sitekey: string,
        parameters?: {
          action?: string;
        }
      ) => Promise<string>;
    };
  }
}

const WAITLIST_SOURCE = "Lander" as const;
const createInitialFormValues = () => ({
  firstName: "",
  lastName: "",
  email: "",
  marketingConsent: false,
});

type FormValues = ReturnType<typeof createInitialFormValues>;
type FieldErrors = Partial<Record<keyof WaitlistPayload, string[]>>;

const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";
const recaptchaVersion =
  process.env.NEXT_PUBLIC_RECAPTCHA_VERSION?.toLowerCase() ?? "v2";
const isRecaptchaV3 = recaptchaVersion === "v3";
const recaptchaScriptSrc =
  recaptchaVersion === "v3"
    ? recaptchaSiteKey
      ? `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(
        recaptchaSiteKey
      )}`
      : null
    : "https://www.google.com/recaptcha/api.js?render=explicit";

const RECAPTCHA_SCRIPT_DATA_ATTR = "data-waitlist-recaptcha-script";

type WaitlistModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function WaitlistModal({
  isOpen,
  onClose,
  onSuccess,
}: WaitlistModalProps) {
  const [formValues, setFormValues] = useState<FormValues>(
    createInitialFormValues()
  );
  const [emailTouched, setEmailTouched] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [captchaWidgetId, setCaptchaWidgetId] = useState<number | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const captchaContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen || !recaptchaScriptSrc || typeof window === "undefined") {
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[${RECAPTCHA_SCRIPT_DATA_ATTR}]`
    );

    if (existingScript) {
      return;
    }

    const script = document.createElement("script");
    script.src = recaptchaScriptSrc;
    script.async = true;
    script.defer = true;
    script.setAttribute(RECAPTCHA_SCRIPT_DATA_ATTR, "true");
    document.body.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, [isOpen, recaptchaScriptSrc]);

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
        } catch {
          // reCAPTCHA widget reset failed silently
        }
      }
      setCaptchaToken("");
      if (!options?.preserveError) {
        setCaptchaError(null);
        clearFieldError("captchaToken");
      }
    },
    [captchaWidgetId, clearFieldError]
  );

  useEffect(() => {
    if (!isOpen) {
      resetCaptcha();
      setCaptchaWidgetId(null);
    }
  }, [isOpen, resetCaptcha]);

  useEffect(() => {
    if (!isOpen || isRecaptchaV3) {
      return;
    }

    if (captchaWidgetId !== null) {
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
  }, [captchaWidgetId, clearFieldError, isOpen, recaptchaSiteKey]);

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
  }, [clearFieldError, recaptchaSiteKey]);

  useEffect(() => {
    if (!isRecaptchaV3 || !isOpen) {
      return;
    }

    void executeRecaptchaV3();
  }, [executeRecaptchaV3, isOpen, isRecaptchaV3]);

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

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

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
              const serverCaptchaErrors = errors.captchaToken;
              if (serverCaptchaErrors && serverCaptchaErrors.length > 0) {
                setCaptchaError(serverCaptchaErrors[0]);
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
            onSuccess();
            handleClose();
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
      handleClose,
      isRecaptchaV3,
      onSuccess,
      resetCaptcha,
      startTransition,
    ]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`${alteHaasGrotesk.className} fixed inset-0 z-50`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="waitlist-modal-title"
    >
      <div
        className="absolute inset-0 bg-[#f7f6f3]/60 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div className="relative flex h-full w-full items-center justify-center p-4 sm:p-8">
        <div className="relative w-full max-w-xl rounded-[48px] bg-[#c5c1ba] px-8 py-10 text-[#333333] shadow-[0_20px_60px_rgba(51,51,51,0.25)] sm:px-10">
          <button
            type="button"
            onClick={handleClose}
            className="focus-outline-modal absolute right-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#d2cec9] text-[#333333] transition hover:text-[#333333]"
            aria-label="Close waitlist modal"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M2 2l8 8" />
              <path d="M10 2L2 10" />
            </svg>
          </button>

          <h2
            id="waitlist-modal-title"
            className="text-3xl font-bold text-[#333333] sm:text-4xl"
          >
            Join the Waitlist
          </h2>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
            <label className="flex flex-col gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-[#333333]">
              First Name
              <input
                type="text"
                name="firstName"
                id="waitlist-firstName"
                className="h-12 rounded-full border border-transparent bg-[#b5b0ac] px-5 text-base font-normal text-[#333333] placeholder:text-[#333333] focus:border-[#de5e48] focus:outline-none focus:ring-2 focus:ring-[#de5e48]"
                placeholder="Enter your first name"
                value={formValues.firstName}
                onChange={handleFirstNameChange}
                required
                aria-invalid={firstNameErrors.length > 0}
                aria-describedby={firstNameErrors.length > 0 ? "waitlist-firstName-error" : undefined}
              />
              {firstNameErrors.length > 0 ? (
                <span id="waitlist-firstName-error" className="text-xs font-normal uppercase tracking-[0.1em] text-[#333333]" role="alert">
                  {firstNameErrors[0]}
                </span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-[#333333]">
              Last Name
              <input
                type="text"
                name="lastName"
                id="waitlist-lastName"
                className="h-12 rounded-full border border-transparent bg-[#b5b0ac] px-5 text-base font-normal text-[#333333] placeholder:text-[#333333] focus:border-[#de5e48] focus:outline-none focus:ring-2 focus:ring-[#de5e48]"
                placeholder="Enter your last name"
                value={formValues.lastName}
                onChange={handleLastNameChange}
                required
                aria-invalid={lastNameErrors.length > 0}
                aria-describedby={lastNameErrors.length > 0 ? "waitlist-lastName-error" : undefined}
              />
              {lastNameErrors.length > 0 ? (
                <span id="waitlist-lastName-error" className="text-xs font-normal uppercase tracking-[0.1em] text-[#333333]" role="alert">
                  {lastNameErrors[0]}
                </span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-[#333333]">
              Email
              <input
                type="email"
                name="email"
                id="waitlist-email"
                className="h-12 rounded-full border border-transparent bg-[#b5b0ac] px-5 text-base font-normal text-[#333333] placeholder:text-[#333333] focus:border-[#de5e48] focus:outline-none focus:ring-2 focus:ring-[#de5e48]"
                placeholder="Enter your email"
                value={formValues.email}
                onChange={handleEmailChange}
                onBlur={() => setEmailTouched(true)}
                aria-invalid={Boolean(emailErrorMessage)}
                aria-describedby={emailErrorMessage ? "waitlist-email-error" : undefined}
                required
              />
              {emailErrorMessage ? (
                <span id="waitlist-email-error" className="text-xs font-normal uppercase tracking-[0.1em] text-[#de5e48]" role="alert">
                  {emailErrorMessage}
                </span>
              ) : null}
            </label>

            <label className="flex items-start gap-3 text-sm text-[#333333]">
              <input
                type="checkbox"
                name="marketingConsent"
                id="waitlist-marketingConsent"
                className="mt-[2px] h-5 w-5 rounded border border-[#9c9692] bg-[#d3cecb] text-[#333333] focus:ring-[#de5e48]"
                checked={formValues.marketingConsent}
                onChange={handleConsentChange}
                required
                aria-invalid={marketingConsentErrors.length > 0}
                aria-describedby={marketingConsentErrors.length > 0 ? "waitlist-marketingConsent-error" : undefined}
              />
              I agree to receive future marketing emails from Samurai Insurance.
            </label>
            {marketingConsentErrors.length > 0 ? (
              <span id="waitlist-marketingConsent-error" className="text-xs font-normal uppercase tracking-[0.1em] text-[#333333]" role="alert">
                {marketingConsentErrors[0]}
              </span>
            ) : null}

            {!isRecaptchaV3 ? (
              <div className="flex justify-center">
                <div ref={captchaContainerRef} />
              </div>
            ) : null}
            {resolvedCaptchaError ? (
              <span className="text-xs font-normal uppercase tracking-[0.1em] text-[#333333]">
                {resolvedCaptchaError}
              </span>
            ) : null}
            <p className="mt-1 text-center text-xs text-[#333333]">
              This site is protected by reCAPTCHA and the Google{" "}
              <a
                className="underline transition hover:text-[#333333]"
                href="https://policies.google.com/privacy"
                rel="noreferrer"
                target="_blank"
              >
                Privacy Policy
              </a>{" "}
              and{" "}
              <a
                className="underline transition hover:text-[#333333]"
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
              <p className="text-sm font-medium text-[#333333]">{formMessage}</p>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  );
}
