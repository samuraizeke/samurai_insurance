import type { Metadata } from "next";
import { alteHaasGrotesk, workSans } from "@/lib/fonts";
import Script from "next/script";
import "./globals.css";
import CustomCursor from "./components/CustomCursor";
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: "Samurai Insurance",
  description: "Never Worry About Your P&C Insurance Again.",
  icons: {
    icon: [{ url: '/icon.png', type: 'image/png' }], // ensure this exists
  }
};

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${alteHaasGrotesk.variable} ${workSans.variable} antialiased`}
      >
        <CustomCursor />
        {children}
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
