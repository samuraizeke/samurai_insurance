const EMAILJS_ENDPOINT = "https://api.emailjs.com/api/v1.0/email/send";

type WaitlistEmailParams = {
  firstName: string;
  lastName: string;
  email: string;
};

export async function sendWaitlistWelcomeEmail({
  firstName,
  lastName,
  email,
}: WaitlistEmailParams): Promise<boolean> {
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    console.error("Missing EmailJS configuration values", {
      hasServiceId: Boolean(serviceId),
      hasTemplateId: Boolean(templateId),
      hasPublicKey: Boolean(publicKey),
      hasPrivateKey: Boolean(privateKey),
    });
    return false;
  }

  const templateParams = {
    to_name: `${firstName} ${lastName}`.trim(),
    to_email: email,
    first_name: firstName,
    last_name: lastName,
    email,
  };

  try {
    const response = await fetch(EMAILJS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        accessToken: privateKey,
        template_params: templateParams,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("Failed to send waitlist email via EmailJS", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error("Unexpected error sending waitlist email via EmailJS", error);
    return false;
  }
}
