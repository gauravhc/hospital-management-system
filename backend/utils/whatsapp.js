const twilio = require("twilio");

const hasTwilioConfig = () =>
  Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_NUMBER) &&
  !String(process.env.TWILIO_ACCOUNT_SID).includes("your_") &&
  !String(process.env.TWILIO_AUTH_TOKEN).includes("your_");

const getClient = () =>
  twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const normalizeTo = (to) => {
  if (!to) return "";
  const raw = String(to).trim();
  if (!raw) return "";

  const withoutPrefix = raw.replace(/^whatsapp:/i, "");
  const digits = withoutPrefix.replace(/[^\d+]/g, "");
  if (!digits) return "";
  return digits.startsWith("+") ? digits : `+${digits}`;
};

const sendWhatsApp = async (to, message) => {
  try {
    if (!hasTwilioConfig()) {
      console.warn(
        "WhatsApp skipped: missing/placeholder TWILIO_* env configuration (set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER)"
      );
      return;
    }

    const normalized = normalizeTo(to);
    if (!normalized) {
      console.warn("WhatsApp skipped: invalid destination number");
      return;
    }

    const body = String(message || "").trim();
    if (!body) {
      console.warn("WhatsApp skipped: empty message body");
      return;
    }

    const client = getClient();
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:${normalized}`,
      body,
    });
    console.log("WhatsApp message sent");
  } catch (err) {
    console.error("WhatsApp error:", err.message);
  }
};

module.exports = sendWhatsApp;
