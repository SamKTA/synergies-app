import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const RESEND_API_KEY = process.env.RESEND_API_KEY!

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function sendEmail(to: string, cc: string | null, subject: string, html: string) {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY missing')
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'notification@agence-skdigital.fr',
      to: [to],
      cc: cc ? [cc] : undefined,
      subject,
      html,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text)
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const key = url.searchParams.get('key') || req.headers.get('x-cron-secret')
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  try {
    const since72h = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: recos, error } = await admin
      .from('recommendations')
      .select(`
        id,
        client_name,
        intake_status,
        created_at,
        due_reminder_72h_at,
        receiver_id,
        employees:employees!recommendations_receiver_id_fkey (
          manager:manager_id (
            email,
            first_name,
            last_name
          )
        )
      `)
      .eq('intake_status', 'non_traitee')
      .lte('created_at', since72h)
      .or(`due_reminder_72h_at.is.null,due_reminder_72h_at.lte.${since24h}`)
      .limit(200)

    if (error) throw error

    let sent = 0

    for (const r of recos ?? []) {
      // ✅ Correction ici :
      // "employees" est un tableau, et chaque "manager" est aussi un tableau
      const manager =
        Array.isArray(r.employees) && r.employees.length > 0
          ? r.employees[0]?.manager?.[0]
          : null

      if (!manager?.email) continue

      const subject = `⏰ Manager alert – reco ${r.client_name}`
      const html = `
        <h2>Relance au manager (72h)</h2>
        <p>Une recommandation est toujours en <strong>non_traitee</strong>.</p>
        <p><b>Client :</b> ${r.client_name ?? '—'}</p>
        <p><b>Statut :</b> ${r.intake_status}</p>
        <p style="opacity:.7">Créée le : ${new Date(r.created_at).toLocaleString('fr-FR')}</p>
        <hr />
        <p>Merci de faire un suivi avec votre équipe.</p>
      `.trim()

      await sendEmail(manager.email, null, subject, html)

      await admin
        .from('recommendations')
        .update({ due_reminder_72h_at: new Date().toISOString() })
        .eq('id', r.id)

      await admin.from('activities').insert({
        reco_id: r.id,
        action_type: 'reminder_sent_manager',
        note: 'Relance automatique 72h au manager',
      })

      sent++
    }

    return NextResponse.json({ ok: true, checked: recos?.length ?? 0, sent })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'unknown error' },
      { status: 500 }
    )
  }
}
