/**
 * Live two-user UI check.
 *
 * Drives the real React app in two independent browser contexts against the real
 * API, because that is the only way to verify the part that matters: that a
 * change made by one user appears on the other user's screen without a reload.
 * A request-level test cannot see that — it was exactly what the mocked page
 * appeared to do and did not.
 *
 * Sessions are established by minting the same JWT cookie the OAuth callback
 * sets, so the check does not need Google's consent screen. Everything after
 * that is the genuine app.
 *
 * Usage:  node scripts/ui-check.mjs
 * Requires the API on :3000 and the Vite dev server on :5173. Creates and removes its own users.
 */

import { randomUUID } from 'node:crypto'
import * as dns from 'node:dns'
import * as net from 'node:net'
import { chromium } from 'playwright'
import jwt from 'jsonwebtoken'
import { Pool } from 'pg'
import 'dotenv/config'

dns.setDefaultResultOrder('ipv4first')
net.setDefaultAutoSelectFamily?.(false)

const APP = process.env.APP_URL ?? 'http://localhost:5173'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

if (!process.env.JWT_SECRET || !process.env.DATABASE_URL) {
  console.error('JWT_SECRET and DATABASE_URL must be set (express/.env). Run from express/.')
  process.exit(1)
}

let pass = 0
const failures = []

function check(label, condition, detail = '') {
  if (condition) {
    pass += 1
    console.log(`  PASS  ${label}`)
  } else {
    failures.push(label)
    console.log(`  FAIL  ${label} ${detail}`)
  }
}

async function makeUser(tag) {
  const suffix = randomUUID().slice(0, 8)
  const row = await pool.query(
    `INSERT INTO user_auth (googleId, email, username, role, lastLogin)
     VALUES ($1, $2, $3, 'PLAYER', NOW())
     RETURNING userId AS id, username, email, role`,
    [`ui-${suffix}`, `ui_${tag}_${suffix}@example.test`, `ui_${tag}_${suffix}`]
  )
  const user = row.rows[0]
  user.token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '1h' }
  )
  return user
}

/** A separate browser context per user — separate cookie jar, like two people. */
async function openAs(browser, user) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } })
  await context.addCookies([
    { name: 'token', value: user.token, domain: 'localhost', path: '/', httpOnly: true }
  ])
  const page = await context.newPage()
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(String(e)))
  return { context, page, errors }
}

const details = (roll) => ({
  fullName: 'UI Check User',
  phone: '+91 98765 43210',
  discord: 'uicheck',
  year: '2',
  branch: 'COPC',
  roll
})

/** Fills the six profile fields inside whichever modal is open. */
async function fillProfile(page, d) {
  await page.fill('input[name="fullName"]', d.fullName)
  await page.fill('input[name="phone"]', d.phone)
  await page.fill('input[name="discordUsername"]', d.discord)
  await page.selectOption('select[name="year"]', d.year)
  await page.fill('input[name="branch"]', d.branch)
  await page.fill('input[name="rollNumber"]', d.roll)
}

