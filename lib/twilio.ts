import Twilio from "twilio";

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return null;
  }

  return Twilio(accountSid, authToken);
}

export function isTwilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_FROM
  );
}

/** E.164 phone → whatsapp:+... */
export function toWhatsAppAddress(e164Phone: string): string {
  const digits = e164Phone.startsWith("+") ? e164Phone : `+${e164Phone}`;
  return `whatsapp:${digits}`;
}

export async function sendWhatsAppOTP(
  e164Phone: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const client = getTwilioClient();
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!client || !from) {
    return {
      success: false,
      error: "WhatsApp OTP is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM.",
    };
  }

  try {
    await client.messages.create({
      from,
      to: toWhatsAppAddress(e164Phone),
      body: `Your OneWayOut verification code is: ${code}. It expires in ${process.env.OTP_EXPIRY_MINUTES ?? "5"} minutes. Do not share this code.`,
    });
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to send WhatsApp message.";
    return { success: false, error: msg };
  }
}
