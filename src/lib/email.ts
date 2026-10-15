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

/**
 * Send an invitation email to a new or existing client / team member.
 */
export async function sendInvitationEmail({
  email,
  name,
  role,
  inviteLink,
  companyName,
  projectName,
  taskTitle,
  inviterName = "Workspace Admin",
}: {
  email: string;
  name: string;
  role: "client" | "member" | string;
  inviteLink: string;
  companyName?: string;
  projectName?: string;
  taskTitle?: string;
  inviterName?: string;
}) {
  const isClientRole = role === "client";
  const roleLabel = isClientRole ? "Client" : "Team Member";
  const subject = `You've been invited to Raptor Portal as a ${roleLabel}`;

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
        <table width="520" cellpadding="0" cellspacing="0" style="background:#16161f;border-radius:16px;overflow:hidden;border:1px solid #26263a;">

          <!-- Logo & Header -->
          <tr>
            <td style="padding:36px 40px 0;text-align:center;">
              <div style="display:inline-block;width:52px;height:52px;background:#7c3aed;border-radius:14px;line-height:52px;text-align:center;font-size:26px;color:#fff;font-weight:bold;box-shadow:0 8px 24px rgba(124,58,237,0.35);">R</div>
              <h1 style="color:#f3f4f6;font-size:22px;font-weight:700;margin:18px 0 6px;letter-spacing:-0.5px;">Raptor Portal</h1>
              <p style="color:#9ca3af;font-size:13px;margin:0;">Invitation to join project workspace</p>
            </td>
          </tr>

          <!-- Greeting & Details -->
          <tr>
            <td style="padding:28px 40px 0;">
              <p style="color:#e5e7eb;font-size:16px;line-height:1.6;margin:0 0 12px;">
                Hello <strong>${name || "there"}</strong>,
              </p>
              <p style="color:#d1d5db;font-size:14px;line-height:1.6;margin:0 0 16px;">
                <strong>${inviterName}</strong> has invited you to access the Raptor Portal as a 
                <span style="display:inline-block;background:#2e1065;color:#c4b5fd;border:1px solid #7c3aed;padding:2px 10px;border-radius:9999px;font-size:12px;font-weight:600;text-transform:uppercase;">${roleLabel}</span>
                ${companyName ? `for <strong>${companyName}</strong>` : ""}.
              </p>

              ${(projectName || taskTitle) ? `
              <div style="background:#1a1a2e;border:1px solid #2e2e4a;border-radius:10px;padding:14px 18px;margin:0 0 20px;">
                <p style="color:#a78bfa;font-size:12px;font-weight:600;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.5px;">Your Assigned Work</p>
                ${projectName ? `<p style="color:#e2e8f0;font-size:13px;margin:0 0 4px;">📁 <strong>Project:</strong> ${projectName}</p>` : ""}
                ${taskTitle ? `<p style="color:#e2e8f0;font-size:13px;margin:0;">📋 <strong>Assigned Task:</strong> ${taskTitle}</p>` : ""}
              </div>` : ""}

              <p style="color:#9ca3af;font-size:13px;line-height:1.5;margin:0 0 24px;">
                Please click the button below to verify your email ownership and activate your access. You won't need to remember a password — your login is verified securely.
              </p>
            </td>
          </tr>

          <!-- Action Button -->
          <tr>
            <td style="padding:0 40px 32px;" align="center">
              <a href="${inviteLink}" style="display:inline-block;background:#7c3aed;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 34px;border-radius:10px;box-shadow:0 4px 14px rgba(124,58,237,0.4);">
                Accept Invitation & Verify Account →
              </a>
            </td>
          </tr>

          <!-- Direct Link Fallback -->
          <tr>
            <td style="padding:0 40px 8px;">
              <p style="color:#6b7280;font-size:12px;margin:0 0 6px;">Button not working? Paste this link into your browser:</p>
              <p style="color:#9ca3af;font-size:11px;margin:0 0 20px;word-break:break-all;font-family:monospace;background:#13131c;padding:10px 14px;border-radius:8px;border:1px solid #26263a;">
                ${inviteLink}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 40px 32px;">
              <hr style="border:none;border-top:1px solid #26263a;margin:0 0 16px;">
              <p style="color:#6b7280;font-size:11px;line-height:1.5;margin:0;">
                This invitation is valid for 7 days. If you were not expecting this invitation, you can safely ignore this email.<br>
                Raptor Portal · High-performance client management.
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
    subject,
    html,
    text: `Hello ${name},\n\nYou have been invited to join Raptor Portal as a ${roleLabel}${companyName ? ` (${companyName})` : ""}.\n${projectName ? `Project: ${projectName}\n` : ""}${taskTitle ? `Assigned task: ${taskTitle}\n` : ""}\nClick the link below to verify your account:\n${inviteLink}\n\nThis link is valid for 7 days.`,
  });
}

