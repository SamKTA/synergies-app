'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Row = {
  id: string
  created_at: string
  client_name: string
  project_title: string | null
  intake_status: string
  deal_stage: string
  amount: number | null
  prescriptor_id: string | null
  receiver_email: string | null
  is_paid: boolean
}

const INTAKE = ['non_traitee', 'contacte', 'rdv_pris', 'messagerie', 'injoignable']
const DEAL = ['nouveau', 'en_cours', 'transforme', 'acte_recrute', 'sans_suite'] as const
const PAYEE = ['paid', 'pending']

const COLORS: Record<string, string> = {
  'Vente': '#fee2e2',
  'Achat': '#e0f2fe',
  'Location': '#ede9fe',
  'Gestion': '#dcfce7',
  'Location & Gestion': '#fef9c3',
  'Syndic': '#fce7f3',
  'Ona Entreprises': '#e2e8f0',
  'Recrutement': '#fff7ed'
}

export default function SentPage() {
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [meId, setMeId] = useState<string | null>(null)
  const [meName, setMeName] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [intakeFilters, setIntakeFilters] = useState<string[]>([])
  const [dealFilters, setDealFilters] = useState<string[]>([])
  const [payeeFilters, setPayeeFilters] = useState<string[]>([])

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setErr(null)

      const { data: u, error: ue } = await supabase.auth.getUser()
      if (ue || !u?.user) {
        setErr('Connecte-toi.')
        setLoading(false)
        return
      }

      const { data: me, error: meErr } = await supabase
        .from('employees')
        .select('id, first_name, last_name')
        .eq('user_id', u.user.id)
        .maybeSingle()

      if (meErr || !me) {
        setErr(meErr?.message ?? 'Pas de fiche employé.')
        setLoading(false)
        return
      }

      setMeId(me.id)
      setMeName(`${me.first_name ?? ''} ${me.last_name ?? ''}`.trim())

      const { data, error } = await supabase
        .from('recommendations')
        .select('id, created_at, client_name, project_title, intake_status, deal_stage, amount, prescriptor_id, receiver_email')
        .eq('prescriptor_id', me.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erreur recommendations', error)
        setErr(error.message)
        setLoading(false)
        return
      }

      const recos = data ?? []
      const recoIds = recos.map(r => r.id)

      const { data: paidList, error: paidErr } = await supabase
        .from('commissions')
        .select('reco_id, status')
        .in('reco_id', recoIds)

      if (paidErr) {
        console.error('Erreur commissions', paidErr)
        setErr(paidErr.message)
        setLoading(false)
        return
      }

      const rowsWithPaid = recos.map(r => {
        const commission = (paidList ?? []).find(p => p.reco_id === r.id)
        return {
          ...r,
          is_paid: commission?.status === 'paid'
        }
      })

      setRows(rowsWithPaid)
      setLoading(false)
    }

    run()
  }, [])

  const toggleFilter = (filterList: string[], setList: (s: string[]) => void, value: string) => {
    setList(filterList.includes(value) ? filterList.filter(f => f !== value) : [...filterList, value])
  }

  const filtered = useMemo(() => {
    return rows.filter(r => {
      const matchesSearch = q.trim() === '' || [r.client_name, r.project_title, r.intake_status, r.deal_stage, r.receiver_email].some(f => (f ?? '').toLowerCase().includes(q.toLowerCase()))
      const matchesIntake = intakeFilters.length === 0 || intakeFilters.includes(r.intake_status)
      const matchesDeal = dealFilters.length === 0 || dealFilters.includes(r.deal_stage)
      const matchesPaid = payeeFilters.length === 0 || payeeFilters.includes(r.is_paid ? 'paid' : 'pending')
      return matchesSearch && matchesIntake && matchesDeal && matchesPaid
    })
  }, [rows, q, intakeFilters, dealFilters, payeeFilters])

  const sendReminder = async (r: Row) => {
    if (!r.receiver_email || !meName) {
      alert("Impossible d'envoyer la relance (données manquantes).")
      return
    }

    const subject = `⏰ Relance : recommandation ${r.client_name}`
    const html = `
      <p><strong>${meName}</strong> te relance concernant la recommandation du client <strong>${r.client_name}</strong>.</p>
      <p>Merci d’indiquer la prise en charge sur l’espace Synergies.</p>
      <p><a href="https://synergies-app-orpi.vercel.app" target="_blank">👉 Accéder à l’application</a></p>
    `

    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: r.receiver_email, subject, html })
    })

    const json = await res.json()
    if (!json.ok) alert(`Erreur envoi : ${json.error}`)
    else alert('Relance envoyée ✅')
  }

  return (
    <main style={{ maxWidth: 1100, margin: '48px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Mes recommandations envoyées</h1>

      <div style={{ display:'flex', gap:12, alignItems:'center', margin:'12px 0 20px' }}>
        <input
          placeholder="Recherche (client, projet, statut, destinataire)"
          value={q}
          onChange={e=>setQ(e.target.value)}
          style={{ padding:10, flex:1 }}
        />
        <details>
          <summary style={{ cursor: 'pointer' }}>🎯 Filtres</summary>
          <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
            <div>
              <div style={{ fontWeight: 'bold' }}>Prise en charge</div>
              {INTAKE.map(s => (
                <label key={s} style={{ display: 'block' }}>
                  <input type="checkbox" checked={intakeFilters.includes(s)} onChange={() => toggleFilter(intakeFilters, setIntakeFilters, s)} /> {s}
                </label>
              ))}
            </div>
            <div>
              <div style={{ fontWeight: 'bold' }}>Avancement</div>
              {DEAL.map(s => (
                <label key={s} style={{ display: 'block' }}>
                  <input type="checkbox" checked={dealFilters.includes(s)} onChange={() => toggleFilter(dealFilters, setDealFilters, s)} /> {s}
                </label>
              ))}
            </div>
            <div>
              <div style={{ fontWeight: 'bold' }}>Payée</div>
              {PAYEE.map(s => (
                <label key={s} style={{ display: 'block' }}>
                  <input type="checkbox" checked={payeeFilters.includes(s)} onChange={() => toggleFilter(payeeFilters, setPayeeFilters, s)} /> {s === 'paid' ? '✅ Oui' : '— Non'}
                </label>
              ))}
            </div>
          </div>
        </details>
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
              <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Prise en charge</th>
              <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Avancement</th>
              <th style={{ textAlign:'right', borderBottom:'1px solid #ddd', padding:8, width:140 }}>Montant (€)</th>
              <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Receveur</th>
              <th style={{ textAlign:'center', borderBottom:'1px solid #ddd', padding:8 }}>Payée ?</th>
              <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} style={{ background: r.project_title && COLORS[r.project_title] ? COLORS[r.project_title] : 'transparent' }}>
                <td style={{ padding:8 }}>{new Date(r.created_at).toLocaleDateString('fr-FR')}</td>
                <td style={{ padding:8 }}>{r.client_name}</td>
                <td style={{ padding:8 }}>{r.project_title ?? '—'}</td>
                <td style={{ padding:8 }}>{r.intake_status ?? '—'}</td>
                <td style={{ padding:8 }}>{r.deal_stage ?? '—'}</td>
                <td style={{ padding:8, textAlign:'right' }}>{r.amount ?? '—'}</td>
                <td style={{ padding:8 }}>{r.receiver_email ?? '—'}</td>
                <td style={{ padding:8, textAlign: 'center' }}>{r.is_paid ? '✅' : '—'}</td>
                <td style={{ padding:8 }}>
                  {r.receiver_email && (
                    <button
                      onClick={() => sendReminder(r)}
                      style={{
                        padding: '6px 10px',
                        backgroundColor: '#2563eb',
                        color: 'white',
                        borderRadius: 6,
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Relancer
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
