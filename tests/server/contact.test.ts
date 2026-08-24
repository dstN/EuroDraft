import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { callRoute } from './helpers'

const sendMail = vi.fn().mockResolvedValue(undefined)
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail }))
  }
}))

const handler = (await import('../../server/api/contact.post')).default

const VALID_BODY = {
  name: 'Jamie Doe',
  email: 'jamie@example.com',
  subject: 'General question',
  message: 'This message is definitely long enough to pass validation.',
  consent: true
}

function withSmtp() {
  process.env.SMTP_HOST = 'smtp.example.com'
  process.env.SMTP_PASS = 'secret'
}

// The rate limiter's bucket map is module-scoped and persists for the
// process lifetime, so every request in this file counts against a real
// budget (max 5 / 10min per IP) -- each test gets its own source IP so
// none of them accidentally exhaust another test's allowance.
let ipCounter = 0
function post(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  ipCounter++
  return callRoute(handler, '/api/contact', '/api/contact', {
    method: 'POST',
    body,
    headers: { 'x-forwarded-for': `198.51.100.${ipCounter}`, ...headers }
  })
}

describe('POST /api/contact', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    sendMail.mockResolvedValue(undefined)
    delete process.env.NODE_ENV
    delete process.env.SMTP_HOST
    delete process.env.SMTP_PASS
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('sends the message and returns success when SMTP is configured', async () => {
    withSmtp()

    const res = await post(VALID_BODY)

    expect(res.status).toBe(200)
    expect(res.json).toMatchObject({ success: true })
    expect(sendMail).toHaveBeenCalledTimes(1)
  })

  it('rejects a message with no name', async () => {
    withSmtp()
    const res = await post({ ...VALID_BODY, name: '' })

    expect(res.status).toBe(400)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('rejects an invalid email address', async () => {
    withSmtp()
    const res = await post({ ...VALID_BODY, email: 'not-an-email' })

    expect(res.status).toBe(400)
  })

  it('rejects a message shorter than 10 characters', async () => {
    withSmtp()
    const res = await post({ ...VALID_BODY, message: 'short' })

    expect(res.status).toBe(400)
  })

  it('rejects submission without consent', async () => {
    withSmtp()
    const res = await post({ ...VALID_BODY, consent: false })

    expect(res.status).toBe(400)
  })

  it('silently "succeeds" without sending when the honeypot field is filled', async () => {
    withSmtp()
    const res = await post({ ...VALID_BODY, website: 'http://spam.example' })

    expect(res.status).toBe(200)
    expect(res.json).toMatchObject({ success: true })
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('returns 503 in production when SMTP is unconfigured, rather than a false success', async () => {
    process.env.NODE_ENV = 'production'

    const res = await post(VALID_BODY)

    expect(res.status).toBe(503)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('returns a mocked success outside production when SMTP is unconfigured', async () => {
    const res = await post(VALID_BODY)

    expect(res.status).toBe(200)
    expect(res.json).toMatchObject({ success: true, mock: true })
  })

  it('rejects requests once the rate limit is exceeded', async () => {
    withSmtp()
    const headers = { 'x-forwarded-for': '203.0.113.9' }
    for (let i = 0; i < 5; i++) {
      const ok = await post(VALID_BODY, headers)
      expect(ok.status).toBe(200)
    }

    const limited = await post(VALID_BODY, headers)
    expect(limited.status).toBe(429)
  })
})
