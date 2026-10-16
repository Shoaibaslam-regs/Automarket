// Sends SMS for phone verification. Uses Twilio's REST API when TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and
// TWILIO_FROM (a phone number or Messaging Service SID) are set. Without them, development prints the
// message in the server log and production refuses, so a missing setup is never silently "sent".

export class SmsNotConfiguredError extends Error {
  constructor() {
    super("SMS isn't set up on this server");
  }
}

export function smsConfigured(): boolean {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
}

export async function sendSms(to: string, body: string): Promise<void> {
  if (!smsConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n[SMS not configured, development only] To ${to}: ${body}\n`);
      return;
    }
    throw new SmsNotConfiguredError();
  }
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const from = process.env.TWILIO_FROM!;
  const params = new URLSearchParams({ To: to, Body: body });
  // A Messaging Service SID starts with "MG"; otherwise it's a sending number
  params.set(from.startsWith("MG") ? "MessagingServiceSid" : "From", from);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`SMS send failed (${res.status}): ${detail.slice(0, 200)}`);
  }
}
