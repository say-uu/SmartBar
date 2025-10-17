const nodemailer = require("nodemailer");

let cachedTransporter = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } =
    process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    console.warn(
      "[email] SMTP env (SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS) not fully set - email sending is disabled."
    );
    return null;
  }

  const secure =
    String(SMTP_SECURE).toLowerCase() === "true" || Number(SMTP_PORT) === 465;

  cachedTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return cachedTransporter;
}

async function sendOrderEmail({ to, subject, text, html }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.info(
      `[email] Skipping send to ${to} (email disabled - missing SMTP configuration)`
    );
    return { sent: false, skipped: true };
  }

  const from = process.env.MAIL_FROM || process.env.SMTP_USER;

  try {
    const info = await transporter.sendMail({ from, to, subject, text, html });
    console.log("[email] Sent order email:", info.messageId);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error("[email] Send failed:", err);
    throw err;
  }
}

module.exports = {
  sendOrderEmail,
};
