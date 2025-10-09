// ✅ AJOUT : useState pour filtre projet + colonne validée
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
  validated_by_manager?: boolean
}

const PROJECTS = ['Vente', 'Achat', 'Location', 'Gestion', 'Location & Gestion', 'Syndic', 'Ona Entreprises', 'Recrutement']

export default function AdminCommissionsPage() {
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [monthFilter, setMonthFilter] = useState<'all' | 'current' | 'previous'>('current')
  const [isAdmin, setIsAdmin] = useState(false)
  const [projectFilter, setProjectFilter] = useState<string[]>([])

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
          commissions (
            id, status, amount, due_date, paid_at, validated_by_manager
          )
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
        validated_by_manager: r.commissions?.validated_by_manager ?? false
      }))

      setRows(flat)
      setLoading(false)
    }
    run()
  }, [])

  const toggleFilter = (value: string, current: string[], setter: (v: string[]) => void) => {
    setter(current.includes(value) ? current.filter(v => v !== value) : [...current, value])
  }

  const filtered = useMemo(() => {
    let list = rows
    const today = new Date()

    if (monthFilter !== 'all') {
      const start = new Date(today.getFullYear(), today.getMonth() - (monthFilter === 'previous' ? 1 : 0), 1)
      const end = new Date(today.getFullYear(), today.getMonth() + (monthFilter === 'previous' ? 0 : 1), 0)
      list = list.filter(r => {
        const d = r.paid_at ?? r.due_date
        return d && new Date(d) >= start && new Date(d) <= end
      })
    }

    if (q.trim()) {
      const s = q.toLowerCase()
      list = list.filter(r => [r.client_name, r.project_title, r.prescriptor_name, r.prescriptor_email].some(f => (f ?? '').toLowerCase().includes(s)))
    }

    if (projectFilter.length > 0) {
      list = list.filter(r => projectFilter.includes(r.project_title ?? ''))
    }

    return list
  }, [rows, q, monthFilter, projectFilter])

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

  const toggleValidated = async (commissionId: string | null, current: boolean) => {
    if (!commissionId) return alert("Commission absente")
    const { error } = await supabase.from('commissions').update({ validated_by_manager: !current }).eq('id', commissionId)
    if (error) return alert(error.message)
    setRows(prev => prev.map(r => r.commission_id === commissionId ? { ...r, validated_by_manager: !current } : r))
  }

  return (
    <main style={{ maxWidth: 1200, margin: '48px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Commissions — Affaires actées</h1>

      <div style={{ display:'flex', gap:12, alignItems:'center', margin:'12px 0 20px' }}>
        <input
          placeholder="Recherche (client, projet, salarié)"
          value={q}
          onChange={e=>setQ(e.target.value)}
          style={{ padding:10, flex:1, border:'1px solid #ddd', borderRadius:8 }}
        />
        <details style={{ position:'relative' }}>
          <summary style={{ cursor:'pointer' }}>Filtre projet</summary>
          <div style={{ position:'absolute', background:'white', border:'1px solid #ccc', padding:8, zIndex:10 }}>
            {PROJECTS.map(opt => (
              <label key={opt} style={{ display:'block' }}>
                <input
                  type="checkbox"
                  checked={projectFilter.includes(opt)}
                  onChange={() => toggleFilter(opt, projectFilter, setProjectFilter)}
                /> {opt}
              </label>
            ))}
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
              <th style={th}>Validé ✅</th>
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
                <td style={td}>{(r.amount ?? 0).toFixed(2)}</td>
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
                    checked={!!r.validated_by_manager}
                    onChange={() => toggleValidated(r.commission_id, !!r.validated_by_manager)}
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
