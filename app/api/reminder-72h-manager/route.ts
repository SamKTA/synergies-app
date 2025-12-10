import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const RESEND_API_KEY = process.env.RESEND_API_KEY!

// client "admin" (bypass RLS)
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// petite pause pour éviter le rate limit Resend
function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function sendEmail(
  to: string,
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
        from: 'notification@agence-skdigital.fr',
        to: [to],
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('Resend error (72h manager):', text)
      return false
    }

    return true
  } catch (e: any) {
    console.error('Resend fetch error (72h manager):', e?.message ?? e)
    return false
  }
}

export async function GET(req: Request) {
  try {
    // Recos toujours "non_traitee" après 72h
    const since72h = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
    // Pour éviter de spammer, on n’envoie pas plus d’une relance manager toutes les 24h
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // 1) Récupérer les recos concernées
    const { data: recos, error: qErr } = await admin
      .from('recommendations')
      .select(
        'id, client_name, receiver_id, created_at, intake_status, manager_due_reminder_at'
      )
      .eq('intake_status', 'non_traitee')
      .lte('created_at', since72h)
      .or(
        `manager_due_reminder_at.is.null,manager_due_reminder_at.lte.${since24h}`
      )
      .order('created_at', { ascending: true })
      .limit(200)

    if (qErr) throw qErr

    let sent = 0

    for (const r of recos ?? []) {
      if (!r.receiver_id) {
        console.warn('Reco sans receiver_id, id =', r.id)
        continue
      }

      // 2) Récupérer le receveur
      const { data: receiver, error: receiverErr } = await admin
        .from('employees')
        .select('id, first_name, last_name, manager_id')
        .eq('id', r.receiver_id)
        .single()

      if (receiverErr || !receiver) {
        console.error('Error fetching receiver for reco', r.id, receiverErr)
        continue
      }

      if (!receiver.manager_id) {
        console.warn('Receiver has no manager_id, receiver id =', receiver.id)
        continue
      }

      // 3) Récupérer le manager du receveur
      const { data: manager, error: managerErr } = await admin
        .from('employees')
        .select('id, first_name, last_name, email')
        .eq('id', receiver.manager_id)
        .single()

      if (managerErr || !manager || !manager.email) {
        console.error(
          'Error fetching manager for receiver',
          receiver.id,
          managerErr
        )
        continue
      }

      const managerFirstName = manager.first_name || 'Bonjour'
      const receiverName = `${receiver.first_name ?? ''} ${
        receiver.last_name ?? ''
      }`.trim()
      const clientName = r.client_name ?? 'Client non renseigné'
      const recoDate = new Date(r.created_at).toLocaleString('fr-FR')

      const subject = `Relance 72h – recommandation non traitée (${clientName})`

      const html = `
        <p>Hello ${managerFirstName},</p>
        <p>
          Une recommandation est toujours en statut <strong>non traitée</strong> depuis plus de 72h.
        </p>
        <p>
          <strong>Client :</strong> ${clientName}<br />
          <strong>Receveur :</strong> ${receiverName || 'Non renseigné'}<br />
          <strong>Date de la recommandation :</strong> ${recoDate}
        </p>
        <p>
          Merci de voir avec ${receiverName || "le collaborateur concerné"} pour qu'il mette à jour le statut dans Synergies.
        </p>
        <p>
          Bonne journée,<br />
          Le système Synergies
        </p>
      `.trim()

      const ok = await sendEmail(manager.email, subject, html)

      // respect du rate limit Resend (≈ 1,6 req/s)
      await wait(600)

      if (!ok) {
        // pas d'update si l'email n'est pas parti
        continue
      }

      // 4) Marquer que le manager a été relancé + log activité
      const { error: upErr } = await admin
        .from('recommendations')
        .update({ manager_due_reminder_at: new Date().toISOString() })
        .eq('id', r.id)
      if (upErr) {
        console.error(
          'Error updating manager_due_reminder_at for reco',
          r.id,
          upErr
        )
        continue
      }

      const { error: actErr } = await admin.from('activities').insert({
        reco_id: r.id,
        action_type: 'manager_reminder_72h',
        note: 'Relance 72h au manager (reco toujours non_traitee)',
      })
      if (actErr) {
        console.error('Error inserting activity 72h for reco', r.id, actErr)
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
