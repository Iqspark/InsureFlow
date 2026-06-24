import nodemailer from "nodemailer";

// ── Delivery ──────────────────────────────────────────────────
// Order of preference: Resend (RESEND_API_KEY) → SMTP (SMTP_USER/PASS) →
// Ethereal test inbox (no config; returns a browser preview URL).
// Falls back to a free Ethereal test account otherwise —
// no configuration needed; you get a browser preview URL back.

async function buildTransporter(): Promise<{
  transport: nodemailer.Transporter;
  isTest: boolean;
}> {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const port = parseInt(process.env.SMTP_PORT ?? "587");
    return {
      transport: nodemailer.createTransport({
        host:       process.env.SMTP_HOST ?? "smtp.gmail.com",
        port,
        secure:     port === 465,   // 465 = implicit TLS; 587 = STARTTLS
        requireTLS: port === 587,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      }),
      isTest: false,
    };
  }

  // Auto-create a free Ethereal test account
  const testAccount = await nodemailer.createTestAccount();
  return {
    transport: nodemailer.createTransport({
      host:   "smtp.ethereal.email",
      port:   587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    }),
    isTest: true,
  };
}

// ── Types ────────────────────────────────────────────────────
export interface PolicyEmailData {
  to:              string;
  applicantName:   string;
  appId:           string;
  policyType:      string;
  province:        string;
  annualPremium:   number;
  monthlyPremium:  number;
  coverageAmount:  number;
  deductible:      number;
  brokerName:      string;
  brokerEmail:     string;
}

export interface SendResult {
  sentTo:      string;
  previewUrl?: string; // set when using Ethereal test mode
}

export interface EmailAttachment {
  filename: string;
  content:  Buffer;
}

// Single delivery path used by every sender below.
async function deliver(opts: {
  to:           string;
  subject:      string;
  html:         string;
  text:         string;
  label?:       string; // for the Ethereal console log
  attachments?: EmailAttachment[];
}): Promise<SendResult> {
  const from = process.env.SMTP_FROM ?? `"InsureFlow" <noreply@insureflow.com>`;

  // Preferred: Resend transactional API
  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from,
      to:      opts.to,
      subject: opts.subject,
      html:    opts.html,
      text:    opts.text,
      ...(opts.attachments?.length
        ? { attachments: opts.attachments.map((a) => ({ filename: a.filename, content: a.content })) }
        : {}),
    });
    if (error) throw new Error(`Resend: ${error.message}`);
    return { sentTo: opts.to };
  }

  // Fallback: SMTP (real) or Ethereal (test, with preview URL)
  const { transport, isTest } = await buildTransporter();
  const info = await transport.sendMail({
    from,
    to:      opts.to,
    subject: opts.subject,
    html:    opts.html,
    text:    opts.text,
    ...(opts.attachments?.length
      ? { attachments: opts.attachments.map((a) => ({ filename: a.filename, content: a.content })) }
      : {}),
  });
  const previewUrl = isTest ? (nodemailer.getTestMessageUrl(info) || undefined) : undefined;
  if (previewUrl) console.log(`\n📧 [Ethereal] ${opts.label ?? "Email"} at: ${previewUrl}\n`);
  return { sentTo: opts.to, previewUrl };
}

