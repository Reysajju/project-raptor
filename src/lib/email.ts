import nodemailer from "nodemailer";

/**
 * Gmail SMTP email sender. Uses the GMAIL_USER and GMAIL_APP_PASSWORD
 * environment variables to send emails via Gmail's SMTP server.
 *
 * Setup: https://support.google.com/accounts/answer/185833 (app password)
 */

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error(
      "GMAIL_USER and GMAIL_APP_PASSWORD must be set in .env to send emails"
    );
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  return transporter;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
  const t = getTransporter();
  const from = process.env.GMAIL_USER || "noreply@raptorportal.app";

  const info = await t.sendMail({
    from: `"Raptor Portal" <${from}>`,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ""),
  });

  return info;
}

/**
 * Send a magic-link login email.
 */
export async function sendMagicLinkEmail(email: string, magicLink: string, isNewUser: boolean) {
  const action = isNewUser ? "Create your account" : "Sign in to your account";
  const greeting = isNewUser
    ? "Welcome to Raptor Portal! Click the button below to create your account."
    : "Click the button below to sign in to your Raptor Portal account.";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#16161f;border-radius:16px;overflow:hidden;border:1px solid #26263a;">

          <!-- Logo -->
          <tr>
            <td style="padding:32px 40px 0;text-align:center;">
              <div style="display:inline-block;width:48px;height:48px;background:#7c3aed;border-radius:12px;line-height:48px;text-align:center;font-size:24px;color:#fff;font-weight:bold;">R</div>
              <h1 style="color:#e5e5f0;font-size:20px;font-weight:600;margin:16px 0 4px;">Raptor Portal</h1>
              <p style="color:#8a8a9e;font-size:13px;margin:0;">Client workspace, reimagined.</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:24px 40px 0;">
              <p style="color:#b8b8cc;font-size:15px;line-height:1.6;margin:0 0 8px;">
                ${greeting}
              </p>
              <p style="color:#6a6a80;font-size:13px;margin:0 0 24px;">
                This link expires in 15 minutes. If you didn't request it, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Button -->
          <tr>
            <td style="padding:0 40px 32px;" align="center">
              <a href="${magicLink}" style="display:inline-block;background:#7c3aed;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">
                ${action} →
              </a>
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td style="padding:0 40px 8px;">
              <p style="color:#4a4a60;font-size:12px;margin:0 0 4px;">Or copy this link:</p>
              <p style="color:#6a6a80;font-size:11px;margin:0 0 24px;word-break:break-all;font-family:monospace;background:#1a1a2e;padding:8px 12px;border-radius:6px;border:1px solid #26263a;">
                ${magicLink}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 40px 32px;">
              <hr style="border:none;border-top:1px solid #26263a;margin:0 0 16px;">
              <p style="color:#4a4a60;font-size:11px;line-height:1.5;margin:0;">
                Raptor Portal — Production-grade client management.<br>
                You received this email because someone requested a magic link for ${email}.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return sendEmail({
    to: email,
    subject: isNewUser ? "Welcome to Raptor Portal — confirm your account" : "Sign in to Raptor Portal",
    html,
    text: `${greeting}\n\n${magicLink}\n\nThis link expires in 15 minutes.`,
  });
}
