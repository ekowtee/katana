import puppeteer from 'puppeteer-core'
import { issueLoginToken } from '../server/auth.mjs'
import { one } from '../server/db.mjs'
import fs from 'node:fs'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const BASE = 'http://localhost:5173'
const OUT = '.tmp_shots'
fs.mkdirSync(OUT, { recursive: true })

const errors = []
async function tokenFor(email) {
  const a = await one('select id from accounts where email=$1', [email])
  return issueLoginToken(a.id)
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--window-size=1440,1600'] })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 1500, deviceScaleFactor: 1 })
page.on('console', (m) => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`) })
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))

async function shot(name, full = false) { await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full }) }
async function login(email) {
  const t = await tokenFor(email)
  await page.goto(`${BASE}/api/auth/verify?token=${encodeURIComponent(t)}`, { waitUntil: 'networkidle2' })
}

// 1) Login page
await page.goto(`${BASE}/portal/login`, { waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 600))
await shot('1-login')
const loginHasForm = await page.$('input[type=email]')

// 2) Admin dashboard
await login('ekowthompson@gmail.com')
await page.goto(`${BASE}/portal`, { waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 1200))
await shot('2-dashboard', true)
const dashText = await page.evaluate(() => document.body.innerText)

// 3) Candidate detail (Miracle)
await page.goto(`${BASE}/portal/candidate/miracle-naza`, { waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 1000))
await shot('3-candidate')
const candText = await page.evaluate(() => document.body.innerText)

// 4) Admin
await page.goto(`${BASE}/portal/admin`, { waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 1000))
await shot('4-admin')

// 5) Candidate self-view
await login('miraclenaza.mn@gmail.com')
await page.goto(`${BASE}/portal/me`, { waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 1000))
await shot('5-myresults')
const meText = await page.evaluate(() => document.body.innerText)

await browser.close()

console.log('login form present:', !!loginHasForm)
console.log('dashboard mentions "Selection":', /Selection/.test(dashText), '| "Miracle":', /Miracle/.test(dashText))
console.log('candidate page mentions "Miracle":', /Miracle/.test(candText), '| "Panel Notes":', /Panel Notes/.test(candText))
console.log('myresults mentions outcome:', /Fellowship/.test(meText), '| body len:', meText.length)
console.log('\nconsole/page errors:', errors.length)
errors.slice(0, 12).forEach((e) => console.log('  ', e))
process.exit(0)
