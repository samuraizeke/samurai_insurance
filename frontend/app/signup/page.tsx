"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { JSX, SVGProps, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import Image from "next/image";

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

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signUpWithEmail, signInWithGoogle } = useAuth();

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!agreedToTerms) {
      setError("You must agree to the terms of use and privacy policy");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signUpWithEmail(email, password, name);
      if (error) {
        setError(error.message);
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
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError("Failed to sign in with Google");
      setIsGoogleLoading(false);
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold font-heading">Check your email</h2>
              <p className="text-muted-foreground font-[family-name:var(--font-work-sans)]">
                We&apos;ve sent you a confirmation link at <strong>{email}</strong>. Click the link to verify your account.
              </p>
              <Link href="/login">
                <Button variant="outline" className="mt-4 font-[family-name:var(--font-work-sans)] border-[#333333]/10">
                  Back to login
                </Button>
              </Link>
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
          <p className="text-lg text-muted-foreground font-[family-name:var(--font-work-sans)]">
            Get started with Samurai Insurance
          </p>
        </div>

        <div className="space-y-6">
          <Button
            variant="outline"
            className="w-full h-12 justify-center gap-3 text-base font-[family-name:var(--font-work-sans)] bg-[hsl(0_0%_98%)] border-[#333333]/10"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <GoogleIcon className="h-5 w-5" />
            )}
            Sign up with Google
          </Button>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-base text-muted-foreground font-[family-name:var(--font-work-sans)]">
              or sign up with email
            </span>
            <Separator className="flex-1" />
          </div>

          {error && (
            <div
              role="alert"
              className="p-4 rounded-md bg-destructive/10 text-destructive text-base font-[family-name:var(--font-work-sans)]"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleEmailSignUp} className="space-y-6">
            <div>
              <Label htmlFor="name" className="text-base font-[family-name:var(--font-work-sans)]">
                Full Name
              </Label>
              <Input
                type="text"
                id="name"
                placeholder="John Doe"
                className="mt-3 h-12 text-base font-[family-name:var(--font-work-sans)] border-[#333333]/10 bg-[hsl(0_0%_98%)]"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-base font-[family-name:var(--font-work-sans)]">
                Email
              </Label>
              <Input
                type="email"
                id="email"
                placeholder="you@example.com"
                className="mt-3 h-12 text-base font-[family-name:var(--font-work-sans)] border-[#333333]/10 bg-[hsl(0_0%_98%)]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-base font-[family-name:var(--font-work-sans)]">
                Password
              </Label>
              <div className="relative mt-3">
                <Input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="Create a password"
                  className="pe-11 h-12 text-base font-[family-name:var(--font-work-sans)] border-[#333333]/10 bg-[hsl(0_0%_98%)]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  className="text-muted-foreground/80 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 absolute inset-y-0 end-0 flex h-full w-11 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none focus:z-10 focus-visible:ring-[3px]"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  aria-controls="password"
                >
                  {showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirm-password" className="text-base font-[family-name:var(--font-work-sans)]">
                Confirm Password
              </Label>
              <div className="relative mt-3">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirm-password"
                  placeholder="Confirm your password"
                  className="pe-11 h-12 text-base font-[family-name:var(--font-work-sans)] border-[#333333]/10 bg-[hsl(0_0%_98%)]"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  className="text-muted-foreground/80 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 absolute inset-y-0 end-0 flex h-full w-11 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none focus:z-10 focus-visible:ring-[3px]"
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  aria-pressed={showConfirmPassword}
                  aria-controls="confirm-password"
                >
                  {showConfirmPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2 pt-2">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                className="mt-0.5"
              />
              <Label htmlFor="terms" className="text-base leading-6 text-muted-foreground font-[family-name:var(--font-work-sans)]">
                I agree to the{" "}
                <Link href="/terms" className="text-[#de5e48] hover:underline">
                  Terms of Use
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-[#de5e48] hover:underline">
                  Privacy Policy
                </Link>
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base bg-[#de5e48] hover:bg-[#de5e48]/90 text-[#f7f6f3] font-bold font-[family-name:var(--font-work-sans)] border-[#333333]/10"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          <div className="text-center text-base font-[family-name:var(--font-work-sans)]">
            Already have an account?{" "}
            <Link href="/login" className="text-[#de5e48] font-medium hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