// ── HTML template ─────────────────────────────────────────────
function buildHtml(d: PolicyEmailData): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 0,
    }).format(n);

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;width:45%">${label}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:600">${value}</td>
    </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 16px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto">
    <!-- Header -->
    <tr>
      <td style="background:#4f46e5;border-radius:12px 12px 0 0;padding:28px 32px;text-align:center">
        <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px">InsureFlow</p>
        <p style="margin:6px 0 0;font-size:13px;color:#a5b4fc">Broker Portal · Policy Confirmation</p>
      </td>
    </tr>

    <!-- Success banner -->
    <tr>
      <td style="background:#ffffff;padding:36px 32px 20px;text-align:center">
        <div style="display:inline-block;width:72px;height:72px;background:#d1fae5;border-radius:50%;line-height:72px;font-size:34px;margin-bottom:20px">✓</div>
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a">Your Policy is Confirmed!</h1>
        <p style="margin:0;font-size:14px;color:#64748b">
          Dear ${d.applicantName}, your <strong>${d.policyType}</strong> policy has been successfully issued.
        </p>
      </td>
    </tr>

    <!-- App ID pill -->
    <tr>
      <td style="background:#ffffff;padding:0 32px 24px;text-align:center">
        <div style="display:inline-block;background:#f0f4ff;border:1px solid #c7d2fe;border-radius:8px;padding:10px 20px">
          <span style="font-size:11px;color:#6366f1;font-weight:600;text-transform:uppercase;letter-spacing:1px">Application ID</span><br>
          <span style="font-size:18px;font-weight:700;color:#4f46e5;font-family:monospace,monospace">${d.appId}</span>
        </div>
      </td>
    </tr>

    <!-- Premium highlight -->
    <tr>
      <td style="background:#ffffff;padding:0 32px 28px">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
          <tr>
            <td style="padding:16px;text-align:center;border-right:1px solid #e2e8f0;width:50%">
              <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Monthly Premium</p>
              <p style="margin:0;font-size:26px;font-weight:700;color:#4f46e5">${fmt(d.monthlyPremium)}</p>
              <p style="margin:2px 0 0;font-size:11px;color:#94a3b8">CAD / month</p>
            </td>
            <td style="padding:16px;text-align:center;width:50%">
              <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Annual Premium</p>
              <p style="margin:0;font-size:26px;font-weight:700;color:#0f172a">${fmt(d.annualPremium)}</p>
              <p style="margin:2px 0 0;font-size:11px;color:#94a3b8">CAD / year</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Policy details table -->
    <tr>
      <td style="background:#ffffff;padding:0 32px 28px">
        <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Policy Details</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
          ${row("Policy Type",       d.policyType)}
          ${row("Province",          d.province)}
          ${row("Coverage Amount",   fmt(d.coverageAmount))}
          ${row("Deductible",        fmt(d.deductible))}
          ${row("Policy Term",       "12 months")}
        </table>
      </td>
    </tr>

    <!-- Next steps -->
    <tr>
      <td style="padding:0 32px 28px;background:#ffffff">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:16px 20px">
          <tr>
            <td style="font-size:13px;color:#92400e">
              <strong>What happens next?</strong><br><br>
              Your assigned broker <strong>${d.brokerName}</strong> will contact you at
              <a href="mailto:${d.to}" style="color:#b45309">${d.to}</a> within 1 business day
              to finalise your policy documents and payment details.
              You can also reach them at <a href="mailto:${d.brokerEmail}" style="color:#b45309">${d.brokerEmail}</a>.
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background:#0f172a;border-radius:0 0 12px 12px;padding:24px 32px;text-align:center">
        <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#e2e8f0">InsureFlow Broker Portal</p>
        <p style="margin:0;font-size:11px;color:#475569">
          This is an automated confirmation. Please do not reply to this email.<br>
          © ${new Date().getFullYear()} InsureFlow. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Public API ────────────────────────────────────────────────
export async function sendPolicyConfirmationEmail(
  data: PolicyEmailData
): Promise<SendResult> {
  return deliver({
    to:      data.to,
    subject: `Policy Confirmed — ${data.policyType} (${data.appId})`,
    html:    buildHtml(data),
    label:   "Policy confirmation",
    text: [
      `Policy Confirmed — InsureFlow`,
      ``,
      `Dear ${data.applicantName},`,
      `Your ${data.policyType} policy has been confirmed.`,
      ``,
      `Application ID : ${data.appId}`,
      `Monthly Premium: ${new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(data.monthlyPremium)}`,
      `Annual Premium : ${new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(data.annualPremium)}`,
      `Coverage       : ${new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(data.coverageAmount)}`,
      `Deductible     : ${new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(data.deductible)}`,
      ``,
      `Your broker ${data.brokerName} (${data.brokerEmail}) will contact you shortly.`,
      ``,
      `— InsureFlow`,
    ].join("\n"),
  });
}

