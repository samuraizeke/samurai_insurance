import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";
const recaptchaVersion =
  process.env.NEXT_PUBLIC_RECAPTCHA_VERSION?.toLowerCase() ?? "v2";
const recaptchaScriptSrc =
  recaptchaVersion === "v3"
    ? recaptchaSiteKey
      ? `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(
          recaptchaSiteKey
        )}`
      : null
    : "https://www.google.com/recaptcha/api.js?render=explicit";

export const metadata: Metadata = {
  title: "Samurai Insurance",
  description: "Never Worry About Your P&C Insurance Again.",
  icons: {
    icon: [{ url: '/icon.png', type: 'image/png' }], // ensure this exists
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {recaptchaScriptSrc ? (
          <Script src={recaptchaScriptSrc} strategy="afterInteractive" />
        ) : null}
        {children}
      </body>
    </html>
  );
}
