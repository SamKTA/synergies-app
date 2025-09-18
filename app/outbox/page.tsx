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
  receiver_email: string
  prescriptor_id: string | null
  prescriptor_name: string | null
  prescriptor_email: string | null
}

export default function OutboxPage() {
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [me, setMe] = useState<{ id: string, email: string, name: string } | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    const run = async () => {
      setLoading(true); setErr(null)

      // user connecté
      const { data: u, error: ue } = await supabase.auth.getUser()
      if (ue) { setErr(ue.message); setLoading(false); return }
      if (!u?.user) { setErr('Connecte-toi.'); setLoading(false); return }

      // ma fiche employé
      const { data: meRow, error: meErr } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email')
        .eq('user_id', u.user.id)
        .maybeSingle()
      if (meErr || !meRow) { setErr(meErr?.message ?? 'Pas de fiche employé.'); setLoading(false); return }
      setMe({ id: meRow.id, email: meRow.email, name: `${meRow.first_name ?? ''} ${meRow.last_name ?? ''}`.trim() })

      // mes recos ENVOYÉES (je suis prescripteur)
      const { data, error } = await supabase
        .from('recommendations')
        .select('id, created_at, client_name, project_title, intake_status, deal_stage, receiver_email, prescriptor_id, prescriptor_name, prescriptor_email')
        .eq('prescriptor_id', meRow.id)
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
      (r.receiver_email ?? '').toLowerCase().includes(s) ||
      (r.intake_status ?? '').toLowerCase().includes(s) ||
      (r.deal_stage ?? '').toLowerCase().includes(s)
    )
  }, [rows, q])

  const relancer = async (r: Row) => {
    if (!me) return
    setSendingId(r.id)
    try {
      const subject = `Relance – recommandation ${r.client_name ?? ''}`
      const html = `
        <h2>Relance</h2>
        <p>Bonjour, je me permets de relancer concernant la recommandation :</p>
        <p><b>Client :</b> ${r.client_name ?? '—'}</p>
        ${r.project_title ? `<p><b>Projet :</b> ${r.project_title}</p>` : ''}
        <p><b>Statut actuel :</b> ${r.intake_status} / ${r.deal_stage}</p>
        <hr/>
        <p>Merci de mettre à jour le statut dans l’application.</p>
        <p style="opacity:.7">Relancé par ${me.name} (${me.email})</p>
      `.trim()

      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: r.receiver_email,
          cc: me.email,
          subject,
          html
        })
      })
      alert('✅ Relance envoyée')
    } catch (e) {
      console.warn(e)
      alert('❌ Échec de l’envoi')
    } finally {
      setSendingId(null)
    }
  }

  return (
    <main style={{ maxWidth: 1100, margin: '48px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Mes recommandations envoyées</h1>

      <div style={{ display:'flex', gap:12, alignItems:'center', margin:'12px 0 20px' }}>
        <input
          placeholder="Recherche (client, projet, receveur, statut)"
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
              <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Receveur</th>
              <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Intake</th>
              <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }}>Stage</th>
              <th style={{ textAlign:'left', borderBottom:'1px solid #ddd', padding:8, width:120 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id}>
                <td style={{ padding:8 }}>{new Date(r.created_at).toLocaleDateString('fr-FR')}</td>
                <td style={{ padding:8 }}>{r.client_name}</td>
                <td style={{ padding:8 }}>{r.project_title ?? '—'}</td>
                <td style={{ padding:8 }}>{r.receiver_email}</td>
                <td style={{ padding:8 }}>{r.intake_status}</td>
                <td style={{ padding:8 }}>{r.deal_stage}</td>
                <td style={{ padding:8 }}>
                  <button
                    onClick={() => relancer(r)}
                    disabled={sendingId === r.id}
                    style={{ padding:'6px 10px' }}
                  >
                    {sendingId === r.id ? 'Envoi…' : 'Relancer'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
