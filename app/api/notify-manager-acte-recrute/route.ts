// app/api/notify-manager-acte-recrute/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// ⚠️ Si dans ton cron 48h tu utilises un autre fichier helper (ex: '@/lib/supabaseServer'),
// remplace ce bloc par le même import / initialisation que là-bas.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  // Idéalement: clé service role (côté serveur uniquement)
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ou NEXT_PUBLIC_SUPABASE_ANON_KEY si tu fais déjà comme ça
)

const resend = new Resend(process.env.RESEND_API_KEY!)

type Recommendation = {
  id: string
  deal_stage: string
  client_name: string | null
  project_title: string | null
  // ⬇️ CHANGÉ : on passe par le receveur
  receiver_id: string | null
  receiver_email: string | null
  created_at: string | null
  manager_notified_at: string | null
}

type Employee = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  manager_id?: string | null
}

export async function GET() {
  try {
    // 1. Récupérer les recos en acte_recrute dont le manager n'a pas encore été notifié
    const { data: recos, error } = await supabase
      .from('recommendations')
      .select(
        // ⬇️ CHANGÉ : on récupère receiver_id/receiver_email/created_at
        'id, deal_stage, client_name, project_title, receiver_id, receiver_email, created_at, manager_notified_at'
      )
      .eq('deal_stage', 'acte_recrute')
      .is('manager_notified_at', null)

    if (error) {
      console.error('Error fetching recommendations:', error)
      return NextResponse.json(
        { error: 'supabase_error', details: error.message },
        { status: 500 }
      )
    }

    if (!recos || recos.length === 0) {
      return NextResponse.json({ message: 'No recommendations to notify' })
    }

    const notifiedRecoIds: string[] = []

    // 2. Pour chaque reco : remonter au receveur puis au manager, et envoyer l’email
    for (const reco of recos as Recommendation[]) {
      // ⬇️ CHANGÉ : on vise le receveur, id en priorité, sinon email en fallback
      let receiver: Employee | null = null

      if (reco.receiver_id) {
        const { data: receiverData, error: receiverError } = await supabase
          .from('employees')
          .select('id, first_name, last_name, email, manager_id')
          .eq('id', reco.receiver_id)
          .single()

        if (!receiverError && receiverData) {
          receiver = receiverData as Employee
        } else if (receiverError) {
          console.error('Error fetching receiver by id:', receiverError)
        }
      }

      if (!receiver && reco.receiver_email) {
        const { data: receiverData, error: receiverError } = await supabase
          .from('employees')
          .select('id, first_name, last_name, email, manager_id')
          .eq('email', reco.receiver_email)
          .single()

        if (!receiverError && receiverData) {
          receiver = receiverData as Employee
        } else if (receiverError) {
          console.error('Error fetching receiver by email:', receiverError)
        }
      }

      if (!receiver) {
        console.warn(`Receiver not found for reco ${reco.id}, skipping`)
        continue
      }

      const r = receiver as Employee

      if (!r.manager_id) {
        console.warn(`Receiver ${r.id} has no manager_id, skipping`)
        continue
      }

      // 2.2 Récupérer le manager (du receveur)
      const { data: manager, error: managerError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email')
        .eq('id', r.manager_id)
        .single()

      if (managerError || !manager) {
        console.error('Error fetching manager:', managerError)
        continue
      }

      const m = manager as Employee
      if (!m.email) {
        console.warn(`Manager ${m.id} has no email, skipping`)
        continue
      }

      // 2.3 Construire le contenu de l’e-mail
      const managerFirstName = m.first_name || 'Bonjour'
      const receiverName = `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim()
      const clientName = reco.client_name ?? 'un client'
      const projectTitle = reco.project_title ?? 'Projet non spécifié'
      const recoDate = reco.created_at
        ? new Date(reco.created_at).toLocaleDateString('fr-FR')
        : 'Non renseignée'

      const subject = `Nouvelle recommandation à valider – ${clientName}`
      const html = `
        <p>Hello ${managerFirstName},</p>
        <p>
          Tu as une nouvelle recommandation en <strong>acte recruté</strong> réalisée par un membre de ton équipe.
        </p>
        <p>
          <strong>Client :</strong> ${clientName}<br />
          <strong>Receveur :</strong> ${receiverName || 'Non renseigné'}<br />
          <strong>Date de la recommandation :</strong> ${recoDate}<br />
          <strong>Projet :</strong> ${projectTitle}
        </p>
        <p>
          Merci de valider la recommandation directement dans l'application Synergies.
        </p>
        <p>
          Bonne journée,<br />
          Le système Synergies
        </p>
      `

      // 2.4 Envoi de l’e-mail
      try {
        await resend.emails.send({
          from: 'synergies@agence-skdigital.fr', // adapte si besoin
          to: m.email,
          subject,
          html,
        })

        notifiedRecoIds.push(reco.id)
      } catch (mailError) {
        console.error('Error sending email to manager', m.email, mailError)
      }
    }

    // 3. Marquer les recos comme “manager notifié”
    if (notifiedRecoIds.length > 0) {
      const { error: updateError } = await supabase
        .from('recommendations')
        .update({ manager_notified_at: new Date().toISOString() })
        .in('id', notifiedRecoIds)

      if (updateError) {
        console.error('Error updating manager_notified_at:', updateError)
      }
    }

    return NextResponse.json({
      message: 'Manager notifications processed',
      count: notifiedRecoIds.length,
    })
  } catch (e: any) {
    console.error('Unexpected error in notify-manager-acte-recrute:', e)
    return NextResponse.json(
      { error: 'unexpected_error', details: e?.message },
      { status: 500 }
    )
  }
}
