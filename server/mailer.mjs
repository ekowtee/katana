import nodemailer from 'nodemailer'
import 'dotenv/config'

// SMTP is optional: if creds are absent, we log the link instead of sending,
// so the admin "copy link" flow keeps working before email is configured.
const SMTP_PASS = process.env.SMTP_PASS || process.env.SMTP_PASSWORD
const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && SMTP_PASS)

let transporter = null
if (hasSmtp) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: { user: process.env.SMTP_USER, pass: SMTP_PASS },
  })
}

const FROM = process.env.SMTP_FROM || '"D.A. Twum Jnr. Fellowship" <no-reply@datwumfellowship.org>'
const GOLD = '#C9A84C'
const GREEN = '#08140D'
const PAGE_BG = '#ffffff' // outer email background (behind the green card)

export function magicLinkEmail({ name, link, role }) {
  const audience =
    role === 'candidate'
      ? 'Your interview feedback is ready to view.'
      : 'Access the First Cohort selection portal.'
  return {
    subject: 'Your secure access link — D.A. Twum Jnr. Fellowship',
    text: `Hello ${name || ''},\n\n${audience}\n\nOpen this secure link (valid for 30 minutes):\n${link}\n\nIf you did not request this, you can ignore this email.\n\n— D.A. Twum Jnr. Fellowship`,
    html: `
    <div style="margin:0;padding:0;background:${PAGE_BG};font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE_BG};padding:40px 0;">
        <tr><td align="center">
          <table width="520" cellpadding="0" cellspacing="0" style="background:#0C1E14;border:1px solid #264A35;">
            <tr><td style="padding:40px 44px 24px;">
              <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${GOLD};font-weight:700;">D.A. Twum Jnr. Fellowship</div>
              <div style="height:1px;background:#264A35;margin:18px 0 26px;"></div>
              <h1 style="margin:0 0 14px;font-size:26px;line-height:1.2;color:#F0EBE0;font-weight:600;">Hello ${name || 'there'},</h1>
              <p style="margin:0 0 26px;font-size:14px;line-height:1.7;color:#C8C2B4;">${audience}</p>
              <a href="${link}" style="display:inline-block;background:${GOLD};color:${GREEN};text-decoration:none;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:15px 34px;">Open Secure Portal</a>
              <p style="margin:26px 0 0;font-size:11px;line-height:1.6;color:#7d8a80;">This link is valid for 30 minutes and can be used once. If you didn’t request it, simply ignore this email.</p>
            </td></tr>
            <tr><td style="padding:20px 44px;border-top:1px solid #1E3B29;">
              <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#5d6b60;">First Cohort · Selection Portal</div>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </div>`,
  }
}

const REPLY_TO = process.env.SMTP_REPLY_TO || process.env.SMTP_FROM

export async function sendMagicLink({ to, name, link, role }) {
  console.log(`\n[mailer] Access link generated for ${to}:\n${link}\n`)
  const msg = magicLinkEmail({ name, link, role })
  if (!transporter) {
    return { delivered: false, reason: 'smtp_not_configured' }
  }
  try {
    const info = await transporter.sendMail({
      from: FROM, to, replyTo: REPLY_TO, subject: msg.subject, text: msg.text, html: msg.html,
    })
    console.log(`[mailer] sent to ${to} — id ${info.messageId} — accepted ${JSON.stringify(info.accepted)} rejected ${JSON.stringify(info.rejected)} — ${info.response}`)
    const accepted = (info.accepted || []).map((a) => String(a).toLowerCase()).includes(to.toLowerCase())
    return { delivered: accepted, messageId: info.messageId, response: info.response }
  } catch (e) {
    console.error(`[mailer] send FAILED to ${to}: ${e.message}${e.response ? ' — ' + e.response : ''}`)
    return { delivered: false, reason: 'send_failed', error: e.message }
  }
}

export const smtpConfigured = hasSmtp