async function main() {
  const leader = await makeUser('leader')
  const member = await makeUser('member')
  const ids = [leader.id, member.id]
  const browser = await chromium.launch()
  let teamCode = null

  try {
    const A = await openAs(browser, leader)
    const B = await openAs(browser, member)

    console.log('\n── Leader: load /team')
    await A.page.goto(`${APP}/team`, { waitUntil: 'networkidle' })
    await A.page.waitForSelector('text=You are not in a team.', { timeout: 15000 })
    check('empty state renders from the API (no mock team)', true)

    const body = await A.page.textContent('body')
    check('no hardcoded "The Cyber Syndicate"', !body.includes('Cyber Syndicate'))
    check('no hardcoded NeonHacker', !body.includes('NeonHacker'))
    check('no hardcoded CipherByte', !body.includes('CipherByte'))
    check('no hardcoded GlitchMaster', !body.includes('GlitchMaster'))

    console.log('\n── Leader: create a team through the UI')
    const teamName = `UICheck ${randomUUID().slice(0, 6)}`
    await A.page.click('text=Create a Team')
    await A.page.waitForSelector('text=Create Squad')
    await A.page.fill('input[placeholder="Enter squad name..."]', teamName)
    await fillProfile(A.page, details(`UIA${randomUUID().slice(0, 7).toUpperCase()}`))
    await A.page.click('button[type="submit"]:has-text("Initialize Squad")')

    await A.page.waitForSelector(`text=${teamName}`, { timeout: 15000 })
    check('team appears with the name that was typed', true)

    teamCode = (await A.page.textContent('.font-brand.text-2xl')).trim()
    check('invite code is 6 hex chars from the backend', /^[0-9A-F]{6}$/.test(teamCode), teamCode)

    const inDb = await pool.query(`SELECT name FROM parties WHERE id = $1`, [teamCode])
    check('team exists in the database', inDb.rowCount === 1)
    check('DB name matches the screen', inDb.rows[0]?.name === teamName)

    const profileInDb = await pool.query(
      `SELECT fullname FROM player_profiles WHERE userid = $1`, [leader.id]
    )
    check('profile fields were persisted', profileInDb.rowCount === 1)

    await A.page.waitForSelector('text=Operatives (1/4)')
    check('roster shows 1/4 from the API', true)
    // The label is upper-cased by CSS, so the DOM text is "Captain" — assert on
    // the DOM text, and separately that it is presented uppercase.
    const roleCell = A.page.locator('p.uppercase', { hasText: 'Captain' }).first()
    check('leader labelled Captain', (await roleCell.textContent()).trim() === 'Captain')
    check(
      'role label rendered uppercase',
      (await roleCell.evaluate((el) => getComputedStyle(el).textTransform)) === 'uppercase'
    )

    console.log('\n── Member: join with that code, leader\'s screen must update live')
    await B.page.goto(`${APP}/team`, { waitUntil: 'networkidle' })
    await B.page.waitForSelector('text=You are not in a team.', { timeout: 15000 })
    await B.page.click('text=Join a Team')
    await B.page.waitForSelector('text=Join Squad')
    await B.page.fill('input[placeholder="e.g. A1B2C3"]', teamCode)
    await fillProfile(B.page, details(`UIB${randomUUID().slice(0, 7).toUpperCase()}`))
    await B.page.click('button[type="submit"]:has-text("Infiltrate Squad")')

    await B.page.waitForSelector(`text=${teamName}`, { timeout: 15000 })
    check('member sees the SAME team name as the leader', true)
    const codeB = (await B.page.textContent('.font-brand.text-2xl')).trim()
    check('member sees the same invite code', codeB === teamCode, `${codeB} vs ${teamCode}`)

    // The whole point: no reload on A.
    await A.page.waitForSelector('text=Operatives (2/4)', { timeout: 10000 })
    check('LEADER roster updated to 2/4 with no reload (socket)', true)
    check(
      "leader sees the member's real username",
      (await A.page.textContent('body')).includes(member.username)
    )

    // Presence: both users are connected and in the room, so both dots must be
    // lit on both screens — without either page reloading.
    await A.page.waitForFunction(
      () => document.querySelectorAll('span[title="Online"]').length === 2,
      undefined,
      { timeout: 10000 }
    ).then(() => check('leader sees both teammates online (presence)', true))
     .catch(() => check('leader sees both teammates online (presence)', false))

    await B.page.waitForFunction(
      () => document.querySelectorAll('span[title="Online"]').length === 2,
      undefined,
      { timeout: 10000 }
    ).then(() => check('member sees both teammates online (presence)', true))
     .catch(() => check('member sees both teammates online (presence)', false))

    // Captured here rather than at the end: this is the state worth eyeballing —
    // a real team with a real roster, not the empty state.
    await A.page.screenshot({ path: 'scripts/screenshots/team-leader.png' })
    await B.page.screenshot({ path: 'scripts/screenshots/team-member.png' })

    console.log('\n── Leader kicks the member; member\'s screen must react live')
    await A.page.hover(`text=${member.username}`)
    await A.page.click('button[title="Kick Operative"]')
    await A.page.waitForSelector('text=Operatives (1/4)', { timeout: 10000 })
    check('leader roster back to 1/4', true)

    await B.page.waitForSelector('text=You are not in a team.', { timeout: 10000 })
    check('MEMBER dropped to empty state with no reload (socket)', true)

    const membersLeft = await pool.query(
      `SELECT 1 FROM party_members WHERE partyid = $1 AND userid = $2`, [teamCode, member.id]
    )
    check('membership removed in the database', membersLeft.rowCount === 0)

    console.log('\n── Leader disbands')
    await A.page.click('text=Disband Team')
    await A.page.waitForSelector('text=You are not in a team.', { timeout: 10000 })
    check('leader returns to empty state', true)
    const gone = await pool.query(`SELECT 1 FROM parties WHERE id = $1`, [teamCode])
    check('team deleted in the database', gone.rowCount === 0)

    console.log('\n── Console health')
    const realErrors = [...A.errors, ...B.errors].filter(
      (e) => !/favicon|404 \(Not Found\).*favicon/i.test(e)
    )
    check('no uncaught browser errors', realErrors.length === 0, realErrors.slice(0, 3).join(' | '))

    await A.page.screenshot({ path: 'scripts/screenshots/empty-leader.png' })
    await B.page.screenshot({ path: 'scripts/screenshots/empty-member.png' })
  } finally {
    await browser.close()
    await pool.query(`DELETE FROM user_auth WHERE userId = ANY($1::uuid[])`, [ids])
    if (teamCode) await pool.query(`DELETE FROM parties WHERE id = $1`, [teamCode])
    await pool.end()
  }

  console.log(`\n${'='.repeat(52)}`)
  console.log(`  ${pass} passed, ${failures.length} failed`)
  if (failures.length) console.log(`  failed: ${failures.join(' | ')}`)
  console.log('='.repeat(52))
  process.exit(failures.length === 0 ? 0 : 1)
}

main().catch((error) => {
  console.error('UI check crashed:', error)
  process.exit(1)
})
