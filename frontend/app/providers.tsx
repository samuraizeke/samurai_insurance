'use client';

import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? '';

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  // If no site key is configured, render children without the provider
  // This allows the app to function (with degraded captcha) if the key is missing
  if (!RECAPTCHA_SITE_KEY) {
    return <>{children}</>;
  }

  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={RECAPTCHA_SITE_KEY}
      scriptProps={{
        async: true,
        defer: true,
        appendTo: 'body',
      }}
    >
      {children}
    </GoogleReCaptchaProvider>
  );
}
