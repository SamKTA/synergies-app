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
  is_commissionable: boolean | null
}

export default function SentPage() {
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [meId, setMeId] = useState<string | null>(null)
  const [meName, setMeName] = useState<string | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    const run = async () => {
      setLoading(true); setErr(null)

      const { data: u, error: ue } = await supabase.auth.getUser()
      if (ue || !u?.user) { setErr('Connecte-toi.'); setLoading(false); return }

      const { data: me, error: meErr } = await supabase
        .from('employees')
        .select('id, first_name, last_name')
        .eq('user_id', u.user.id)
        .maybeSingle()
      if (meErr || !me) { setErr(meErr?.message ?? 'Pas de fiche employé.'); setLoading(false); return }
      setMeId(me.id)
      setMeName(`${me.first_name ?? ''} ${me.last_name ?? ''}`.trim())

      const { data, error } = await supabase
        .from('recommendations')
        .select('id, created_at, client_name, project_title, intake_status, deal_stage, amount, prescriptor_id, receiver_email, is_commissionable')
        .eq('prescriptor_id', me.id)
        .order('created_at', { ascending: false })

      if (error) { setErr(error.message); setLoading(false); return }
      setRows(data ?? [])
      setLoading(false)
    }
    run()
  }, [])

  const filtered = useMemo(() => {
    if (!q) return rows
    const s = q.toLowerCase()
    return rows.filter(r =>
      (r.client_name ?? '').toLowerCase().includes(s) ||
      (r.project_title ?? '').toLowerCase().includes(s) ||
      (r.intake_status ?? '').toLowerCase().includes(s) ||
      (r.deal_stage ?? '').toLowerCase().includes(s) ||
      (r.receiver_email ?? '').toLowerCase().includes(s)
    )
  }, [rows, q])

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
      body: JSON.stringify({
        to: r.receiver_email,
        subject,
        html
      })
    })

    const json = await res.json()
    if (!json.ok) {
      alert(`Erreur envoi : ${json.error}`)
    } else {
      alert('Relance envoyée ✅')
    }
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
              <th style={{ textAlign:'center', borderBottom:'1px solid #ddd', padding:8 }}>Payée</th>
              <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id}>
                <td style={{ padding:8 }}>{new Date(r.created_at).toLocaleDateString('fr-FR')}</td>
                <td style={{ padding:8 }}>{r.client_name}</td>
                <td style={{ padding:8 }}>{r.project_title ?? '—'}</td>
                <td style={{ padding:8 }}>{r.intake_status ?? '—'}</td>
                <td style={{ padding:8 }}>{r.deal_stage ?? '—'}</td>
                <td style={{ padding:8, textAlign:'right' }}>{r.amount ?? '—'}</td>
                <td style={{ padding:8 }}>{r.receiver_email ?? '—'}</td>
                <td style={{ padding:8, textAlign:'center' }}>
                  {r.is_commissionable ? '✅' : '—'}
                </td>
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
