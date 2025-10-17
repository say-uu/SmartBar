# EmailJS Setup (Smart Bar)

Follow these steps once to enable email receipts from the frontend.

## 1) Create EmailJS account and service

- Go to https://www.emailjs.com/
- Create an account (free tier is fine).
- In Dashboard → Email Services, click “Add new service” and connect your email provider (Gmail/Outlook/other).

## 2) Create a template

- Go to Email Templates → “Create new template”.
- Set a descriptive name, e.g. `smartbar_receipt`.
- Add variables (use double curly braces) in Subject and Content. Example:

Subject:

```
Smartbar Bill - Order {{order_id}}
```

Plain text (example):

```
SMARTBAR
Purchase Receipt

Receipt ID: {{order_id}}
Date: {{order_date}}
Payment Method: {{payment_method}}

Items:
{{items}}

Total: {{total}}

Paid from Monthly Allowance: {{allowance_used}}
Paid via (cash/card): {{cash_or_card_due}}

Remaining Allowance: {{remaining_allowance}}
```

You can also create an HTML version in your EmailJS template if you prefer rich formatting.

## 3) Get your keys

- In Account → API Keys: copy your **Public Key**.
- In Email Services: copy your **Service ID**.
- In Email Templates: copy your **Template ID**.

## 4) Configure the frontend `.env`

- Copy values into `frontend/.env`:

```
VITE_EMAILJS_PUBLIC_KEY=pk_xxxxxxxxx
VITE_EMAILJS_SERVICE_ID=service_xxxxxxx
VITE_EMAILJS_TEMPLATE_ID=template_xxxxxxx
```

- Restart the frontend dev server after editing `.env`.

## 5) Test

- Place an order in the app.
- The Purchase Success page will trigger EmailJS sending.
- You should see an email delivered to the cadet email shown on the success page.

## Troubleshooting

- If the success page says “Email service is not configured.” → Check `.env` keys and restart the dev server.
- If emails don’t arrive, check EmailJS logs in the dashboard.
- For Gmail, ensure your account allows the sending method you configured (consider App Passwords on Google accounts with 2FA).
