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
}

export default function SentPage() {
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [meId, setMeId] = useState<string | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    const run = async () => {
      setLoading(true); setErr(null)

      const { data: u, error: ue } = await supabase.auth.getUser()
      if (ue || !u?.user) { setErr('Connecte-toi.'); setLoading(false); return }

      const { data: me, error: meErr } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', u.user.id)
        .maybeSingle()
      if (meErr || !me) { setErr(meErr?.message ?? 'Pas de fiche employé.'); setLoading(false); return }
      setMeId(me.id)

      const { data, error } = await supabase
        .from('recommendations')
        .select('id, created_at, client_name, project_title, intake_status, deal_stage, amount, prescriptor_id')
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
      (r.deal_stage ?? '').toLowerCase().includes(s)
    )
  }, [rows, q])

  return (
    <main style={{ maxWidth: 1100, margin: '48px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Mes recommandations envoyées</h1>

      <div style={{ display:'flex', gap:12, alignItems:'center', margin:'12px 0 20px' }}>
        <input
          placeholder="Recherche (client, projet, statut)"
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
              <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8, width:120 }}>Statut</th>
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
                <td style={{ padding:8 }}>—</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
