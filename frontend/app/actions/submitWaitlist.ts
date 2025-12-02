'use server';

import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import {
  waitlistSubmissionSchema,
  type WaitlistPayload,
} from "@/lib/schemas";
import { sendWaitlistWelcomeEmail } from "@/lib/emailjs";

export type WaitlistActionResult =
  | { success: true }
  | { success: false; errors: Record<string, string[]> };

const RECAPTCHA_VERIFY_URL =
  "https://www.google.com/recaptcha/api/siteverify";

export async function submitWaitlist(
  payload: WaitlistPayload
): Promise<WaitlistActionResult> {
  const parsed = waitlistSubmissionSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { captchaToken, ...waitlistData } = parsed.data;

  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    console.error("Missing reCAPTCHA secret key");
    return {
      success: false,
      errors: {
        captchaToken: [
          "Captcha validation is temporarily unavailable. Please try again later.",
        ],
      },
    };
  }

  const verificationResponse = await fetch(RECAPTCHA_VERIFY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      secret: secretKey,
      response: captchaToken,
    }).toString(),
  }).catch((error) => {
    console.error("Failed to verify reCAPTCHA token", error);
    return null;
  });

  if (!verificationResponse) {
    return {
      success: false,
      errors: {
        captchaToken: ["Captcha verification failed. Please try again."],
      },
    };
  }

  let verificationJson: unknown;

  try {
    verificationJson = await verificationResponse.json();
  } catch (error) {
    console.error("Failed to parse reCAPTCHA verification response", error);
    return {
      success: false,
      errors: {
        captchaToken: ["Captcha verification failed. Please try again."],
      },
    };
  }

  const verificationSuccess =
    typeof verificationJson === "object" &&
    verificationJson !== null &&
    "success" in verificationJson &&
    Boolean((verificationJson as { success: boolean }).success);

  if (!verificationSuccess) {
    return {
      success: false,
      errors: {
        captchaToken: ["Please verify that you are not a robot."],
      },
    };
  }

  const supabase = createSupabaseServerClient();
  const { firstName, lastName, email, source } = waitlistData;
  const normalizedEmail = email.toLowerCase();

  const { data: existingEntries, error: fetchError } = await supabase
    .from("waitlist")
    .select("id")
    .ilike("email", normalizedEmail)
    .limit(1);

  if (fetchError) {
    console.error("Failed to check existing waitlist entry", fetchError);
    return {
      success: false,
      errors: {},
    };
  }

  if (existingEntries && existingEntries.length > 0) {
    return {
      success: false,
      errors: {
        email: ["That email is already on the waitlist."],
      },
    };
  }

  const { error: insertError } = await supabase.from("waitlist").insert({
    first_name: firstName,
    last_name: lastName,
    email: normalizedEmail,
    source,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return {
        success: false,
        errors: {
          email: ["That email is already on the waitlist."],
        },
      };
    }

    console.error("Failed to insert waitlist submission", insertError);
    return {
      success: false,
      errors: {},
    };
  }

  await sendWaitlistWelcomeEmail({
    firstName,
    lastName,
    email: normalizedEmail,
  });

  return { success: true };
}
