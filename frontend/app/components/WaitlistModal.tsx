'use client';

import type { ChangeEvent, FormEvent } from "react";
import {
  useCallback,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { submitWaitlist } from "@/app/actions/submitWaitlist";
import type { WaitlistActionResult } from "@/app/actions/submitWaitlist";
import {
  waitlistSchema,
  waitlistSubmissionSchema,
  type WaitlistPayload,
} from "@/lib/schemas";
import { alteHaasGrotesk } from "@/lib/fonts";

const WAITLIST_SOURCE = "Lander" as const;
const createInitialFormValues = () => ({
  firstName: "",
  lastName: "",
  email: "",
  marketingConsent: false,
});

type FormValues = ReturnType<typeof createInitialFormValues>;
type FieldErrors = Partial<Record<keyof WaitlistPayload, string[]>>;

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
  const [captchaError, setCaptchaError] = useState<string | null>(null);

  const { executeRecaptcha } = useGoogleReCaptcha();

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
      setCaptchaError(null);

      // Check if reCAPTCHA is available (may be blocked by ad blockers)
      if (!executeRecaptcha) {
        setCaptchaError(
          "Captcha is unavailable. Please disable your ad blocker or try a different browser."
        );
        setFieldErrors((prev) => ({
          ...prev,
          captchaToken: ["Captcha verification is unavailable"],
        }));
        return;
      }

      // Execute reCAPTCHA v3
      let token: string;
      try {
        token = await executeRecaptcha("waitlist_submit");
      } catch (error) {
        console.error("Failed to execute reCAPTCHA", error);
        setCaptchaError(
          "Captcha verification failed. Please refresh the page and try again."
        );
        setFieldErrors((prev) => ({
          ...prev,
          captchaToken: ["Captcha verification failed"],
        }));
        return;
      }

      if (!token) {
        setCaptchaError("Captcha verification failed. Please try again.");
        setFieldErrors((prev) => ({
          ...prev,
          captchaToken: ["Captcha verification failed"],
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
            setCaptchaError(null);
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
      executeRecaptcha,
      formValues,
      handleClose,
      onSuccess,
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
        <div className="relative w-full max-w-xl rounded-[48px] bg-[hsl(0_0%_98%)] px-8 py-10 text-[#333333] shadow-[0_20px_60px_rgba(51,51,51,0.25)] sm:px-10">
          <button
            type="button"
            onClick={handleClose}
            className="focus-outline-modal absolute right-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#333333] text-[#f7f6f3] transition hover:bg-[#333333]/90"
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

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <input
                type="text"
                name="firstName"
                id="waitlist-firstName"
                className="h-12 rounded-full border border-[#333333]/10 bg-[hsl(0_0%_98%)] px-5 text-base font-normal text-[#333333] font-(family-name:--font-work-sans) placeholder:text-[#333333]/50 focus:border-[#de5e48] focus:outline-none focus:ring-2 focus:ring-[#de5e48]"
                placeholder="First name"
                value={formValues.firstName}
                onChange={handleFirstNameChange}
                required
                aria-label="First name"
                aria-invalid={firstNameErrors.length > 0}
                aria-describedby={firstNameErrors.length > 0 ? "waitlist-firstName-error" : undefined}
              />
              {firstNameErrors.length > 0 ? (
                <span id="waitlist-firstName-error" className="px-5 text-xs font-normal text-[#de5e48] font-(family-name:--font-work-sans)" role="alert">
                  {firstNameErrors[0]}
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <input
                type="text"
                name="lastName"
                id="waitlist-lastName"
                className="h-12 rounded-full border border-[#333333]/10 bg-[hsl(0_0%_98%)] px-5 text-base font-normal text-[#333333] font-(family-name:--font-work-sans) placeholder:text-[#333333]/50 focus:border-[#de5e48] focus:outline-none focus:ring-2 focus:ring-[#de5e48]"
                placeholder="Last name"
                value={formValues.lastName}
                onChange={handleLastNameChange}
                required
                aria-label="Last name"
                aria-invalid={lastNameErrors.length > 0}
                aria-describedby={lastNameErrors.length > 0 ? "waitlist-lastName-error" : undefined}
              />
              {lastNameErrors.length > 0 ? (
                <span id="waitlist-lastName-error" className="px-5 text-xs font-normal text-[#de5e48] font-(family-name:--font-work-sans)" role="alert">
                  {lastNameErrors[0]}
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <input
                type="email"
                name="email"
                id="waitlist-email"
                className="h-12 rounded-full border border-[#333333]/10 bg-[hsl(0_0%_98%)] px-5 text-base font-normal text-[#333333] font-(family-name:--font-work-sans) placeholder:text-[#333333]/50 focus:border-[#de5e48] focus:outline-none focus:ring-2 focus:ring-[#de5e48]"
                placeholder="Email"
                value={formValues.email}
                onChange={handleEmailChange}
                onBlur={() => setEmailTouched(true)}
                aria-label="Email"
                aria-invalid={Boolean(emailErrorMessage)}
                aria-describedby={emailErrorMessage ? "waitlist-email-error" : undefined}
                required
              />
              {emailErrorMessage ? (
                <span id="waitlist-email-error" className="px-5 text-xs font-normal text-[#de5e48] font-(family-name:--font-work-sans)" role="alert">
                  {emailErrorMessage}
                </span>
              ) : null}
            </div>

            <label className="flex items-start gap-3 text-sm text-[#333333] font-(family-name:--font-work-sans)">
              <input
                type="checkbox"
                name="marketingConsent"
                id="waitlist-marketingConsent"
                className="mt-0.5 h-5 w-5 shrink-0 rounded border border-[#333333]/20 bg-white text-[#de5e48] focus:ring-[#de5e48]"
                checked={formValues.marketingConsent}
                onChange={handleConsentChange}
                required
                aria-invalid={marketingConsentErrors.length > 0}
                aria-describedby={marketingConsentErrors.length > 0 ? "waitlist-marketingConsent-error" : undefined}
              />
              I agree to receive future marketing emails from Samurai Insurance.
            </label>
            {marketingConsentErrors.length > 0 ? (
              <span id="waitlist-marketingConsent-error" className="text-xs font-normal uppercase tracking-widest text-[#333333] font-(family-name:--font-work-sans)" role="alert">
                {marketingConsentErrors[0]}
              </span>
            ) : null}

            {resolvedCaptchaError ? (
              <span className="text-xs font-normal uppercase tracking-widest text-[#333333] font-(family-name:--font-work-sans)">
                {resolvedCaptchaError}
              </span>
            ) : null}
            <p className="mt-1 text-center text-xs text-[#333333] font-(family-name:--font-work-sans)">
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
              className="mt-2 w-full h-12 text-base bg-[#333333] hover:bg-[#333333]/90 text-[#f7f6f3] font-bold font-(family-name:--font-work-sans) rounded-full transition disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!isFormValid || isPending}
              aria-disabled={!isFormValid || isPending}
            >
              {isPending ? "Submitting..." : "Submit"}
            </button>
            {formMessage ? (
              <p className="text-sm font-medium text-[#333333] font-(family-name:--font-work-sans)">{formMessage}</p>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  );
}
