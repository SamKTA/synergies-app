'use client'
import React, { useEffect, useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Row = {
  reco_id: string
  created_at: string
  client_name: string
  project_title: string | null
  amount: number | null
  prescriptor_name: string | null
  prescriptor_email: string | null

  commission_id: string | null
  status: 'pending' | 'ready' | 'paid'
  due_date: string | null
  paid_at: string | null
  validated_by_manager: boolean
}

export default function AdminCommissionsPage() {
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [validationFilter, setValidationFilter] = useState<string[]>([])
  const [projectFilter, setProjectFilter] = useState<string[]>([])
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const run = async () => {
      setLoading(true); setErr(null)

      const { data: u } = await supabase.auth.getUser()
      if (!u?.user) { setErr('Non connecté.'); setLoading(false); return }

      const { data: me, error: meErr } = await supabase
        .from('employees')
        .select('role')
        .eq('user_id', u.user.id)
        .maybeSingle()
      if (meErr) { setErr(meErr.message); setLoading(false); return }
      if (me?.role !== 'admin') { setErr('Accès réservé à la Direction.'); setLoading(false); return }
      setIsAdmin(true)

      const { data, error } = await supabase
        .from('recommendations')
        .select(`
          id,
          created_at,
          client_name,
          project_title,
          prescriptor_name,
          prescriptor_email,
          deal_stage,
          commissions (
            id, status, amount, due_date, paid_at, validated_by_manager
          )
        `)
        .order('created_at', { ascending: false })

      if (error) { setErr(error.message); setLoading(false); return }

      const flat: Row[] = (data ?? [])
        .filter((r: any) => r.deal_stage === 'acte_recrute')
        .map((r: any) => ({
          reco_id: r.id,
          created_at: r.created_at,
          client_name: r.client_name,
          project_title: r.project_title,
          prescriptor_name: r.prescriptor_name,
          prescriptor_email: r.prescriptor_email,
          amount: r.commissions?.amount ?? null,
          commission_id: r.commissions?.id ?? null,
          status: r.commissions?.status ?? 'pending',
          due_date: r.commissions?.due_date ?? null,
          paid_at: r.commissions?.paid_at ?? null,
          validated_by_manager: r.commissions?.validated_by_manager ?? false
        }))

      setRows(flat)
      setLoading(false)
    }
    run()
  }, [])

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value])
  }

  const filtered = useMemo(() => {
    return rows.filter(r => {
      const s = q.toLowerCase()
      const matchSearch =
        (r.client_name ?? '').toLowerCase().includes(s) ||
        (r.project_title ?? '').toLowerCase().includes(s) ||
        (r.prescriptor_name ?? '').toLowerCase().includes(s) ||
        (r.prescriptor_email ?? '').toLowerCase().includes(s)

      const matchStatus =
        statusFilter.length === 0 ||
        statusFilter.includes(r.status === 'paid' ? 'paid' : 'not_paid')

      const matchValidated =
        validationFilter.length === 0 ||
        validationFilter.includes(r.validated_by_manager ? 'validated' : 'not_validated')

      const matchProject =
        projectFilter.length === 0 ||
        projectFilter.includes(r.project_title ?? '')

      return matchSearch && matchStatus && matchValidated && matchProject
    })
  }, [rows, q, statusFilter, validationFilter, projectFilter])

  const updateDueDate = async (commissionId: string | null, isoDate: string) => {
    if (!commissionId) return alert("Commission absente")
    setSaving(commissionId)
    const { error } = await supabase.from('commissions').update({ due_date: isoDate }).eq('id', commissionId)
    setSaving(null)
    if (error) return alert(error.message)
    setRows(prev => prev.map(r => r.commission_id === commissionId ? { ...r, due_date: isoDate } : r))
  }

  const markPaid = async (commissionId: string | null) => {
    if (!commissionId) return alert("Commission absente")
    const now = new Date().toISOString()
    setSaving(commissionId)
    const { error } = await supabase.from('commissions').update({ status: 'paid', paid_at: now }).eq('id', commissionId)
    setSaving(null)
    if (error) return alert(error.message)
    setRows(prev => prev.map(r => r.commission_id === commissionId ? { ...r, status: 'paid', paid_at: now } : r))
  }

  const saveCommissionAmount = async (commissionId: string | null, amount: number) => {
    if (!commissionId) return alert("Commission absente")
    const { error } = await supabase.from('commissions').update({ amount }).eq('id', commissionId)
    if (error) return alert(error.message)
    setRows(prev => prev.map(r => r.commission_id === commissionId ? { ...r, amount } : r))
  }

  const toggleValidation = async (commissionId: string | null, current: boolean) => {
  if (!commissionId) return alert("Commission absente")

  // 🪪 Pop-up de confirmation
  const name = prompt("Qui valide ou dévalide cette commission ?")
  if (!name) return alert("Action annulée")

  const comment = prompt("Commentaire (facultatif)") || ""

  // ✅ Mise à jour dans la table commissions
  const { error } = await supabase
    .from('commissions')
    .update({ validated_by_manager: !current })
    .eq('id', commissionId)

  if (error) return alert(error.message)

  // 🧾 Journalisation dans commission_logs
  await supabase.from('commission_logs').insert({
    commission_id: commissionId,
    action: !current ? 'validated' : 'unvalidated',
    done_by: name,
    comment,
    done_at: new Date().toISOString()
  })

  // 🔄 Mise à jour de l’état local
  setRows(prev =>
    prev.map(r =>
      r.commission_id === commissionId
        ? { ...r, validated_by_manager: !current }
        : r
    )
  )
}

  const exportCsv = () => {
    const rowsToExport = filtered
    const toCSV = (val: any) => val === null || val === undefined ? '' : `"${String(val).replace(/"/g, '""')}`
    const fmtDate = (iso?: string | null) => iso ? new Date(iso).toLocaleDateString('fr-FR') : ''
    const fmtMoney = (n?: number | null) => String((n ?? 0).toFixed(2)).replace('.', ',')

    const header = ['Date reco','Client','Projet','Prescripteur','Email prescripteur','Commission €','Échéance','Statut','Payé le']
    const lines = [header.map(toCSV).join(';')]

    for (const r of rowsToExport) {
      const line = [
        fmtDate(r.created_at), r.client_name ?? '', r.project_title ?? '',
        r.prescriptor_name ?? '', r.prescriptor_email ?? '',
        fmtMoney(r.amount), fmtDate(r.due_date), r.status, fmtDate(r.paid_at)
      ].map(toCSV).join(';')
      lines.push(line)
    }

    const csv = '\uFEFF' + lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `commissions_${new Date().toISOString().slice(0,7)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!isAdmin) {
    return (
      <main style={{ maxWidth: 1100, margin: '48px auto', padding: 24, fontFamily: 'sans-serif' }}>
        {err ? <p style={{ color:'crimson' }}>{err}</p> : <p>Chargement…</p>}
      </main>
    )
  }

  const PROJECTS = ['Vente','Achat','Location','Gestion','Location & Gestion','Syndic','Ona Entreprises','Recrutement']

  return (
    <main style={{ maxWidth: 1200, margin: '48px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Commissions — Affaires actées</h1>

      <div style={{
        marginTop: '8px',
        marginBottom: '24px',
        padding: '12px 16px',
        background: '#fafafa',
        border: '1px solid #eaeaea',
        borderRadius: '8px',
        fontSize: '14px',
        lineHeight: 1.5,
        color: '#333'
      }}>
        <p style={{ margin: 0, fontWeight: 'bold' }}>Mémo direction — critères de rémunération :</p>
        <ul style={{ marginTop: '6px', marginBottom: '6px', paddingLeft: '20px' }}>
          <li>Projet <b>Vente</b> → Rémunération : 100€</li>
          <li>Projet <b>Gestion</b> → Rémunération : 100€</li>
          <li>Projet <b>Loc / Gestion</b> → Rémunération : 100€</li>
          <li>Projet <b>Syndic</b> → Rémunération : 100€</li>
          <li>Projet <b>Ona Entreprises</b> → Rémunération : 100€</li>
          <li>Projet <b>Recrutement</b> → Rémunération : 500€</li>
        </ul>
        <p style={{ margin: 0, color: '#555' }}>
          <b>Remarque :</b> les projets <b>Achat</b> ou <b>Location</b> ne sont pas éligibles à une prime.  
          Vous pouvez filtrer les projets concernés à l’aide des filtres ci-dessous.
        </p>
      </div>

      <div style={{ display:'flex', gap:12, alignItems:'center', margin:'12px 0 20px' }}>
        <input
          placeholder="Recherche (client, projet, salarié)"
          value={q}
          onChange={e=>setQ(e.target.value)}
          style={{ padding:10, flex:1, border:'1px solid #ddd', borderRadius:8 }}
        />
        <details>
          <summary style={{ cursor:'pointer' }}>🎯 Filtres</summary>
          <div style={{ display:'flex', gap:20, marginTop:10 }}>
            <div>
              <div style={{ fontWeight:'bold' }}>Projet</div>
              {PROJECTS.map(s => (
                <label key={s} style={{ display:'block' }}>
                  <input type="checkbox" checked={projectFilter.includes(s)} onChange={()=>toggle(projectFilter, setProjectFilter, s)} /> {s}
                </label>
              ))}
            </div>
            <div>
              <div style={{ fontWeight:'bold' }}>Payée</div>
              {['paid', 'not_paid'].map(s => (
                <label key={s} style={{ display:'block' }}>
                  <input type="checkbox" checked={statusFilter.includes(s)} onChange={()=>toggle(statusFilter, setStatusFilter, s)} /> {s === 'paid' ? '✅ Oui' : '— Non'}
                </label>
              ))}
            </div>
            <div>
              <div style={{ fontWeight:'bold' }}>Validée manager</div>
              {['validated', 'not_validated'].map(s => (
                <label key={s} style={{ display:'block' }}>
                  <input type="checkbox" checked={validationFilter.includes(s)} onChange={()=>toggle(validationFilter, setValidationFilter, s)} /> {s === 'validated' ? '✅ Oui' : '— Non'}
                </label>
              ))}
            </div>
          </div>
        </details>
        <button onClick={exportCsv} style={{ padding:'8px 10px', borderRadius:8, border:'1px solid #1677ff', background:'#1677ff', color:'white' }}>
          Export CSV
        </button>
      </div>

      {loading && <p>Chargement…</p>}
      {err && <p style={{ color:'crimson' }}>Erreur : {err}</p>}

      {!loading && !err && (
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Date</th>
              <th style={th}>Client / Projet</th>
              <th style={th}>Prescripteur</th>
              <th style={th}>Commission €</th>
              <th style={th}>Échéance</th>
              <th style={th}>Validé</th>
              <th style={th}>Statut</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.reco_id}>
                <td style={td}>{new Date(r.created_at).toLocaleDateString('fr-FR')}</td>
                <td style={td}>
                  <div><b>{r.client_name}</b></div>
                  <div style={{ opacity:.7 }}>{r.project_title ?? '—'}</div>
                </td>
                <td style={td}>
                  <div>{r.prescriptor_name ?? '—'}</div>
                  <div style={{ opacity:.7, fontSize:12 }}>{r.prescriptor_email}</div>
                </td>
                <td style={td}>
                  <input
                    type="number" step="0.01" min="0"
                    defaultValue={r.amount ?? 0}
                    onBlur={(e)=>saveCommissionAmount(r.commission_id, parseFloat(e.target.value || '0'))}
                    style={{ width:110, padding:6 }}
                  />
                </td>
                <td style={td}>
                  <input
                    type="date"
                    value={r.due_date ? r.due_date.substring(0,10) : ''}
                    onChange={(e)=>updateDueDate(r.commission_id, e.target.value)}
                    style={{ padding:6 }}
                  />
                </td>
                <td style={td}>
                  <input
                    type="checkbox"
                    checked={r.validated_by_manager}
                    onChange={()=>toggleValidation(r.commission_id, r.validated_by_manager)}
                  />
                </td>
                <td style={td}>
                  {r.status === 'paid'
                    ? <span style={{ color:'green', fontWeight:600 }}>Payé</span>
                    : <span style={{ color:'#fa8c16' }}>En attente</span>}
                  {r.paid_at && <div style={{ fontSize:12, opacity:.7 }}>le {new Date(r.paid_at).toLocaleDateString('fr-FR')}</div>}
                </td>
                <td style={td}>
                  <button
                    disabled={saving === r.commission_id || r.status === 'paid'}
                    onClick={()=>markPaid(r.commission_id)}
                    style={{ padding:'6px 10px' }}
                  >
                    {saving === r.commission_id ? '…' : 'Marquer payé'}
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

const th: React.CSSProperties = { textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }
const td: React.CSSProperties = { padding:8, borderBottom:'1px solid #f1f1f1', verticalAlign:'top' }