// ── Underwriter / back-office notification ────────────────────
export interface UnderwriterNotificationData {
  to:             string; // underwriter / back-office inbox
  appId:          string;
  policyType:     string;
  applicantName:  string;
  applicantEmail: string;
  applicantPhone: string;
  province:       string;
  annualPremium:  number;
  monthlyPremium: number;
  coverageAmount: number;
  deductible:     number;
  brokerName:     string;
  brokerEmail:    string;
}

function buildUnderwriterHtml(d: UnderwriterNotificationData): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:8px 16px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;width:45%">${label}</td>
      <td style="padding:8px 16px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:600">${value}</td>
    </tr>`;

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px 16px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto">
    <tr>
      <td style="background:#0f172a;border-radius:12px 12px 0 0;padding:22px 32px">
        <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff">InsureFlow · Underwriting</p>
        <p style="margin:4px 0 0;font-size:13px;color:#94a3b8">A policy has just been bound</p>
      </td>
    </tr>
    <tr>
      <td style="background:#ffffff;padding:24px 32px">
        <p style="margin:0 0 16px;font-size:14px;color:#0f172a">
          Broker <strong>${d.brokerName}</strong> has bound the following policy. No action is required unless you wish to review it.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
          ${row("Application ID",  d.appId)}
          ${row("Policy Type",     d.policyType)}
          ${row("Applicant",       d.applicantName)}
          ${row("Applicant Email", d.applicantEmail)}
          ${row("Applicant Phone", d.applicantPhone)}
          ${row("Province",        d.province)}
          ${row("Annual Premium",  fmt(d.annualPremium))}
          ${row("Monthly Premium", fmt(d.monthlyPremium))}
          ${row("Coverage",        fmt(d.coverageAmount))}
          ${row("Deductible",      fmt(d.deductible))}
          ${row("Broker",          `${d.brokerName} (${d.brokerEmail})`)}
        </table>
      </td>
    </tr>
    <tr>
      <td style="background:#0f172a;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center">
        <p style="margin:0;font-size:11px;color:#475569">Automated underwriting notification · © ${new Date().getFullYear()} InsureFlow</p>
      </td>
    </tr>
  </table>
</body></html>`;
}

export async function sendUnderwriterNotificationEmail(
  data: UnderwriterNotificationData
): Promise<SendResult> {
  return deliver({
    to:      data.to,
    subject: `Policy Bound — ${data.policyType} (${data.appId})`,
    html:    buildUnderwriterHtml(data),
    label:   "Underwriter notice",
    text: [
      `Policy Bound — InsureFlow Underwriting`,
      ``,
      `Broker ${data.brokerName} has bound a policy.`,
      ``,
      `Application ID : ${data.appId}`,
      `Policy Type    : ${data.policyType}`,
      `Applicant      : ${data.applicantName} (${data.applicantEmail})`,
      `Phone          : ${data.applicantPhone}`,
      `Province       : ${data.province}`,
      `Annual Premium : ${new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(data.annualPremium)}`,
      `Coverage       : ${new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(data.coverageAmount)}`,
      `Broker         : ${data.brokerName} (${data.brokerEmail})`,
    ].join("\n"),
  });
}

// ── Broker: referred quote approved by underwriter ────────────
export interface QuoteApprovedData {
  to:            string; // broker email
  brokerName:    string;
  applicantName: string;
  appId:         string;
  policyType:    string;
  annualPremium: number;
  reviewNote:    string;
  policyUrl:     string;
}

