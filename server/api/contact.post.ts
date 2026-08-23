import nodemailer from 'nodemailer'

// In-memory rate limiting: IP -> timestamps[]
const rateLimitMap = new Map<string, number[]>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const windowMs = 10 * 60 * 1000 // 10 minutes
  const maxRequests = 5

  const timestamps = rateLimitMap.get(ip) || []
  const validTimestamps = timestamps.filter(t => now - t < windowMs)

  if (validTimestamps.length >= maxRequests) {
    rateLimitMap.set(ip, validTimestamps)
    return false
  }

  validTimestamps.push(now)
  rateLimitMap.set(ip, validTimestamps)
  return true
}

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) || '127.0.0.1'

  if (!checkRateLimit(ip)) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many requests. Please wait a few minutes before sending another message.'
    })
  }

  const body = await readBody(event)

  // Honeypot anti-spam check: if 'website' or 'botCheck' is filled, silently ignore
  if (body?.website || body?.company) {
    return { success: true, message: 'Message sent successfully.' }
  }

  const name = String(body?.name || '').trim()
  const email = String(body?.email || '').trim().toLowerCase()
  const subject = String(body?.subject || '').trim()
  const message = String(body?.message || '').trim()
  const consent = Boolean(body?.consent)

  if (!name || name.length < 2 || name.length > 100) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Please provide a valid name (2–100 characters).'
    })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email || !emailRegex.test(email) || email.length > 150) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Please provide a valid email address.'
    })
  }

  if (!subject || subject.length < 2 || subject.length > 150) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Please select or provide a subject.'
    })
  }

  if (!message || message.length < 10 || message.length > 5000) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Message must be between 10 and 5,000 characters.'
    })
  }

  if (!consent) {
    throw createError({
      statusCode: 400,
      statusMessage: 'You must accept the Privacy Policy to submit the contact form.'
    })
  }

  const smtpHost = process.env.SMTP_HOST || process.env.MAIL_HOST
  const smtpPort = Number(process.env.SMTP_PORT || process.env.MAIL_PORT || 587)
  const smtpUser = process.env.SMTP_USER || process.env.MAIL_USER || 'system@rntm.de'
  const smtpPass = process.env.SMTP_PASS || process.env.MAIL_PASS || process.env.SMTP_PASSWORD
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465
  const fromEmail = process.env.SMTP_FROM || `"EuroDraft System" <system@rntm.de>`
  const recipientEmail = process.env.CONTACT_RECIPIENT || 'info@rntm.de'

  // If SMTP is not configured (e.g. local development without credentials)
  if (!smtpHost || !smtpPass) {
    console.log('\n[CONTACT FORM INQUIRY - DEV MOCK]')
    console.log(`From: ${name} <${email}>`)
    console.log(`Subject: ${subject}`)
    console.log(`IP: ${ip}`)
    console.log(`Message:\n${message}\n`)

    return {
      success: true,
      message: 'Message delivered successfully (Dev mode: logged to console).',
      mock: true
    }
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    })

    const mailOptions = {
      from: fromEmail,
      to: recipientEmail,
      replyTo: `"${name}" <${email}>`,
      subject: `[EuroDraft Contact] ${subject} — from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nIP: ${ip}\nSubject: ${subject}\n\nMessage:\n${message}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; rounded: 8px;">
          <h2 style="color: #059669; border-bottom: 2px solid #10b981; padding-bottom: 8px; margin-top: 0;">New EuroDraft Contact Inquiry</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 6px 0; font-weight: bold; width: 100px; color: #4b5563;">Name:</td>
              <td style="padding: 6px 0; color: #111827;">${escapeHtml(name)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #4b5563;">Email:</td>
              <td style="padding: 6px 0; color: #111827;"><a href="mailto:${escapeHtml(email)}" style="color: #059669;">${escapeHtml(email)}</a></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #4b5563;">Subject:</td>
              <td style="padding: 6px 0; color: #111827;">${escapeHtml(subject)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #4b5563;">Sender IP:</td>
              <td style="padding: 6px 0; color: #6b7280; font-family: monospace;">${escapeHtml(ip)}</td>
            </tr>
          </table>
          <div style="background-color: #f9fafb; border-left: 4px solid #10b981; padding: 15px; border-radius: 4px;">
            <h4 style="margin: 0 0 10px 0; color: #374151; font-size: 14px; text-transform: uppercase;">Message Content:</h4>
            <p style="white-space: pre-wrap; margin: 0; color: #1f2937; line-height: 1.6;">${escapeHtml(message)}</p>
          </div>
          <p style="margin-top: 25px; font-size: 12px; color: #9ca3af; text-align: center;">
            Sent automatically by EuroDraft System (<a href="https://ed.rntm.de" style="color: #9ca3af;">ed.rntm.de</a>)
          </p>
        </div>
      `
    }

    await transporter.sendMail(mailOptions)

    return {
      success: true,
      message: 'Your message has been sent successfully. We will get back to you soon.'
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown mail server error'
    console.error('Failed to send contact email:', errorMsg)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to deliver email through mail server. Please try contacting info@rntm.de directly.'
    })
  }
})

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
