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
  receiver_id: string | null
  notes?: string | null
}

const INTAKE = ['non_traitee','contacte','rdv_pris','messagerie','injoignable']
const DEAL = ['nouveau','en_cours','transforme','acte_recrute','sans_suite'] as const

export default function InboxPage() {
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [meId, setMeId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    const run = async () => {
      setLoading(true); setErr(null)

      const { data: u, error: ue } = await supabase.auth.getUser()
      if (ue) { setErr(ue.message); setLoading(false); return }
      if (!u?.user) { setErr('Connecte-toi.'); setLoading(false); return }

      const { data: me, error: meErr } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', u.user.id)
        .maybeSingle()
      if (meErr || !me) { setErr(meErr?.message ?? 'Pas de fiche employé.'); setLoading(false); return }
      setMeId(me.id)

      const { data, error } = await supabase
        .from('recommendations')
        .select('id, created_at, client_name, project_title, intake_status, deal_stage, amount, receiver_id, notes')
        .eq('receiver_id', me.id)
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

  const updateRow = async (id: string, patch: Partial<Row>) => {
    setSavingId(id)
    const prev = rows
    const next = rows.map(r => r.id === id ? { ...r, ...patch } : r)
    setRows(next)

    const { error } = await supabase
      .from('recommendations')
      .update(patch)
      .eq('id', id)

    setSavingId(null)
    if (error) {
      setErr(`Erreur sauvegarde: ${error.message}`)
      setRows(prev)
    }
  }

  return (
    <main style={{ maxWidth: 1100, margin: '48px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Mes recommandations reçues</h1>

      <div style={{ display:'flex', gap:12, alignItems:'center', margin:'12px 0 20px' }}>
        <input
          placeholder="Recherche (client, projet, statut)"
          value={q}
          onChange={e=>setQ(e.target.value)}
          style={{ padding:10, flex:1 }}
        />
        <a href="/reco/new" style={{ padding:'10px 14px', border:'1px solid #ddd', borderRadius:8, textDecoration:'none' }}>
          + Nouvelle reco
        </a>
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
              <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id}>
                <td style={{ padding:8 }}>{new Date(r.created_at).toLocaleDateString('fr-FR')}</td>
                <td style={{ padding:8 }}>{r.client_name}</td>
                <td style={{ padding:8 }}>{r.project_title ?? '—'}</td>
                <td style={{ padding:8 }}>
                  <select
                    value={r.intake_status}
                    onChange={e => updateRow(r.id, { intake_status: e.target.value })}
                    style={{ padding:6 }}
                  >
                    {INTAKE.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td style={{ padding:8 }}>
                  <select
                    value={r.deal_stage}
                    onChange={e => updateRow(r.id, { deal_stage: e.target.value })}
                    style={{ padding:6 }}
                  >
                    {DEAL.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td style={{ padding:8, textAlign:'right' }}>
                  <input
                    type="number"
                    step="0.01"
                    value={r.amount ?? ''}
                    placeholder="—"
                    onChange={e => updateRow(r.id, { amount: e.target.value === '' ? null : Number(e.target.value) })}
                    style={{ width:120, padding:6, textAlign:'right' }}
                  />
                </td>
                <td style={{ padding:8 }}>
                  {savingId === r.id ? '💾 Sauvegarde…' : '—'}
                </td>
                <td style={{ padding:8 }}>
                  <textarea
                    value={r.notes ?? ''}
                    onChange={e => updateRow(r.id, { notes: e.target.value })}
                    placeholder="Ajouter une note…"
                    rows={2}
                    style={{ width: '100%', padding: 6, resize: 'vertical' }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
