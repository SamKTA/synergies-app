'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Reco = {
  id: string
  created_at: string
  client_name: string | null
  project_title: string | null
  prise_en_charge: 'non_traitee' | 'en_cours' | 'terminee' | string | null
  avancement: 'nouveau' | 'en_discussion' | 'en_signature' | string | null
  ca_ht: number | null
  ca_annuel_ht: number | null
  receiver_id: string | null
  receiver_name: string | null
  receiver_email: string | null
}

export default function TeamPage() {
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [rows, setRows] = useState<Reco[]>([])
  const [isAdmin, setIsAdmin] = useState(false)

  // Filtres
  const [q, setQ] = useState('')
  const [projectFilter, setProjectFilter] = useState<string[]>([])
  const [priseFilter, setPriseFilter] = useState<string[]>([])
  const [avancementFilter, setAvancementFilter] = useState<string[]>([])
  const [receiverFilter, setReceiverFilter] = useState<string[]>([])
  const [dateMin, setDateMin] = useState<string>('') // yyyy-mm-dd
  const [dateMax, setDateMax] = useState<string>('') // yyyy-mm-dd

  useEffect(() => {
    const run = async () => {
      setLoading(true); setErr(null)
      // 1) Auth
      const { data: u } = await supabase.auth.getUser()
      if (!u?.user) { setErr('Non connecté.'); setLoading(false); return }

      // 2) Rôle
      const { data: me, error: meErr } = await supabase
        .from('employees')
        .select('id, role, user_id')
        .eq('user_id', u.user.id)
        .maybeSingle()

      if (meErr) { setErr(meErr.message); setLoading(false); return }
      if (!me) { setErr('Profil employé introuvable.'); setLoading(false); return }

      // Page réservée aux admins (managers)
      if (me.role !== 'admin') { setErr('Accès réservé à la Direction / Managers.'); setLoading(false); return }
      setIsAdmin(true)

      // 3) Récupérer les IDs des collaborateurs dont je suis manager
      const { data: team, error: teamErr } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email')
        .eq('manager_id', me.id)

      if (teamErr) { setErr(teamErr.message); setLoading(false); return }
      const teamIds = (team ?? []).map(t => t.id)
      if (teamIds.length === 0) { setRows([]); setLoading(false); return }

      // 4) Recommandations "en cours" de mon équipe
      // Hypothèse: "en cours" = deal_stage != 'acte_recrute' (à ajuster si besoin)
      const { data: recos, error: recErr } = await supabase
        .from('recommendations')
        .select(`
          id, created_at, client_name, project_title,
          prise_en_charge, avancement,
          ca_ht, ca_annuel_ht,
          receiver_id,
          receiver:employees!recommendations_receiver_id_fkey ( first_name, last_name, email )
        `)
        .in('receiver_id', teamIds)
        .neq('deal_stage', 'acte_recrute')
        .order('created_at', { ascending: false })

      if (recErr) { setErr(recErr.message); setLoading(false); return }

      const flat: Reco[] = (recos ?? []).map((r: any) => ({
        id: r.id,
        created_at: r.created_at,
        client_name: r.client_name,
        project_title: r.project_title,
        prise_en_charge: r.prise_en_charge,
        avancement: r.avancement,
        ca_ht: r.ca_ht,
        ca_annuel_ht: r.ca_annuel_ht,
        receiver_id: r.receiver_id,
        receiver_name: r.receiver ? `${r.receiver.first_name ?? ''} ${r.receiver.last_name ?? ''}`.trim() : null,
        receiver_email: r.receiver?.email ?? null,
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
    const s = q.toLowerCase()
    return rows.filter(r => {
      const matchSearch =
        (r.client_name ?? '').toLowerCase().includes(s) ||
        (r.project_title ?? '').toLowerCase().includes(s) ||
        (r.receiver_name ?? '').toLowerCase().includes(s) ||
        (r.receiver_email ?? '').toLowerCase().includes(s)

      const matchProject = projectFilter.length === 0 || projectFilter.includes(r.project_title ?? '')
      const matchPrise = priseFilter.length === 0 || priseFilter.includes(r.prise_en_charge ?? '')
      const matchAv = avancementFilter.length === 0 || avancementFilter.includes(r.avancement ?? '')
      const matchReceiver = receiverFilter.length === 0 || receiverFilter.includes(r.receiver_name ?? '')

      const matchDateMin = !dateMin || new Date(r.created_at) >= new Date(dateMin)
      const matchDateMax = !dateMax || new Date(r.created_at) <= new Date(dateMax + 'T23:59:59')

      return matchSearch && matchProject && matchPrise && matchAv && matchReceiver && matchDateMin && matchDateMax
    })
  }, [rows, q, projectFilter, priseFilter, avancementFilter, receiverFilter, dateMin, dateMax])

  if (!isAdmin) {
    return (
      <main style={{ maxWidth: 1200, margin: '48px auto', padding: 24 }}>
        {err ? <p style={{ color:'crimson' }}>{err}</p> : <p>Chargement…</p>}
      </main>
    )
  }

  const PROJECTS = ['Vente','Achat','Location','Gestion','Location & Gestion','Syndic','Ona Entreprises','Recrutement']
  const PRISES = ['non_traitee','en_cours','terminee']
  const AVANCEMENTS = ['nouveau','en_discussion','en_signature']

  return (
    <main style={{ maxWidth: 1200, margin: '48px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Mes équipes — Recommandations en cours</h1>

      {/* Barre outils */}
      <div style={{ display:'flex', gap:12, alignItems:'center', margin:'12px 0 20px' }}>
        <input
          placeholder="Recherche (client, projet, receveur, email)"
          value={q}
          onChange={e=>setQ(e.target.value)}
          style={{ padding:10, flex:1, border:'1px solid #ddd', borderRadius:8 }}
        />
        <details>
          <summary style={{ cursor:'pointer' }}>🎯 Filtres</summary>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:20, marginTop:10 }}>
            <div>
              <div style={{ fontWeight:'bold' }}>Projet</div>
              {PROJECTS.map(s => (
                <label key={s} style={{ display:'block' }}>
                  <input type="checkbox" checked={projectFilter.includes(s)} onChange={()=>toggle(projectFilter, setProjectFilter, s)} /> {s}
                </label>
              ))}
            </div>
            <div>
              <div style={{ fontWeight:'bold' }}>Prise en charge</div>
              {PRISES.map(s => (
                <label key={s} style={{ display:'block' }}>
                  <input type="checkbox" checked={priseFilter.includes(s)} onChange={()=>toggle(priseFilter, setPriseFilter, s)} /> {s}
                </label>
              ))}
            </div>
            <div>
              <div style={{ fontWeight:'bold' }}>Avancement</div>
              {AVANCEMENTS.map(s => (
                <label key={s} style={{ display:'block' }}>
                  <input type="checkbox" checked={avancementFilter.includes(s)} onChange={()=>toggle(avancementFilter, setAvancementFilter, s)} /> {s}
                </label>
              ))}
            </div>
            <div>
              <div style={{ fontWeight:'bold' }}>Receveur</div>
              {[...new Set(rows.map(r => r.receiver_name).filter(Boolean) as string[])].map(name => (
                <label key={name} style={{ display:'block' }}>
                  <input type="checkbox" checked={receiverFilter.includes(name)} onChange={()=>toggle(receiverFilter, setReceiverFilter, name)} /> {name}
                </label>
              ))}
            </div>
            <div style={{ gridColumn:'1 / -1', display:'flex', gap:12, alignItems:'center' }}>
              <span style={{ fontWeight:'bold' }}>Période :</span>
              <input type="date" value={dateMin} onChange={e=>setDateMin(e.target.value)} style={{ padding:6 }} />
              <span>→</span>
              <input type="date" value={dateMax} onChange={e=>setDateMax(e.target.value)} style={{ padding:6 }} />
              {(dateMin || dateMax) && (
                <button onClick={()=>{ setDateMin(''); setDateMax('') }} style={{ padding:'6px 10px' }}>Réinitialiser</button>
              )}
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
              <th style={th}>Date réception</th>
              <th style={th}>Client / Projet</th>
              <th style={th}>Receveur</th>
              <th style={th}>Prise en charge</th>
              <th style={th}>Avancement</th>
              <th style={th}>CA HT</th>
              <th style={th}>CA Annuel HT</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const risky = (r.prise_en_charge === 'non_traitee') || (r.avancement === 'nouveau')
              return (
                <tr key={r.id} style={risky ? { background:'#fff3f0' } : undefined}>
                  <td style={td}>{new Date(r.created_at).toLocaleDateString('fr-FR')}</td>
                  <td style={td}>
                    <div><b>{r.client_name ?? '—'}</b></div>
                    <div style={{ opacity:.7 }}>{r.project_title ?? '—'}</div>
                  </td>
                  <td style={td}>
                    <div>{r.receiver_name ?? '—'}</div>
                    <div style={{ opacity:.7, fontSize:12 }}>{r.receiver_email ?? ''}</div>
                  </td>
                  <td style={{ ...td, color: r.prise_en_charge === 'non_traitee' ? 'crimson' : undefined }}>
                    {labelPrise(r.prise_en_charge)}
                  </td>
                  <td style={{ ...td, color: r.avancement === 'nouveau' ? 'crimson' : undefined }}>
                    {labelAv(r.avancement)}
                  </td>
                  <td style={td}>{formatMoney(r.ca_ht)}</td>
                  <td style={td}>{formatMoney(r.ca_annuel_ht)}</td>
                  <td style={td}>
                    {/* TODO: adapte les routes de détails / notes à ton app */}
                    <a href={`/reco/${r.id}`} style={link}>Détails</a>
                    {' · '}
                    <a href={`/inbox?reco=${r.id}`} style={link}>Notes</a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </main>
  )
}

const th: React.CSSProperties = { textAlign:'left', borderBottom:'1px solid #ddd', padding:8 }
const td: React.CSSProperties = { padding:8, borderBottom:'1px solid #f1f1f1', verticalAlign:'top' }
const link: React.CSSProperties = { textDecoration:'underline', cursor:'pointer' }

function formatMoney(n: number | null) {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 0 })
}

function labelPrise(v: string | null) {
  if (!v) return '—'
  const map: Record<string,string> = {
    non_traitee: 'Non traitée',
    en_cours: 'En cours',
    terminee: 'Terminée',
  }
  return map[v] || v
}

function labelAv(v: string | null) {
  if (!v) return '—'
  const map: Record<string,string> = {
    nouveau: 'Nouveau',
    en_discussion: 'En discussion',
    en_signature: 'En signature',
  }
  return map[v] || v
}
