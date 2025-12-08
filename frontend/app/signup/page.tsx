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
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M3.06364 7.50914C4.70909 4.24092 8.09084 2 12 2C14.6954 2 16.959 2.99095 18.6909 4.60455L15.8227 7.47274C14.7864 6.48185 13.4681 5.97727 12 5.97727C9.39542 5.97727 7.19084 7.73637 6.40455 10.1C6.2045 10.7 6.09086 11.3409 6.09086 12C6.09086 12.6591 6.2045 13.3 6.40455 13.9C7.19084 16.2636 9.39542 18.0227 12 18.0227C13.3454 18.0227 14.4909 17.6682 15.3864 17.0682C16.4454 16.3591 17.15 15.3 17.3818 14.05H12V10.1818H21.4181C21.5364 10.8363 21.6 11.5182 21.6 12.2273C21.6 15.2727 20.5091 17.8363 18.6181 19.5773C16.9636 21.1046 14.7 22 12 22C8.09084 22 4.70909 19.7591 3.06364 16.4909C2.38638 15.1409 2 13.6136 2 12C2 10.3864 2.38638 8.85911 3.06364 7.50914Z" />
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
      <div className="flex items-center justify-center min-h-screen bg-[#fafafa]">
        <div className="mx-auto w-full max-w-md px-4">
          <Card>
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
                <Button variant="outline" className="mt-4 font-[family-name:var(--font-work-sans)]">
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
    <div className="flex items-center justify-center min-h-screen bg-[#fafafa]">
      <div className="flex flex-1 flex-col justify-center px-4 py-10 lg:px-6">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Image
            src="/sam-head-logo.png"
            alt="Samurai Insurance"
            width={64}
            height={64}
            className="mx-auto"
          />
          <h3 className="mt-4 text-center text-2xl font-bold text-foreground font-heading tracking-tight">
            Create your account
          </h3>
          <p className="mt-2 text-center text-muted-foreground font-[family-name:var(--font-work-sans)]">
            Get started with Samurai Insurance
          </p>
        </div>

        <Card className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
          <CardContent className="pt-6">
            <div className="space-y-5">
              <Button
                variant="outline"
                className="w-full justify-center gap-2 font-[family-name:var(--font-work-sans)]"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon className="h-4 w-4" />
                )}
                Sign up with Google
              </Button>

              <div className="flex items-center gap-2">
                <Separator className="flex-1" />
                <span className="text-sm text-muted-foreground font-[family-name:var(--font-work-sans)]">
                  or sign up with email
                </span>
                <Separator className="flex-1" />
              </div>

              {error && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm font-[family-name:var(--font-work-sans)]">
                  {error}
                </div>
              )}

              <form onSubmit={handleEmailSignUp} className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium font-[family-name:var(--font-work-sans)]">
                    Full Name
                  </Label>
                  <Input
                    type="text"
                    id="name"
                    placeholder="John Doe"
                    className="mt-2 font-[family-name:var(--font-work-sans)]"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm font-medium font-[family-name:var(--font-work-sans)]">
                    Email
                  </Label>
                  <Input
                    type="email"
                    id="email"
                    placeholder="you@example.com"
                    className="mt-2 font-[family-name:var(--font-work-sans)]"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="password" className="text-sm font-medium font-[family-name:var(--font-work-sans)]">
                    Password
                  </Label>
                  <div className="relative mt-2">
                    <Input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      placeholder="Create a password"
                      className="pe-9 font-[family-name:var(--font-work-sans)]"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      className="text-muted-foreground/80 hover:text-foreground absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md transition-colors"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirm-password" className="text-sm font-medium font-[family-name:var(--font-work-sans)]">
                    Confirm Password
                  </Label>
                  <div className="relative mt-2">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirm-password"
                      placeholder="Confirm your password"
                      className="pe-9 font-[family-name:var(--font-work-sans)]"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <button
                      className="text-muted-foreground/80 hover:text-foreground absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md transition-colors"
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
                  <Label htmlFor="terms" className="text-sm leading-5 text-muted-foreground font-[family-name:var(--font-work-sans)]">
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
                  className="w-full mt-4 bg-[#de5e48] hover:bg-[#de5e48]/90 font-[family-name:var(--font-work-sans)]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Create account"
                  )}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground font-[family-name:var(--font-work-sans)]">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[#de5e48] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
