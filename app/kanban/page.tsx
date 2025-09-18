'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Card = {
  id: string
  client_name: string
  project_title: string | null
  deal_stage: string
  created_at: string
  receiver_id: string | null
}

const STAGES = [
  'nouveau',
  'en_cours',
  'transforme',
  'acte_recrute',
  'sans_suite',
] as const

export default function KanbanPage() {
  const [meId, setMeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [dragId, setDragId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // filtre rapide
  const [q, setQ] = useState('')

  useEffect(() => {
    const run = async () => {
      setLoading(true); setErr(null)

      const { data: u, error: ue } = await supabase.auth.getUser()
      if (ue) { setErr(ue.message); setLoading(false); return }
      if (!u?.user) { setErr('Connecte-toi.'); setLoading(false); return }

      // Qui suis-je (employee.id) ?
      const { data: me, error: meErr } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', u.user.id)
        .maybeSingle()
      if (meErr || !me) { setErr(meErr?.message ?? 'Pas de fiche employé.'); setLoading(false); return }
      setMeId(me.id)

      // Mes recos reçues → en Kanban deal_stage
      const { data, error } = await supabase
        .from('recommendations')
        .select('id, client_name, project_title, deal_stage, created_at, receiver_id')
        .eq('receiver_id', me.id)
        .order('created_at', { ascending: false })
      if (error) { setErr(error.message); setLoading(false); return }

      setCards((data ?? []) as Card[])
      setLoading(false)
    }
    run()
  }, [])

  const filtered = useMemo(() => {
    if (!q) return cards
    const s = q.toLowerCase()
    return cards.filter(c =>
      (c.client_name ?? '').toLowerCase().includes(s) ||
      (c.project_title ?? '').toLowerCase().includes(s)
    )
  }, [q, cards])

  const byStage = useMemo(() => {
    const m: Record<string, Card[]> = {}
    for (const s of STAGES) m[s] = []
    for (const c of filtered) {
      if (!m[c.deal_stage]) m[c.deal_stage] = []
      m[c.deal_stage].push(c)
    }
    return m
  }, [filtered])

  // DnD handlers
  const onDragStart = (id: string) => () => setDragId(id)
  const onDragOver = (e: React.DragEvent) => { e.preventDefault() } // autoriser drop
  const onDrop = (stage: string) => async (e: React.DragEvent) => {
    e.preventDefault()
    if (!dragId) return
    if (!STAGES.includes(stage as any)) return

    // Optimiste
    const prev = cards
    const next = cards.map(c => c.id === dragId ? { ...c, deal_stage: stage } : c)
    setCards(next)
    setSaving(true)
    setDragId(null)

    // Sauvegarde
    const { error } = await supabase
      .from('recommendations')
      .update({ deal_stage: stage })
      .eq('id', dragId)

    setSaving(false)
    if (error) {
      setErr(`Erreur sauvegarde: ${error.message}`)
      setCards(prev) // rollback
    }
  }

  // petite pastille couleur par colonne
  const stageLabel = (s: string) => {
    switch (s) {
      case 'nouveau': return 'Nouveau'
      case 'en_cours': return 'En cours'
      case 'transforme': return 'Transformé'
      case 'acte_recrute': return 'Acté/Recruté'
      case 'sans_suite': return 'Sans suite'
      default: return s
    }
  }

  return (
    <main style={{ maxWidth: 1400, margin: '24px auto', padding: 16, fontFamily: 'Inter, system-ui, Arial, sans-serif' }}>
      <h1 style={{ margin: '8px 0 16px' }}>Kanban — Mes recommandations (par avancement)</h1>

      <div style={{ display:'flex', gap:12, alignItems:'center', margin:'0 0 16px' }}>
        <input
          placeholder="Recherche (client ou projet)"
          value={q}
          onChange={e=>setQ(e.target.value)}
          style={{ padding:10, flex:1, border:'1px solid #ddd', borderRadius:8 }}
        />
        <a href="/reco/new" style={{ padding:'10px 14px', border:'1px solid #ddd', borderRadius:8, textDecoration:'none' }}>
          + Nouvelle reco
        </a>
        <div style={{ opacity:.8 }}>{saving ? '💾 Sauvegarde…' : ''}</div>
      </div>

      {loading && <p>Chargement…</p>}
      {err && <p style={{ color:'crimson' }}>Erreur : {err}</p>}

      {!loading && !err && (
        <div
          style={{
            display:'grid',
            gridTemplateColumns:'repeat(4, 1fr) 1fr 1fr 1fr 1fr', // 8 colonnes
            gap:12,
            alignItems:'start',
          }}
        >
          {STAGES.map(stage => (
            <section
              key={stage}
              onDragOver={onDragOver}
              onDrop={onDrop(stage)}
              style={{
                background:'#f8fafc',
                border:'1px solid #e5e7eb',
                borderRadius:12,
                minHeight: 200,
                padding:10
              }}
            >
              <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <strong>{stageLabel(stage)}</strong>
                <span style={{ fontSize:12, opacity:.7 }}>{byStage[stage]?.length ?? 0}</span>
              </header>

              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {(byStage[stage] ?? []).map(card => (
                  <article
                    key={card.id}
                    draggable
                    onDragStart={onDragStart(card.id)}
                    style={{
                      background:'white',
                      border:'1px solid #e5e7eb',
                      borderRadius:10,
                      padding:'10px 12px',
                      cursor:'grab',
                      boxShadow:'0 1px 2px rgba(0,0,0,.04)'
                    }}
                  >
                    <div style={{ fontWeight:600 }}>{card.client_name}</div>
                    <div style={{ fontSize:13, color:'#475569' }}>{card.project_title ?? '—'}</div>
                    <div style={{ fontSize:12, color:'#94a3b8', marginTop:6 }}>
                      {new Date(card.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </article>
                ))}
                {/* zone vide pour drop */}
                <div style={{ height: 8 }} />
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}
