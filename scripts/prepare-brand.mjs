// Builds Katana's logo files, favicons, app icons and share image from the
// supplied logo sheet (brand/katana-logo-sheet.png). Needs ImageMagick 7.
//   node scripts/prepare-brand.mjs
// Set IMAGEMAGICK_BINARY if `magick` is not on PATH.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sheet = path.join(root, 'brand/katana-logo-sheet.png')
const pub = path.join(root, 'public')
const out = path.join(pub, 'brand')
const tmp = fs.mkdtempSync(path.join(root, 'node_modules/.katana-brand-'))
const magick = process.env.IMAGEMAGICK_BINARY || 'magick'
const run = (...args) => execFileSync(magick, args, { cwd: root, encoding: 'utf8' })

const NAVY = '#02061E'
const NAVY_LIGHT = '#0B1238' // top-left of the app icon's gradient, as on the sheet
const t = (name) => path.join(tmp, name)
fs.mkdirSync(out, { recursive: true })

// Crops of the sheet (pixel boxes), each trimmed to its artwork.
const crop = (box, dest, ...extra) => run(sheet, '-crop', box, '+repage', ...extra, '-trim', '+repage', dest)
crop('1060x510+20+100', path.join(out, 'katana-logo.png'))
crop('315x410+1195+45', path.join(out, 'katana-logo-stacked.png'))
crop('410x150+1190+512', path.join(out, 'katana-logo-horizontal.png'))
// The mark is taken from the primary logo, the largest drawing of it, with the
// wordmark and tagline cleared.
crop('520x520+20+100', path.join(out, 'katana-mark.png'),
  '(', '+clone', '-alpha', 'extract', '-fill', 'black', '-draw', 'rectangle 365,200 519,519', ')', '-alpha', 'off', '-compose', 'CopyOpacity', '-composite')

// Reversed versions for dark surfaces: the navy drawing becomes white; the
// horn's violet-to-cyan gradient and the bandana knot keep their colour.
const reverse = (src, dest) => run(src, '-channel', 'RGB', '-fx', 'lightness<0.3 ? 1 : u', '+channel', dest)
reverse(path.join(out, 'katana-logo-horizontal.png'), path.join(out, 'katana-logo-horizontal-reversed.png'))
reverse(path.join(out, 'katana-mark.png'), path.join(out, 'katana-mark-reversed.png'))

// App icon, as drawn on the sheet: the white mark on a navy gradient.
// `inset` is the share of the square the mark occupies.
const icon = (size, dest, { inset = 0.68, radius = 0 } = {}) => {
  const mark = Math.round(size * inset)
  const args = ['-size', `${size}x${size}`, '-define', 'gradient:direction=SouthEast', `gradient:${NAVY_LIGHT}-${NAVY}`,
    '(', path.join(out, 'katana-mark-reversed.png'), '-filter', 'Lanczos', '-resize', `${mark}x${mark}`, ')', '-gravity', 'center', '-composite']
  if (radius) {
    const r = Math.round(size * radius)
    args.push('(', '-size', `${size}x${size}`, 'xc:none', '-fill', 'white', '-draw', `roundrectangle 0,0 ${size - 1},${size - 1} ${r},${r}`, ')',
      '-compose', 'DstIn', '-composite')
  }
  run(...args, '-strip', dest)
}
icon(512, path.join(out, 'katana-app-icon.png'), { radius: 0.22 })
// Platform icons are full-bleed: iOS and Android apply their own corner mask.
icon(180, path.join(pub, 'apple-touch-icon.png'))
icon(192, path.join(pub, 'android-chrome-192x192.png'))
icon(512, path.join(pub, 'android-chrome-512x512.png'))
// Browser-tab icons keep the sheet's rounded tile and give the mark more room.
for (const size of [16, 32, 48]) icon(size, t(`favicon-${size}.png`), { inset: 0.86, radius: 0.22 })
fs.copyFileSync(t('favicon-16.png'), path.join(pub, 'favicon-16x16.png'))
fs.copyFileSync(t('favicon-32.png'), path.join(pub, 'favicon-32x32.png'))
run(t('favicon-16.png'), t('favicon-32.png'), t('favicon-48.png'), path.join(pub, 'favicon.ico'))

// Share image (Open Graph / Twitter), 1200 x 630: the primary logo on white.
run('-size', '1200x630', 'xc:white', '(', path.join(out, 'katana-logo.png'), '-filter', 'Lanczos', '-resize', '860x400', ')',
  '-gravity', 'center', '-composite', '-strip', path.join(pub, 'og-image.png'))

fs.rmSync(tmp, { recursive: true, force: true })
console.log('Katana brand files written to public/ and public/brand/.')
