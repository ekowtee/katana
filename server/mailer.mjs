import nodemailer from 'nodemailer'
import 'dotenv/config'
import { smtpConfig } from './settings.mjs'

// SMTP is optional: if it isn't configured (Admin → Settings, or the SMTP_*
// env vars), we log the link instead of sending, so the admin "copy link"
// flow keeps working before email is set up.

// Emails always come from "Ninani Group HR". The From setting supplies only
// the address; any display name in it is ignored.
const SENDER_NAME = 'Ninani Group HR'
const addressOf = (value) => (value?.match(/<([^>]+)>/)?.[1] || value || '').trim()

// One transporter per distinct configuration, rebuilt when settings change.
let cached = { key: null, transporter: null }
async function transport() {
  const cfg = await smtpConfig()
  if (!cfg) return null
  const key = JSON.stringify([cfg.host, cfg.port, cfg.secure, cfg.user, cfg.pass])
  if (cached.key !== key) {
    cached = {
      key,
      transporter: nodemailer.createTransport({
        host: cfg.host, port: cfg.port, secure: cfg.secure,
        auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
      }),
    }
  }
  const from = { name: SENDER_NAME, address: addressOf(cfg.from) || addressOf(cfg.user) || 'no-reply@datwumfellowship.org' }
  return { transporter: cached.transporter, from, replyTo: cfg.replyTo || from }
}
const GOLD = '#C9A84C'
const GREEN = '#08140D'
const PAGE_BG = '#ffffff' // outer email background (behind the green card)

export function magicLinkEmail({ name, link, role }) {
  const audience =
    role === 'candidate'
      ? 'Your interview feedback is ready to view.'
      : 'Access The Ninani Group Fellowship selection portal.'
  return {
    subject: `Your secure access link — ${SENDER_NAME}`,
    text: `Hello ${name || ''},\n\n${audience}\n\nOpen this secure link (valid for 30 minutes):\n${link}\n\nIf you did not request this, you can ignore this email.\n\n— ${SENDER_NAME}`,
    html: `
    <div style="margin:0;padding:0;background:${PAGE_BG};font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE_BG};padding:40px 0;">
        <tr><td align="center">
          <table width="520" cellpadding="0" cellspacing="0" style="background:#0C1E14;border:1px solid #264A35;">
            <tr><td style="padding:40px 44px 24px;">
              <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${GOLD};font-weight:700;">${SENDER_NAME}</div>
              <div style="height:1px;background:#264A35;margin:18px 0 26px;"></div>
              <h1 style="margin:0 0 14px;font-size:26px;line-height:1.2;color:#F0EBE0;font-weight:600;">Hello ${name || 'there'},</h1>
              <p style="margin:0 0 26px;font-size:14px;line-height:1.7;color:#C8C2B4;">${audience}</p>
              <a href="${link}" style="display:inline-block;background:${GOLD};color:${GREEN};text-decoration:none;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:15px 34px;">Open Secure Portal</a>
              <p style="margin:26px 0 0;font-size:11px;line-height:1.6;color:#7d8a80;">This link is valid for 30 minutes and can be used once. If you didn’t request it, simply ignore this email.</p>
            </td></tr>
            <tr><td style="padding:20px 44px;border-top:1px solid #1E3B29;">
              <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#5d6b60;">The Ninani Group Fellowship · Selection Portal</div>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </div>`,
  }
}

export async function sendMagicLink({ to, name, link, role }) {
  console.log(`\n[mailer] Access link generated for ${to}:\n${link}\n`)
  return send(to, magicLinkEmail({ name, link, role }))
}

// Admin → Settings "Send test email".
export async function sendTestEmail(to) {
  const line = 'This is a test from the Katana portal. If you can read it, email delivery is working.'
  return send(to, {
    subject: `Test email — ${SENDER_NAME}`,
    text: `${line}\n\n— ${SENDER_NAME}`,
    html: `<p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;">${line}</p><p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;color:#555;">— ${SENDER_NAME}</p>`,
  })
}

async function send(to, msg) {
  const t = await transport()
  if (!t) return { delivered: false, reason: 'smtp_not_configured' }
  try {
    const info = await t.transporter.sendMail({
      from: t.from, to, replyTo: t.replyTo, subject: msg.subject, text: msg.text, html: msg.html,
    })
    console.log(`[mailer] sent to ${to} — id ${info.messageId} — accepted ${JSON.stringify(info.accepted)} rejected ${JSON.stringify(info.rejected)} — ${info.response}`)
    const accepted = (info.accepted || []).map((a) => String(a).toLowerCase()).includes(to.toLowerCase())
    return { delivered: accepted, messageId: info.messageId, response: info.response }
  } catch (e) {
    console.error(`[mailer] send FAILED to ${to}: ${e.message}${e.response ? ' — ' + e.response : ''}`)
    return { delivered: false, reason: 'send_failed', error: e.message }
  }
}

export const smtpConfigured = async () => !!(await smtpConfig())
