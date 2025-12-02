import { z } from "zod";

const waitlistBaseSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Enter a valid email address"),
  marketingConsent: z
    .boolean()
    .refine((value) => value === true, "Marketing consent is required"),
});

export const waitlistSchema = waitlistBaseSchema.extend({
  source: z.enum(["Lander", "Facebook"]),
});

export const waitlistSubmissionSchema = waitlistSchema.extend({
  captchaToken: z
    .string()
    .trim()
    .min(1, "Please complete the captcha challenge"),
});

export type WaitlistFormValues = z.infer<typeof waitlistBaseSchema>;
export type WaitlistPayload = z.infer<typeof waitlistSubmissionSchema>;
