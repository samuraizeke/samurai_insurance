import type { Metadata } from "next";
import { alteHaasGrotesk, workSans, leagueGothic } from "@/lib/fonts";
import Script from "next/script";
import "./globals.css";
import { Analytics } from '@vercel/analytics/next';
import { AuthProvider } from "@/lib/auth-context";
import { OnboardingProvider } from "@/app/context/OnboardingContext";
import { UpdateBanner } from "@/components/update-banner";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Samurai Insurance",
  description: "Never Worry About Your P&C Insurance Again.",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Samurai Insurance',
  },
};

export const viewport = {
  viewportFit: 'cover',
  themeColor: '#f7f6f3',
};

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${alteHaasGrotesk.variable} ${workSans.variable} ${leagueGothic.variable} antialiased`}
        suppressHydrationWarning
      >
        {/* Skip navigation link for keyboard/screen reader users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only fixed left-4 top-4 z-10003 rounded-md bg-[#de5e48] px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#de5e48] focus:ring-offset-2"
        >
          Skip to main content
        </a>
        <Providers>
          <AuthProvider>
            <OnboardingProvider>
              {children}
              <UpdateBanner />
            </OnboardingProvider>
          </AuthProvider>
        </Providers>
        {process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ID ? (
          <Script
            src="https://va.vercel-scripts.com/v1/script.js"
            strategy="afterInteractive"
            data-analytics-id={process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ID}
          />
        ) : null}
        {GA_MEASUREMENT_ID ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}', {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        ) : null}
        <Analytics />
      </body>
    </html>
  );
}
