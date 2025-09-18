import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { to, cc, subject, html } = await req.json()
    if (!to || !subject || !html) {
      return NextResponse.json({ ok: false, error: 'Missing fields' }, { status: 400 })
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: 'RESEND_API_KEY missing' }, { status: 500 })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',           // remplace plus tard par un domaine vérifié
        to: Array.isArray(to) ? to : [to],
        cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
        subject,
        html
      })
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ ok: false, error: err }, { status: res.status })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'unknown error' }, { status: 500 })
  }
}
