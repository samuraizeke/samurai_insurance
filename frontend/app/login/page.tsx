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
  <svg viewBox="0 0 24 24" {...props}>
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
    <div className="flex items-center justify-center min-h-screen bg-[#f7f6f3]">
      <div className="mx-auto w-full max-w-md space-y-8 px-4">
        <div className="space-y-3 text-center">
          <Image
            src="/sam-head-logo.png"
            alt="Samurai Insurance"
            width={100}
            height={100}
            className="mx-auto"
          />
          <h1 className="text-4xl font-semibold font-heading tracking-tight">Welcome back</h1>
          <p className="text-lg text-muted-foreground font-[family-name:var(--font-work-sans)]">
            Sign in to access your insurance dashboard.
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
            Sign in with Google
          </Button>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-base text-muted-foreground font-[family-name:var(--font-work-sans)]">
              or sign in with email
            </span>
            <Separator className="flex-1" />
          </div>

          {error && (
            <div className="p-4 rounded-md bg-destructive/10 text-destructive text-base font-[family-name:var(--font-work-sans)]">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailSignIn} className="space-y-7">
            <div>
              <Label htmlFor="email" className="text-base font-[family-name:var(--font-work-sans)]">Email</Label>
              <div className="relative mt-3">
                <Input
                  id="email"
                  className="peer h-12 ps-11 text-base font-[family-name:var(--font-work-sans)] border-[#333333]/10 bg-[hsl(0_0%_98%)]"
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-4 peer-disabled:opacity-50">
                  <EnvelopeClosedIcon className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-base font-[family-name:var(--font-work-sans)]">Password</Label>
                <a href="#" className="text-base text-[#de5e48] hover:underline font-[family-name:var(--font-work-sans)]">
                  Forgot Password?
                </a>
              </div>
              <div className="relative mt-3">
                <Input
                  id="password"
                  className="h-12 ps-11 pe-11 text-base font-[family-name:var(--font-work-sans)] border-[#333333]/10 bg-[hsl(0_0%_98%)]"
                  placeholder="Enter your password"
                  type={isVisible ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-4 peer-disabled:opacity-50">
                  <Lock size={20} aria-hidden="true" />
                </div>
                <button
                  className="text-muted-foreground/80 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 absolute inset-y-0 end-0 flex h-full w-11 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none focus:z-10 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  onClick={toggleVisibility}
                  aria-label={isVisible ? "Hide password" : "Show password"}
                  aria-pressed={isVisible}
                  aria-controls="password"
                >
                  {isVisible ? (
                    <EyeOff size={20} aria-hidden="true" />
                  ) : (
                    <Eye size={20} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base bg-[#de5e48] hover:bg-[#de5e48]/90 text-[#f7f6f3] font-bold font-[family-name:var(--font-work-sans)] border-[#333333]/10"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <div className="text-center text-base font-[family-name:var(--font-work-sans)]">
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
