import emailjs from "@emailjs/browser";

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID; // receipt template
const WELCOME_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_WELCOME_TEMPLATE_ID; // required for welcome emails
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

const mask = (s) => {
  if (!s) return "<empty>";
  const str = String(s);
  if (str.length <= 6)
    return `${str[0] ?? "*"}***${str[str.length - 1] ?? "*"}`;
  return `${str.slice(0, 3)}***${str.slice(-3)}`;
};

export function isEmailJSEnabled() {
  const ok = !!(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY);
  if (!ok) {
    console.warn("[EmailJS] Missing env:", {
      serviceId: mask(SERVICE_ID),
      templateId: mask(TEMPLATE_ID),
      publicKey: mask(PUBLIC_KEY),
    });
  }
  return ok;
}

export function isWelcomeEmailEnabled() {
  const ok = !!(SERVICE_ID && PUBLIC_KEY && WELCOME_TEMPLATE_ID);
  if (!ok) {
    console.warn(
      "[EmailJS] Welcome email disabled - missing VITE_EMAILJS_WELCOME_TEMPLATE_ID or service/public key."
    );
  }
  return ok;
}

export async function sendReceiptEmail({ toEmail, toName, order, cadet }) {
  if (!isEmailJSEnabled()) {
    console.info("[EmailJS] Disabled - missing Vite env variables");
    return { sent: false, skipped: true };
  }
  if (!toEmail || !String(toEmail).includes("@")) {
    console.warn("[EmailJS] Missing or invalid recipient email", { toEmail });
    return { sent: false, error: "Recipient email is missing or invalid" };
  }
  console.log("[EmailJS] Sending via:", {
    serviceId: mask(SERVICE_ID),
    templateId: mask(TEMPLATE_ID),
    publicKey: mask(PUBLIC_KEY),
    toEmail,
  });
  const total = Number(order?.total || 0).toFixed(2);
  const allowanceUsed = Number(order?.allowanceUsed || 0).toFixed(2);
  const cashOrCardDue = Number(order?.cashOrCardDue || 0).toFixed(2);
  const itemsList = (order?.items || [])
    .map((i) => `${i.name} - Rs.${i.price} x${i.qty}`)
    .join("\n");

  const templateParams = {
    // Primary variables used by our template guidance
    to_email: toEmail,
    to_name: toName || cadet?.name || "Cadet",
    order_id: order?.orderId || "-",
    order_date: new Date(order?.createdAt || Date.now()).toLocaleString(),
    payment_method: order?.paymentMethod || "Monthly Allowance",
    items: itemsList,
    total: `Rs.${total}`,
    allowance_used: allowanceUsed > 0 ? `Rs.${allowanceUsed}` : "Rs.0.00",
    cash_or_card_due: cashOrCardDue > 0 ? `Rs.${cashOrCardDue}` : "Rs.0.00",
    remaining_allowance: `Rs.${Number(cadet?.monthlyAllowance || 0).toFixed(
      2
    )}`,
    // Additional common aliases many EmailJS templates use
    subject: `Smartbar Bill - Order ${order?.orderId || ""}`,
    receipt_id: order?.orderId || "-",
    date: new Date(order?.createdAt || Date.now()).toLocaleString(),
    paymentmethod: order?.paymentMethod || "Monthly Allowance",
    items_list: itemsList,
    total_amount: `Rs.${total}`,
    allowance: allowanceUsed,
    cash_card_due: cashOrCardDue,
    // Compatibility with default EmailJS templates someone may start from
    email: toEmail, // some templates expect {{email}}
    name: toName || cadet?.name || "Cadet", // some templates expect {{name}}
    title: `Smartbar Order ${order?.orderId || ""}`, // some templates expect {{title}}
  };

  try {
    const res = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, {
      publicKey: PUBLIC_KEY,
    });
    return { sent: true, status: res.status, text: res.text };
  } catch (err) {
    const status = err?.status;
    const text = err?.text;
    console.error("[EmailJS] send failed:", err);
    return { sent: false, error: err?.message || text || String(err), status };
  }
}

export async function sendWelcomeEmail({ toEmail, toName }) {
  if (!isWelcomeEmailEnabled()) {
    return { sent: false, skipped: true };
  }
  if (!toEmail || !String(toEmail).includes("@")) {
    return { sent: false, error: "Recipient email is missing or invalid" };
  }
  const params = {
    to_email: toEmail,
    to_name: toName || "Cadet",
    email: toEmail,
    name: toName || "Cadet",
    subject: "Welcome to Smartbar",
    title: "Welcome to Smartbar",
    message:
      "Welcome to Smartbar! Your account is ready. You can now make purchases. Enjoy!",
  };
  // Common aliases many EmailJS default templates expect
  const aliases = {
    from_name: toName || "Cadet",
    user_name: toName || "Cadet",
    from_email: toEmail,
    reply_to: toEmail,
    to: toEmail,
  };
  const templateId = WELCOME_TEMPLATE_ID; // require dedicated welcome template to avoid sending receipt by mistake
  try {
    console.log("[EmailJS] Sending welcome via:", {
      serviceId: mask(SERVICE_ID),
      templateId: mask(templateId),
      publicKey: mask(PUBLIC_KEY),
      toEmail,
    });
    const res = await emailjs.send(
      SERVICE_ID,
      templateId,
      { ...aliases, ...params },
      {
        publicKey: PUBLIC_KEY,
      }
    );
    return { sent: true, status: res.status, text: res.text };
  } catch (err) {
    const status = err?.status;
    const text = err?.text;
    console.error("[EmailJS] welcome send failed:", {
      status,
      text,
      message: err?.message,
      data: err,
    });
    return { sent: false, error: err?.message || text || String(err), status };
  }
}
