"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Lock, Loader2 } from "lucide-react";
import { JSX, SVGProps, useState } from "react";
import { EnvelopeClosedIcon } from "@radix-ui/react-icons";
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

export default function LoginPage() {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { signInWithEmail, signInWithGoogle } = useAuth();

  const toggleVisibility = () => setIsVisible((prevState) => !prevState);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await signInWithEmail(email, password);
      if (error) {
        setError(error.message);
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

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#fafafa]">
      <div className="mx-auto w-full max-w-sm space-y-6 px-4">
        <div className="space-y-2 text-center">
          <Image
            src="/sam-head-logo.png"
            alt="Samurai Insurance"
            width={80}
            height={80}
            className="mx-auto"
          />
          <h1 className="text-3xl font-semibold font-heading tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground font-[family-name:var(--font-work-sans)]">
            Sign in to access your insurance dashboard.
          </p>
        </div>

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
            Sign in with Google
          </Button>

          <div className="flex items-center gap-2">
            <Separator className="flex-1" />
            <span className="text-sm text-muted-foreground font-[family-name:var(--font-work-sans)]">
              or sign in with email
            </span>
            <Separator className="flex-1" />
          </div>

          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm font-[family-name:var(--font-work-sans)]">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailSignIn} className="space-y-6">
            <div>
              <Label htmlFor="email" className="font-[family-name:var(--font-work-sans)]">Email</Label>
              <div className="relative mt-2.5">
                <Input
                  id="email"
                  className="peer ps-9 font-[family-name:var(--font-work-sans)]"
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                  <EnvelopeClosedIcon className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="font-[family-name:var(--font-work-sans)]">Password</Label>
                <a href="#" className="text-sm text-[#de5e48] hover:underline font-[family-name:var(--font-work-sans)]">
                  Forgot Password?
                </a>
              </div>
              <div className="relative mt-2.5">
                <Input
                  id="password"
                  className="ps-9 pe-9 font-[family-name:var(--font-work-sans)]"
                  placeholder="Enter your password"
                  type={isVisible ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                  <Lock size={16} aria-hidden="true" />
                </div>
                <button
                  className="text-muted-foreground/80 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none focus:z-10 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  onClick={toggleVisibility}
                  aria-label={isVisible ? "Hide password" : "Show password"}
                  aria-pressed={isVisible}
                  aria-controls="password"
                >
                  {isVisible ? (
                    <EyeOff size={16} aria-hidden="true" />
                  ) : (
                    <Eye size={16} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#de5e48] hover:bg-[#de5e48]/90 font-[family-name:var(--font-work-sans)]"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <div className="text-center text-sm font-[family-name:var(--font-work-sans)]">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-[#de5e48] font-medium hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