export async function sendQuoteApprovedEmail(
  d: QuoteApprovedData
): Promise<SendResult> {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px 16px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto">
    <tr><td style="background:#059669;border-radius:12px 12px 0 0;padding:24px 32px">
      <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff">InsureFlow · Underwriting</p>
      <p style="margin:4px 0 0;font-size:13px;color:#a7f3d0">A referred quote was approved</p>
    </td></tr>
    <tr><td style="background:#ffffff;padding:28px 32px">
      <p style="margin:0 0 14px;font-size:14px;color:#0f172a">
        Hi ${d.brokerName}, your referred quote for <strong>${d.applicantName}</strong>
        (<strong>${d.policyType}</strong>, ${fmt(d.annualPremium)}/yr) has been
        <strong style="color:#059669">approved</strong> and is ready to bind.
      </p>
      ${d.reviewNote ? `<p style="margin:0 0 14px;font-size:13px;color:#475569;background:#f8fafc;border-left:4px solid #94a3b8;padding:12px 16px">Underwriter note: ${d.reviewNote}</p>` : ""}
      <p style="margin:0 0 20px;font-size:13px;color:#64748b">Application ID: <strong style="font-family:monospace">${d.appId}</strong></p>
      <a href="${d.policyUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:8px">Review & Bind Policy</a>
    </td></tr>
    <tr><td style="background:#0f172a;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center">
      <p style="margin:0;font-size:11px;color:#475569">Automated notification · © ${new Date().getFullYear()} InsureFlow</p>
    </td></tr>
  </table>
</body></html>`;

  return deliver({
    to:      d.to,
    subject: `Quote Approved — ${d.policyType} (${d.appId})`,
    html,
    label:   "Quote-approved notice",
    text: [
      `Quote Approved — InsureFlow`,
      ``,
      `Hi ${d.brokerName},`,
      `Your referred quote for ${d.applicantName} (${d.policyType}, ${fmt(d.annualPremium)}/yr) was approved and is ready to bind.`,
      d.reviewNote ? `Underwriter note: ${d.reviewNote}` : ``,
      `Application ID: ${d.appId}`,
      `Bind it here: ${d.policyUrl}`,
    ].filter(Boolean).join("\n"),
  });
}

// ── Applicant: payment request (link to pay on our site) ──────
export interface PaymentRequestData {
  to:            string; // applicant email
  applicantName: string;
  appId:         string;
  policyType:    string;
  amount:        number;
  payUrl:        string;
  brokerName:    string;
  portalUrl?:    string; // self-service policy portal (view / download / request changes)
}

export async function sendPaymentRequestEmail(
  d: PaymentRequestData
): Promise<SendResult> {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px 16px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto">
    <tr><td style="background:#4f46e5;border-radius:12px 12px 0 0;padding:28px 32px;text-align:center">
      <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px">InsureFlow</p>
      <p style="margin:6px 0 0;font-size:13px;color:#c7d2fe">Complete Your Payment</p>
    </td></tr>
    <tr><td style="background:#ffffff;padding:32px 32px 8px;text-align:center">
      <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a">Your policy is ready to activate</h1>
      <p style="margin:0;font-size:14px;color:#64748b">
        Dear ${d.applicantName}, your <strong>${d.policyType}</strong> policy has been bound by
        your broker ${d.brokerName}. Pay securely below to activate your coverage.
      </p>
    </td></tr>
    <tr><td style="background:#ffffff;padding:20px 32px 8px;text-align:center">
      <div style="display:inline-block;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px 28px">
        <p style="margin:0 0 2px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Amount Due</p>
        <p style="margin:0;font-size:30px;font-weight:700;color:#4f46e5">${fmt(d.amount)}</p>
        <p style="margin:2px 0 0;font-size:11px;color:#94a3b8">Application ID ${d.appId}</p>
      </div>
    </td></tr>
    <tr><td style="background:#ffffff;padding:24px 32px 32px;text-align:center">
      <a href="${d.payUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px">Pay ${fmt(d.amount)} Now</a>
      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8">Or paste this link into your browser:<br><span style="color:#6366f1;word-break:break-all">${d.payUrl}</span></p>
      ${d.portalUrl ? `<p style="margin:18px 0 0;font-size:13px;color:#64748b">View your policy, download documents, or request a change anytime:<br><a href="${d.portalUrl}" style="color:#4f46e5;font-weight:600;word-break:break-all">${d.portalUrl}</a></p>` : ""}
    </td></tr>
    <tr><td style="background:#0f172a;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center">
      <p style="margin:0;font-size:11px;color:#475569">Secure payment · © ${new Date().getFullYear()} InsureFlow</p>
    </td></tr>
  </table>
</body></html>`;

  return deliver({
    to:      d.to,
    subject: `Complete your payment — ${d.policyType} (${d.appId})`,
    html,
    label:   "Payment request",
    text: [
      `Complete Your Payment — InsureFlow`,
      ``,
      `Dear ${d.applicantName}, your ${d.policyType} policy has been bound by your broker ${d.brokerName}.`,
      `Amount due: ${fmt(d.amount)} (Application ID ${d.appId})`,
      ``,
      `Pay securely here: ${d.payUrl}`,
    ].join("\n"),
  });
}

