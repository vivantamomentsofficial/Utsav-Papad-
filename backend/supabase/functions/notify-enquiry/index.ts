// Supabase Edge Function: notify-enquiry
// Triggered via Database Webhook on INSERT into public.enquiries
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

interface EnquiryRecord {
  id: string
  name: string
  email: string
  phone?: string | null
  country?: string | null
  message: string
  product_id?: string | null
  created_at: string
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  record: EnquiryRecord
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const payload: WebhookPayload = await req.json()
    if (payload.type !== 'INSERT' || !payload.record) {
      return new Response(JSON.stringify({ message: 'Ignored non-insert event' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { name, email, phone, country, message, created_at } = payload.record

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const ownerEmail = Deno.env.get('OWNER_EMAIL')
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'enquiries@utsavfoodtechnology.com'

    if (!resendApiKey || !ownerEmail) {
      console.warn('RESEND_API_KEY or OWNER_EMAIL not configured. Skipping email notification.')
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const cleanPhone = phone ? phone.replace(/\D/g, '') : null
    const whatsappLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=Hello%20${encodeURIComponent(name)},%20thank%20you%20for%20contacting%20Utsav%20Food%20Technology.` : null

    const htmlBody = `
      <h2>New Machine Enquiry Received</h2>
      <p>A customer has submitted a new enquiry on the Utsav Food Technology website:</p>
      <table style="width:100%; max-width:600px; border-collapse:collapse; font-family:sans-serif;">
        <tr><td style="padding:8px; border-bottom:1px solid #ddd; font-weight:bold;">Name:</td><td style="padding:8px; border-bottom:1px solid #ddd;">${escapeHtml(name)}</td></tr>
        <tr><td style="padding:8px; border-bottom:1px solid #ddd; font-weight:bold;">Email:</td><td style="padding:8px; border-bottom:1px solid #ddd;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
        <tr><td style="padding:8px; border-bottom:1px solid #ddd; font-weight:bold;">Phone:</td><td style="padding:8px; border-bottom:1px solid #ddd;">${escapeHtml(phone || 'Not provided')}</td></tr>
        <tr><td style="padding:8px; border-bottom:1px solid #ddd; font-weight:bold;">Country:</td><td style="padding:8px; border-bottom:1px solid #ddd;">${escapeHtml(country || 'Not provided')}</td></tr>
        <tr><td style="padding:8px; border-bottom:1px solid #ddd; font-weight:bold;">Message:</td><td style="padding:8px; border-bottom:1px solid #ddd; white-space:pre-wrap;">${escapeHtml(message)}</td></tr>
        <tr><td style="padding:8px; border-bottom:1px solid #ddd; font-weight:bold;">Date:</td><td style="padding:8px; border-bottom:1px solid #ddd;">${escapeHtml(new Date(created_at).toLocaleString())}</td></tr>
      </table>
      ${whatsappLink ? `<p style="margin-top:20px;"><a href="${whatsappLink}" style="background:#25D366; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px; font-weight:bold; display:inline-block;">Chat with customer on WhatsApp</a></p>` : ''}
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [ownerEmail],
        subject: `New Machine Enquiry from ${name}`,
        html: htmlBody,
      }),
    })

    const resData = await res.json()
    return new Response(JSON.stringify(resData), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
