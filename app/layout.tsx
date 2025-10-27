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
        <Analytics />
      </body>
    </html>
  );
}
