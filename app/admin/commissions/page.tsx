'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const computeCommission = (project: string | null): number => {
  const norm = (project ?? '').toLowerCase().trim()
  const eligible = [
    'vente',
    'gestion',
    'loc/gestion',
    'syndic',
    'ona entreprises',
    'recrutement'
  ]
  return eligible.some(e => norm.includes(e)) ? 100 : 0
}

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
  calculated_amount: number | null
  due_date: string | null
  paid_at: string | null
}

export default function AdminCommissionsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const { data: u } = await supabase.auth.getUser()
      if (!u?.user) return setErr('Non connecté.')

      const { data: me, error: meErr } = await supabase
        .from('employees')
        .select('role')
        .eq('user_id', u.user.id)
        .maybeSingle()
      if (meErr) return setErr(meErr.message)
      if (me?.role !== 'admin') return setErr('Accès réservé à la Direction.')

      setIsAdmin(true)
      const { data, error } = await supabase
        .from('recommendations')
        .select(`
          id, created_at, client_name, project_title, amount,
          prescriptor_name, prescriptor_email,
          commissions (id, status, calculated_amount, due_date, paid_at)
        `)
        .eq('deal_stage', 'acte_recrute')
        .order('created_at', { ascending: false })

      if (error) return setErr(error.message)

      const flat: Row[] = (data ?? []).map((r: any) => ({
        reco_id: r.id,
        created_at: r.created_at,
        client_name: r.client_name,
        project_title: r.project_title,
        amount: r.amount,
        prescriptor_name: r.prescriptor_name,
        prescriptor_email: r.prescriptor_email,
        commission_id: r.commissions?.id ?? null,
        status: r.commissions?.status ?? 'pending',
        calculated_amount: r.commissions?.calculated_amount ?? computeCommission(r.project_title),
        due_date: r.commissions?.due_date ?? null,
        paid_at: r.commissions?.paid_at ?? null,
      }))

      setRows(flat)
      setLoading(false)
    }
    fetchData()
  }, [])

  if (!isAdmin) {
    return <main>{err ? <p style={{ color: 'crimson' }}>{err}</p> : <p>Chargement...</p>}</main>
  }

  return (
    <main>
      <h1>Commissions — Affaires actées</h1>
      {loading && <p>Chargement...</p>}
      {!loading && (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Client</th>
              <th>Projet</th>
              <th>Montant</th>
              <th>Commission</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.reco_id}>
                <td>{new Date(r.created_at).toLocaleDateString('fr-FR')}</td>
                <td>{r.client_name}</td>
                <td>{r.project_title ?? '—'}</td>
                <td>{r.amount ?? '—'}</td>
                <td>{r.calculated_amount?.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
