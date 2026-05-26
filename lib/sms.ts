import { logger } from './logger'

type SmsResult = { success: true } | { success: false; error: string }

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  const from       = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !from) {
    return { success: false, error: 'Twilio credentials not configured' }
  }

  const params = new URLSearchParams({ From: from, To: to, Body: body })
  const creds  = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization:  `Basic ${creds}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    )

    if (!res.ok) {
      const json = await res.json().catch(() => ({ message: res.statusText })) as { message: string }
      logger.warn('sms', 'Twilio API error', { status: res.status, message: json.message })
      return { success: false, error: json.message }
    }

    return { success: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error'
    logger.error('sms', 'SMS send failed', e)
    return { success: false, error: msg }
  }
}

// Normalise an Indian mobile number to E.164 format (+91XXXXXXXXXX).
export function formatIndianMobile(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`
  if (digits.length === 10) return `+91${digits}`
  return phone
}
