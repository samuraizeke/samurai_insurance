import type { Metadata } from "next";
import { alteHaasGrotesk, workSans } from "@/lib/fonts";
import "./globals.css";
import CustomCursor from "./components/CustomCursor";

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
      </body>
    </html>
  );
}