// ── Applicant: policy cancellation confirmation ───────────────
export interface CancellationData {
  to:            string; // applicant email
  applicantName: string;
  appId:         string;
  policyType:    string;
  cancelledAt:   Date;
  reason:        string;
  brokerName:    string;
}

export async function sendCancellationEmail(
  d: CancellationData
): Promise<SendResult> {
  const on = d.cancelledAt.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px 16px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto">
    <tr><td style="background:#b91c1c;border-radius:12px 12px 0 0;padding:24px 32px;text-align:center">
      <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff">InsureFlow</p>
      <p style="margin:4px 0 0;font-size:13px;color:#fecaca">Policy Cancellation Confirmation</p>
    </td></tr>
    <tr><td style="background:#ffffff;padding:28px 32px">
      <p style="margin:0 0 16px;font-size:14px;color:#0f172a">
        Dear ${d.applicantName}, this confirms that your <strong>${d.policyType}</strong> policy has been cancelled.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
        <tr><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;width:45%">Policy Type</td><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:600">${d.policyType}</td></tr>
        <tr><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px">Application ID</td><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:600;font-family:monospace">${d.appId}</td></tr>
        <tr><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px">Cancelled On</td><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:600">${on}</td></tr>
        ${d.reason ? `<tr><td style="padding:10px 16px;color:#64748b;font-size:13px">Reason</td><td style="padding:10px 16px;color:#0f172a;font-size:13px;font-weight:600">${d.reason}</td></tr>` : ""}
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;background:#fff7ed;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:14px 18px">
        <tr><td style="font-size:13px;color:#92400e">
          A short-rate refund may apply for the unused portion of the term. Your broker
          <strong>${d.brokerName}</strong> will be in touch with the details. If you have
          questions, contact your broker directly.
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="background:#0f172a;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center">
      <p style="margin:0;font-size:11px;color:#475569">Automated cancellation confirmation · © ${new Date().getFullYear()} InsureFlow</p>
    </td></tr>
  </table>
</body></html>`;

  return deliver({
    to:      d.to,
    subject: `Policy Cancelled — ${d.policyType} (${d.appId})`,
    html,
    label:   "Cancellation confirmation",
    text: [
      `Policy Cancellation Confirmation — InsureFlow`,
      ``,
      `Dear ${d.applicantName}, your ${d.policyType} policy has been cancelled.`,
      `Application ID: ${d.appId}`,
      `Cancelled On  : ${on}`,
      d.reason ? `Reason        : ${d.reason}` : ``,
      ``,
      `A short-rate refund may apply. Your broker ${d.brokerName} will be in touch.`,
    ].filter(Boolean).join("\n"),
  });
}

// ── Applicant: mid-term adjustment confirmation ───────────────
export interface AdjustmentData {
  to:            string; // applicant email
  applicantName: string;
  appId:         string;
  policyType:    string;
  oldCoverage:   number;
  newCoverage:   number;
  oldAnnual:     number;
  newAnnual:     number;
  proRata:       number; // positive = additional premium, negative = return premium
  reason:        string;
  brokerName:    string;
}

export async function sendAdjustmentEmail(d: AdjustmentData): Promise<SendResult> {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
  const isAP = d.proRata >= 0;
  const adjLabel = isAP ? "Additional premium due" : "Return premium";
  const adjColor = isAP ? "#b45309" : "#059669";

  const row = (label: string, value: string) => `
    <tr><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;width:50%">${label}</td>
    <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:600">${value}</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px 16px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto">
    <tr><td style="background:#4f46e5;border-radius:12px 12px 0 0;padding:24px 32px;text-align:center">
      <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff">InsureFlow</p>
      <p style="margin:4px 0 0;font-size:13px;color:#c7d2fe">Mid-Term Policy Adjustment</p>
    </td></tr>
    <tr><td style="background:#ffffff;padding:28px 32px">
      <p style="margin:0 0 16px;font-size:14px;color:#0f172a">
        Dear ${d.applicantName}, your <strong>${d.policyType}</strong> policy has been adjusted mid-term.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
        ${row("Application ID", `<span style="font-family:monospace">${d.appId}</span>`)}
        ${row("Coverage Amount", `${fmt(d.oldCoverage)} &rarr; <strong>${fmt(d.newCoverage)}</strong>`)}
        ${row("Annual Premium", `${fmt(d.oldAnnual)} &rarr; <strong>${fmt(d.newAnnual)}</strong>`)}
        ${d.reason ? row("Reason", d.reason) : ""}
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px">
        <tr><td style="padding:16px;text-align:center">
          <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">${adjLabel} (pro-rata)</p>
          <p style="margin:0;font-size:28px;font-weight:700;color:${adjColor}">${fmt(Math.abs(d.proRata))}</p>
          <p style="margin:2px 0 0;font-size:11px;color:#94a3b8">for the remaining policy term</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:13px;color:#64748b">
        Your broker <strong>${d.brokerName}</strong> will be in touch about ${isAP ? "the additional premium" : "your refund"}.
      </p>
    </td></tr>
    <tr><td style="background:#0f172a;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center">
      <p style="margin:0;font-size:11px;color:#475569">Automated adjustment confirmation · © ${new Date().getFullYear()} InsureFlow</p>
    </td></tr>
  </table>
</body></html>`;

  return deliver({
    to:      d.to,
    subject: `Policy Adjusted — ${d.policyType} (${d.appId})`,
    html,
    label:   "Adjustment confirmation",
    text: [
      `Mid-Term Policy Adjustment — InsureFlow`,
      ``,
      `Dear ${d.applicantName}, your ${d.policyType} policy has been adjusted.`,
      `Application ID  : ${d.appId}`,
      `Coverage Amount : ${fmt(d.oldCoverage)} -> ${fmt(d.newCoverage)}`,
      `Annual Premium  : ${fmt(d.oldAnnual)} -> ${fmt(d.newAnnual)}`,
      d.reason ? `Reason          : ${d.reason}` : ``,
      `${adjLabel} (pro-rata): ${fmt(Math.abs(d.proRata))}`,
      ``,
      `Your broker ${d.brokerName} will be in touch.`,
    ].filter(Boolean).join("\n"),
  });
}

// ── Applicant: payment receipt ────────────────────────────────
export interface PaymentReceiptData {
  to:            string; // applicant email
  applicantName: string;
  appId:         string;
  policyType:    string;
  amount:        number;
  paidAt:        Date;
  pdf?:          EmailAttachment; // branded policy document, attached when available
}

export async function sendPaymentReceiptEmail(
  d: PaymentReceiptData
): Promise<SendResult> {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 }).format(n);
  const paidOn = d.paidAt.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px 16px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto">
    <tr><td style="background:#4f46e5;border-radius:12px 12px 0 0;padding:24px 32px;text-align:center">
      <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff">InsureFlow</p>
      <p style="margin:4px 0 0;font-size:13px;color:#c7d2fe">Payment Receipt</p>
    </td></tr>
    <tr><td style="background:#ffffff;padding:28px 32px">
      <p style="margin:0 0 16px;font-size:14px;color:#0f172a">Dear ${d.applicantName}, thank you — your payment has been received.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
        <tr><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;width:45%">Policy Type</td><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:600">${d.policyType}</td></tr>
        <tr><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px">Application ID</td><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:600;font-family:monospace">${d.appId}</td></tr>
        <tr><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px">Date Paid</td><td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:600">${paidOn}</td></tr>
        <tr><td style="padding:14px 16px;color:#64748b;font-size:13px">Amount Paid</td><td style="padding:14px 16px;color:#059669;font-size:18px;font-weight:700">${fmt(d.amount)}</td></tr>
      </table>
    </td></tr>
    <tr><td style="background:#0f172a;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center">
      <p style="margin:0;font-size:11px;color:#475569">Automated receipt · © ${new Date().getFullYear()} InsureFlow</p>
    </td></tr>
  </table>
</body></html>`;

  return deliver({
    to:      d.to,
    subject: `Payment Receipt — ${d.policyType} (${d.appId})`,
    html,
    label:   "Payment receipt",
    attachments: d.pdf ? [d.pdf] : undefined,
    text: [
      `Payment Receipt — InsureFlow`,
      ``,
      `Dear ${d.applicantName}, your payment has been received.`,
      `Policy Type   : ${d.policyType}`,
      `Application ID: ${d.appId}`,
      `Date Paid     : ${paidOn}`,
      `Amount Paid   : ${fmt(d.amount)}`,
    ].join("\n"),
  });
}

