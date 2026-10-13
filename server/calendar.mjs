// iCalendar (.ics) invitations for interview slots, attached to the
// invitation emails (server/mailer.mjs). Outlook, Google Calendar and Apple
// Calendar all add METHOD:REQUEST events straight into the calendar; a later
// send with the same UID and a higher SEQUENCE updates it, and METHOD:CANCEL
// removes it.

const pad = (n) => String(n).padStart(2, '0')

// 20261013T143000Z
export const icsDate = (d) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`

// RFC 5545 text: escape backslash, semicolon, comma and newlines.
const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

// Lines longer than 75 octets are folded with CRLF + space.
function fold(line) {
  const out = []
  let bytes = 0, start = 0
  for (let i = 0; i < line.length; i++) {
    const b = Buffer.byteLength(line[i])
    if (bytes + b > (out.length ? 74 : 75)) { out.push(line.slice(start, i)); start = i; bytes = 0 }
    bytes += b
  }
  out.push(line.slice(start))
  return out.join('\r\n ')
}

export const interviewUid = (candidateSlug, host) => `interview-${candidateSlug}@${host}`

/**
 * One VEVENT. `attendees` get RSVP requests; `organizer` is the HR mailbox.
 * method: 'REQUEST' (create / update) or 'CANCEL'.
 */
export function buildIcs({ uid, sequence = 0, method = 'REQUEST', start, minutes = 45, summary, description = '', location = '', url = '', organizer, attendees = [] }) {
  const end = new Date(start.getTime() + minutes * 60_000)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Katana//Interview Portal//EN',
    'CALSCALE:GREGORIAN',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:${esc(uid)}`,
    `SEQUENCE:${sequence}`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${esc(summary)}`,
    description ? `DESCRIPTION:${esc(description)}` : null,
    location ? `LOCATION:${esc(location)}` : null,
    url ? `URL:${esc(url)}` : null,
    organizer ? `ORGANIZER;CN=${esc(organizer.name)}:mailto:${organizer.email}` : null,
    ...attendees.map((a) => `ATTENDEE;CN=${esc(a.name || a.email)};ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${a.email}`),
    `STATUS:${method === 'CANCEL' ? 'CANCELLED' : 'CONFIRMED'}`,
    'TRANSP:OPAQUE',
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(summary)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)
  return lines.map(fold).join('\r\n') + '\r\n'
}

// "Tue 20 Oct 2026, 10:30–11:15 (Africa/Accra)"
export function formatSlot(start, minutes, timeZone = 'Africa/Accra') {
  const end = new Date(start.getTime() + minutes * 60_000)
  const day = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone }).format(start)
  const t = (d) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone }).format(d)
  return `${day}, ${t(start)}–${t(end)} (${timeZone.replace('_', ' ')})`
}
