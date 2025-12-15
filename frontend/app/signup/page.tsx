"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { JSX, SVGProps, useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import Image from "next/image";
import WaitlistModal from "@/app/components/WaitlistModal";

const GoogleIcon = (
  props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>
) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const MicrosoftIcon = (
  props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>
) => (
  <svg viewBox="0 0 23 23" aria-hidden="true" {...props}>
    <path fill="#f35325" d="M1 1h10v10H1z" />
    <path fill="#81bc06" d="M12 1h10v10H12z" />
    <path fill="#05a6f0" d="M1 12h10v10H1z" />
    <path fill="#ffba08" d="M12 12h10v10H12z" />
  </svg>
);

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBetaError, setIsBetaError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const { signInWithMagicLink, signInWithGoogle, signInWithMicrosoft } = useAuth();

  const BETA_ERROR_MESSAGE = "You are not on the beta allowlist.";

  // Pre-load reCAPTCHA script for waitlist modal
  // Uses the same attribute as WaitlistModal to prevent duplicate script loading
  useEffect(() => {
    const RECAPTCHA_SCRIPT_DATA_ATTR = "data-waitlist-recaptcha-script";
    const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    const recaptchaVersion = process.env.NEXT_PUBLIC_RECAPTCHA_VERSION?.toLowerCase() ?? "v2";

    if (!recaptchaSiteKey) return;

    const scriptSrc = recaptchaVersion === "v3"
      ? `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(recaptchaSiteKey)}`
      : "https://www.google.com/recaptcha/api.js?render=explicit";

    // Check using the same attribute that WaitlistModal uses
    if (document.querySelector(`script[${RECAPTCHA_SCRIPT_DATA_ATTR}]`)) return;

    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    script.defer = true;
    script.setAttribute(RECAPTCHA_SCRIPT_DATA_ATTR, "true");
    document.body.appendChild(script);
  }, []);

  const handleError = (errorMessage: string) => {
    // Supabase wraps trigger exceptions in generic messages, so we check for multiple patterns
    const isBetaRestriction =
      errorMessage.includes(BETA_ERROR_MESSAGE) ||
      errorMessage.includes("beta allowlist") ||
      errorMessage.includes("Database error saving new user");

    if (isBetaRestriction) {
      setIsBetaError(true);
      setError(null);
    } else {
      setIsBetaError(false);
      setError(errorMessage);
    }
  };

  const handleMagicLinkSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsBetaError(false);

    if (!agreedToTerms) {
      setError("You must agree to the terms of use and privacy policy");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signInWithMagicLink(email);
      if (error) {
        handleError(error.message);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!agreedToTerms) {
      setError("You must agree to the terms of use and privacy policy");
      return;
    }

    setError(null);
    setIsBetaError(false);
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sign in with Google";
      handleError(errorMessage);
      setIsGoogleLoading(false);
    }
  };

  const handleMicrosoftSignIn = async () => {
    if (!agreedToTerms) {
      setError("You must agree to the terms of use and privacy policy");
      return;
    }

    setError(null);
    setIsBetaError(false);
    setIsMicrosoftLoading(true);
    try {
      await signInWithMicrosoft();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sign in with Microsoft";
      handleError(errorMessage);
      setIsMicrosoftLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f7f6f3]">
        <div className="mx-auto w-full max-w-md px-4">
          <Card className="border-[#333333]/10">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold font-heading">Check your email</h2>
              <p className="text-muted-foreground font-(family-name:--font-work-sans)">
                We&apos;ve sent a magic link to <strong>{email}</strong>. Click the link to complete your registration.
              </p>
              <Button
                variant="outline"
                className="mt-4 font-(family-name:--font-work-sans) border-[#333333]/10"
                onClick={() => setSuccess(false)}
              >
                Use a different email
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <main id="main-content" className="flex items-center justify-center min-h-screen bg-[#f7f6f3]">
      <div className="mx-auto w-full max-w-md space-y-8 px-4 py-10">
        <div className="space-y-3 text-center">
          <Image
            src="/sam-head-logo.png"
            alt="Samurai Insurance"
            width={100}
            height={100}
            className="mx-auto"
          />
          <h1 className="text-4xl font-semibold font-heading tracking-tight">Create your account</h1>
          <p className="text-lg text-muted-foreground font-(family-name:--font-work-sans)">
            Get started with Samurai Insurance
          </p>
        </div>

        <div className="space-y-6">
          <Button
            variant="outline"
            className="w-full h-12 justify-start gap-3 text-sm font-normal font-(family-name:--font-work-sans) bg-[hsl(0_0%_98%)] border-[#333333]/10 rounded-full ps-6!"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <GoogleIcon className="h-5 w-5" />
            )}
            Continue with Google
          </Button>

          <Button
            variant="outline"
            className="w-full h-12 justify-start gap-3 text-sm font-normal font-(family-name:--font-work-sans) bg-[hsl(0_0%_98%)] border-[#333333]/10 rounded-full ps-6!"
            onClick={handleMicrosoftSignIn}
            disabled={isMicrosoftLoading}
          >
            {isMicrosoftLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <MicrosoftIcon className="h-5 w-5" />
            )}
            Continue with Microsoft
          </Button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#333333]/20" />
            <span className="text-base text-muted-foreground font-(family-name:--font-work-sans)">
              OR
            </span>
            <div className="flex-1 h-px bg-[#333333]/20" />
          </div>

          {isBetaError && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m11-7a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-amber-900 font-heading">Closed Beta</h3>
                </div>
                <p className="text-amber-800 font-(family-name:--font-work-sans)">
                  Samurai Insurance is currently in closed beta. You&apos;ll need an invitation to create an account.
                </p>
                <p className="text-sm text-amber-700 font-(family-name:--font-work-sans)">
                  If you believe you should have access, please contact our team or check your email for an invitation.
                </p>
                <button
                  type="button"
                  onClick={() => setIsWaitlistOpen(true)}
                  className="inline-block text-sm text-amber-800 underline font-(family-name:--font-work-sans)"
                >
                  Request access
                </button>
              </CardContent>
            </Card>
          )}

          {error && !isBetaError && (
            <div
              role="alert"
              className="p-4 rounded-md bg-destructive/10 text-destructive text-base font-(family-name:--font-work-sans)"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleMagicLinkSignUp} className="space-y-6">
            <div>
              <Input
                type="email"
                id="email"
                placeholder="Enter your email"
                className="h-12 text-base font-(family-name:--font-work-sans) border-[#333333]/10 bg-[hsl(0_0%_98%)] rounded-full px-6"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="mt-2 text-sm text-muted-foreground font-(family-name:--font-work-sans) text-center">
                We&apos;ll send you a magic link to create your account.
              </p>
            </div>

            <div className="flex items-start gap-2 pt-2">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                className="mt-0.5"
              />
              <Label htmlFor="terms" className="text-base leading-6 text-muted-foreground font-(family-name:--font-work-sans)">
                I agree to the{" "}
                <Link href="/terms" className="text-[#333333] underline">
                  Terms of Use
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-[#333333] underline">
                  Privacy Policy
                </Link>
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base bg-[#333333] hover:bg-[#333333]/90 text-[#f7f6f3] font-bold font-(family-name:--font-work-sans) border-[#333333]/10 rounded-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Send magic link"
              )}
            </Button>
          </form>

          <div className="text-center text-base font-(family-name:--font-work-sans)">
            Already have an account?{" "}
            <Link href="/login" className="text-[#333333] underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>

      <WaitlistModal
        isOpen={isWaitlistOpen}
        onClose={() => setIsWaitlistOpen(false)}
        onSuccess={() => setIsWaitlistOpen(false)}
      />
    </main>
  );
}
