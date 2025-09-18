'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Reco = {
  id: string
  created_at: string
  prescriptor_name: string | null
  prescriptor_email: string | null
  receiver_email: string
  client_name: string
  project_title: string | null
  deal_stage: string
  intake_status: string
  amount: number | null
}

const DEAL_STAGES = [
  'non_demarre','estime','sous_offre','en_cours','transforme','acte_facture_recrute','sans_suite','mandat_rentre'
]
const INTAKE = ['non_traitee','contacte','rdv_pris','messagerie','injoignable']

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [data, setData] = useState<Reco[]>([])

  // filtres
  const [q, setQ] = useState('')                        // recherche email client/receveur/prescripteur
  const [stage, setStage] = useState<string>('')        // deal_stage
  const [intake, setIntake] = useState<string>('')      // intake_status

  useEffect(() => {
    const run = async () => {
      setLoading(true); setErr(null)
      // sécurité : s'assurer qu'on est connecté
      const { data: u } = await supabase.auth.getUser()
      if (!u?.user) { setErr('Accès réservé. Connecte-toi.'); setLoading(false); return }

      // charger les recos (on commence simple, sans pagination)
      let query = supabase
        .from('recommendations')
        .select('id, created_at, prescriptor_name, prescriptor_email, receiver_email, client_name, project_title, deal_stage, intake_status, amount')
        .order('created_at', { ascending: false })

      if (stage) query = query.eq('deal_stage', stage)
      if (intake) query = query.eq('intake_status', intake)

      const { data, error } = await query
      if (error) { setErr(error.message); setLoading(false); return }
      setData(data ?? [])
      setLoading(false)
    }
    run()
  }, [stage, intake])

  const filtered = useMemo(() => {
    if (!q) return data
    const s = q.toLowerCase()
    return data.filter(r =>
      (r.client_name ?? '').toLowerCase().includes(s) ||
      (r.receiver_email ?? '').toLowerCase().includes(s) ||
      (r.prescriptor_email ?? '').toLowerCase().includes(s) ||
      (r.prescriptor_name ?? '').toLowerCase().includes(s) ||
      (r.project_title ?? '').toLowerCase().includes(s)
    )
  }, [q, data])

  return (
    <main style={{ maxWidth: 1100, margin: '48px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Direction — Recommandations</h1>

      {/* Filtres */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 220px 220px', gap:12, margin:'16px 0' }}>
        <input
          placeholder="Recherche (client, email receveur/prescripteur, projet)"
          value={q}
          onChange={e=>setQ(e.target.value)}
          style={{ padding:10 }}
        />
        <select value={stage} onChange={e=>setStage(e.target.value)} style={{ padding:10 }}>
          <option value="">Deal stage — Tous</option>
          {DEAL_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={intake} onChange={e=>setIntake(e.target.value)} style={{ padding:10 }}>
          <option value="">Prise en charge — Tous</option>
          {INTAKE.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading && <p>Chargement…</p>}
      {err && <p style={{ color:'crimson' }}>Erreur : {err}</p>}

      {!loading && !err && (
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Date</th>
              <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Client</th>
              <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Projet</th>
              <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Prescripteur</th>
              <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Receveur</th>
              <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Intake</th>
              <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Stage</th>
              <th style={{ textAlign:'right', borderBottom:'1px solid #ddd', padding:8 }}>Montant</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id}>
                <td style={{ padding:8 }}>{new Date(r.created_at).toLocaleDateString('fr-FR')}</td>
                <td style={{ padding:8 }}>{r.client_name}</td>
                <td style={{ padding:8 }}>{r.project_title ?? '—'}</td>
                <td style={{ padding:8 }}>{r.prescriptor_name ?? '—'}<div style={{opacity:.6}}>{r.prescriptor_email ?? '—'}</div></td>
                <td style={{ padding:8 }}>{r.receiver_email}</td>
                <td style={{ padding:8 }}>{r.intake_status}</td>
                <td style={{ padding:8 }}>{r.deal_stage}</td>
                <td style={{ padding:8, textAlign:'right' }}>{r.amount != null ? r.amount.toFixed(2) + ' €' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
