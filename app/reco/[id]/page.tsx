'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Recommendation = {
  id: string
  client_name: string
  project_title: string | null
  notes: string | null
}

export default function RecoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [reco, setReco] = useState<Recommendation | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('recommendations')
        .select('id, client_name, project_title, notes')
        .eq('id', id)
        .maybeSingle()

      if (error) { setErr(error.message); setLoading(false); return }
      setReco(data)
      setLoading(false)
    }
    run()
  }, [id])

  const saveNotes = async () => {
    if (!reco) return
    setSaving(true)
    const { error } = await supabase
      .from('recommendations')
      .update({ notes: reco.notes })
      .eq('id', reco.id)

    setSaving(false)
    if (error) setErr(error.message)
  }

  if (loading) return <main style={{ padding: 24 }}>Chargement…</main>
  if (err) return <main style={{ padding: 24, color: 'crimson' }}>Erreur : {err}</main>
  if (!reco) return <main style={{ padding: 24 }}>Recommandation introuvable</main>

  return (
    <main style={{ maxWidth: 800, margin: '40px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Détails de la recommandation</h1>
      <p><b>Client :</b> {reco.client_name}</p>
      <p><b>Projet :</b> {reco.project_title ?? '—'}</p>

      <h2>Notes</h2>
      <textarea
        value={reco.notes ?? ''}
        onChange={(e)=>setReco({ ...reco, notes: e.target.value })}
        rows={6}
        style={{ width:'100%', padding:12, border:'1px solid #ddd', borderRadius:8 }}
      />
      <div style={{ marginTop:12 }}>
        <button
          onClick={saveNotes}
          disabled={saving}
          style={{ padding:'10px 14px', borderRadius:8 }}
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </main>
  )
}
