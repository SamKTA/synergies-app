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
  prescriptor_id: string | null
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
        'id, deal_stage, client_name, project_title, prescriptor_id, manager_notified_at'
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

    // 2. Pour chaque reco : remonter au prescripteur puis au manager, et envoyer l’email
    for (const reco of recos as Recommendation[]) {
      if (!reco.prescriptor_id) continue

      // 2.1 Récupérer le prescripteur
      const { data: prescriptor, error: prescriptorError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, manager_id')
        .eq('id', reco.prescriptor_id)
        .single()

      if (prescriptorError || !prescriptor) {
        console.error('Error fetching prescriptor:', prescriptorError)
        continue
      }

      const p = prescriptor as Employee

      if (!p.manager_id) {
        console.warn(`Prescriptor ${p.id} has no manager_id, skipping`)
        continue
      }

      // 2.2 Récupérer le manager
      const { data: manager, error: managerError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email')
        .eq('id', p.manager_id)
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
      const prescriptorName = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()
      const clientName = reco.client_name ?? 'un client'
      const projectTitle = reco.project_title ?? 'Projet non spécifié'

      // Lien vers l’app (à adapter si besoin)
      const recoUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/commissions?reco_id=${reco.id}`

      const subject = `Nouvelle recommandation à valider – ${clientName}`
      const html = `
        <p>Hello ${managerFirstName},</p>
        <p>
          Tu as une nouvelle recommandation en <strong>acte recruté</strong> réalisée par un membre de ton équipe.
        </p>
        <p>
          <strong>Prescripteur :</strong> ${prescriptorName || 'Non renseigné'}<br />
          <strong>Client :</strong> ${clientName}<br />
          <strong>Projet :</strong> ${projectTitle}
        </p>
        <p>
          Tu peux consulter le détail et valider la recommandation directement dans Synergies :<br />
          <a href="${recoUrl}" target="_blank" rel="noopener noreferrer">Voir la recommandation</a>
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
