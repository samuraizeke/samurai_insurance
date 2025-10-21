import localFont from "next/font/local";
import { Work_Sans } from "next/font/google";

export const alteHaasGrotesk = localFont({
  src: [
    {
      path: "../public/fonts/AlteHaasGroteskRegular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/AlteHaasGroteskBold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
  fallback: [],
});

export const workSans = Work_Sans({
  weight: "400",
  subsets: ["latin"],
});
