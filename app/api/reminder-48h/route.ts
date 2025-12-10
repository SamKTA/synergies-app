// app/api/reminder-48h/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const RESEND_API_KEY = process.env.RESEND_API_KEY!

// client "admin" (bypass RLS) — sécurisé car côté serveur
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// petite pause entre les envois pour éviter le rate limit
function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function sendEmail(
  to: string,
  cc: string | null,
  subject: string,
  html: string
): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY missing')
    return false
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'notification@agence-skdigital.fr', // OK en mode sandbox
        to: [to],
        cc: cc ? [cc] : undefined,
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('Resend error:', text)
      return false
    }

    return true
  } catch (e: any) {
    console.error('Resend fetch error:', e?.message ?? e)
    return false
  }
}

export async function GET(req: Request) {
  try {
    // 1) Cible : non_traitee, créées il y a ≥ 48h
    //    et pas rappelées dans les dernières 24h
    const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: recos, error: qErr } = await admin
      .from('recommendations')
      .select(
        'id, prescriptor_email, client_name, receiver_email, created_at, intake_status, due_reminder_at'
      )
      .eq('intake_status', 'non_traitee')
      .lte('created_at', since48h)
      .or(`due_reminder_at.is.null,due_reminder_at.lte.${since24h}`)
      .order('created_at', { ascending: true })
      .limit(200)

    if (qErr) throw qErr

    let sent = 0

    for (const r of recos ?? []) {
      if (!r.receiver_email) {
        console.warn('Reco sans receiver_email, id =', r.id)
        continue
      }

      const subject = `Relance – recommandation ${r.client_name ?? ''}`
      const html = `
        <h2>Relance automatique (48h)</h2>
        <p>Vous avez une recommandation en attente de prise en charge.</p>
        <p><b>Client :</b> ${r.client_name ?? '—'}</p>
        <p><b>Statut :</b> ${r.intake_status}</p>
        <p style="opacity:.7">Créée le : ${new Date(r.created_at).toLocaleString('fr-FR')}</p>
        <hr />
        <p>Merci de mettre à jour le statut dans l’application.</p>
      `.trim()

      // 2) Envoi e-mail (sans faire crasher toute la route)
      const ok = await sendEmail(
        r.receiver_email,
        r.prescriptor_email ?? null,
        subject,
        html
      )

      // on ralentit un peu pour respecter la limite de 2 req/s
      await wait(600)

      if (!ok) {
        // si l'email n'est pas parti, on ne marque pas comme rappelé
        // => il sera retenté au prochain passage
        continue
      }

      // 3) Marquer rappel + log activité
      const { error: upErr } = await admin
        .from('recommendations')
        .update({ due_reminder_at: new Date().toISOString() })
        .eq('id', r.id)
      if (upErr) {
        console.error('Error updating due_reminder_at for reco', r.id, upErr)
        continue
      }

      const { error: actErr } = await admin.from('activities').insert({
        reco_id: r.id,
        action_type: 'reminder_sent',
        note: 'Relance automatique 48h (intake non_traitee)',
      })
      if (actErr) {
        console.error('Error inserting activity for reco', r.id, actErr)
        continue
      }

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
