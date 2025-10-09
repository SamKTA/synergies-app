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
          id, created_at, client_name, project_title,
          prescriptor_name, prescriptor_email,
          commissions ( id, status, amount, due_date, paid_at, validated_by_manager )
        `)
        .eq('deal_stage', 'acte_recrute')
        .order('created_at', { ascending: false })

      if (error) { setErr(error.message); setLoading(false); return }

      const flat: Row[] = (data ?? []).map((r: any) => ({
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
        validated_by_manager: r.commissions?.validated_by_manager ?? false,
      }))

      setRows(flat)
      setLoading(false)
    }
    run()
  }, [])

  const toggleFilter = (value: string, current: string[], setter: (s: string[]) => void) => {
    setter(current.includes(value) ? current.filter(v => v !== value) : [...current, value])
  }

  const filtered = useMemo(() => {
    return rows.filter(r => {
      const s = q.toLowerCase()
      const matchSearch =
        (r.client_name ?? '').toLowerCase().includes(s) ||
        (r.project_title ?? '').toLowerCase().includes(s) ||
        (r.prescriptor_name ?? '').toLowerCase().includes(s) ||
        (r.prescriptor_email ?? '').toLowerCase().includes(s)

      const matchStatus = statusFilter.length === 0 || statusFilter.includes(r.status)
      const matchValidation = validationFilter.length === 0 ||
        (validationFilter.includes('validated') && r.validated_by_manager) ||
        (validationFilter.includes('not_validated') && !r.validated_by_manager)

      return matchSearch && matchStatus && matchValidation
    })
  }, [rows, q, statusFilter, validationFilter])

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

  const toggleValidation = async (commissionId: string | null, newValue: boolean) => {
    if (!commissionId) return alert("Commission absente")
    const { error } = await supabase.from('commissions').update({ validated_by_manager: newValue }).eq('id', commissionId)
    if (error) return alert(error.message)
    setRows(prev => prev.map(r => r.commission_id === commissionId ? { ...r, validated_by_manager: newValue } : r))
  }

  if (!isAdmin) {
    return (
      <main style={{ maxWidth: 1100, margin: '48px auto', padding: 24 }}>
        {err ? <p style={{ color:'crimson' }}>{err}</p> : <p>Chargement…</p>}
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 1200, margin: '48px auto', padding: 24 }}>
      <h1>Commissions — Affaires actées</h1>

      <div style={{ display:'flex', gap:12, alignItems:'center', margin:'12px 0 20px' }}>
        <input
          placeholder="Recherche (client, projet, salarié)"
          value={q}
          onChange={e=>setQ(e.target.value)}
          style={{ padding:10, flex:1, border:'1px solid #ddd', borderRadius:8 }}
        />
        <details style={{ position:'relative' }}>
          <summary style={{ cursor:'pointer' }}>Filtre payé</summary>
          <div style={{ position:'absolute', background:'white', border:'1px solid #ccc', padding:8 }}>
            {['paid', 'ready', 'pending'].map(status => (
              <label key={status} style={{ display:'block' }}>
                <input
                  type="checkbox"
                  checked={statusFilter.includes(status)}
                  onChange={() => toggleFilter(status, statusFilter, setStatusFilter)}
                /> {status}
              </label>
            ))}
          </div>
        </details>
        <details style={{ position:'relative' }}>
          <summary style={{ cursor:'pointer' }}>Validé manager</summary>
          <div style={{ position:'absolute', background:'white', border:'1px solid #ccc', padding:8 }}>
            <label><input type="checkbox" checked={validationFilter.includes('validated')} onChange={() => toggleFilter('validated', validationFilter, setValidationFilter)} /> ✅ Validé</label>
            <label><input type="checkbox" checked={validationFilter.includes('not_validated')} onChange={() => toggleFilter('not_validated', validationFilter, setValidationFilter)} /> ⏳ Pas validé</label>
          </div>
        </details>
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
                <td style={td}><b>{r.client_name}</b><div style={{ opacity:.7 }}>{r.project_title ?? '—'}</div></td>
                <td style={td}><div>{r.prescriptor_name ?? '—'}</div><div style={{ opacity:.7, fontSize:12 }}>{r.prescriptor_email}</div></td>
                <td style={td}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={r.amount ?? 0}
                    onBlur={e => saveCommissionAmount(r.commission_id, parseFloat(e.target.value || '0'))}
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
                    onChange={() => toggleValidation(r.commission_id, !r.validated_by_manager)}
                  />
                </td>
                <td style={td}>
                  {r.status === 'paid'
                    ? <span style={{ color:'green', fontWeight:600 }}>Payé</span>
                    : r.status === 'ready'
                      ? <span style={{ color:'#1677ff' }}>Prêt</span>
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