// ── Broker: customer change request from the policy portal ────
export interface ChangeRequestData {
  to:            string; // broker email
  brokerName:    string;
  applicantName: string;
  appId:         string;
  policyType:    string;
  message:       string;
  policyUrl:     string; // broker-side policy detail page
}

export async function sendChangeRequestEmail(d: ChangeRequestData): Promise<SendResult> {
  const safeMessage = d.message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px 16px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto">
    <tr><td style="background:#0ea5e9;border-radius:12px 12px 0 0;padding:24px 32px">
      <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff">InsureFlow</p>
      <p style="margin:4px 0 0;font-size:13px;color:#e0f2fe">Customer change request</p>
    </td></tr>
    <tr><td style="background:#ffffff;padding:28px 32px">
      <p style="margin:0 0 16px;font-size:14px;color:#0f172a">
        Hi ${d.brokerName}, <strong>${d.applicantName}</strong> has requested a change to their
        <strong>${d.policyType}</strong> policy (${d.appId}).
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px">
        <tr><td style="padding:16px 18px;font-size:14px;color:#0f172a;white-space:pre-wrap">${safeMessage}</td></tr>
      </table>
      <a href="${d.policyUrl}" style="display:inline-block;margin-top:20px;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:8px">Open Policy</a>
    </td></tr>
    <tr><td style="background:#0f172a;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center">
      <p style="margin:0;font-size:11px;color:#475569">Automated notification · © ${new Date().getFullYear()} InsureFlow</p>
    </td></tr>
  </table>
</body></html>`;

  return deliver({
    to:      d.to,
    subject: `Change request — ${d.policyType} (${d.appId})`,
    html,
    label:   "Change request",
    text: [
      `Customer Change Request — InsureFlow`,
      ``,
      `Hi ${d.brokerName},`,
      `${d.applicantName} has requested a change to their ${d.policyType} policy (${d.appId}).`,
      ``,
      `Message:`,
      d.message,
      ``,
      `Open the policy: ${d.policyUrl}`,
    ].join("\n"),
  });
}
