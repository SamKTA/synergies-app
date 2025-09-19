'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { useParams } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Reco = {
  id: string
  client_name: string
  project_title: string | null
  prescriptor_name: string | null
  receiver_id: string | null
}

type Note = {
  id: string
  body: string
  created_at: string
  author_id: string | null
  author?: { first_name: string | null, last_name: string | null, email: string }
}

export default function RecoNotesPage() {
  const params = useParams() as { id: string }
  const recoId = params.id

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [reco, setReco] = useState<Reco | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    const run = async () => {
      setLoading(true); setErr(null)

      // Récup reco
      const { data: r, error: re } = await supabase
        .from('recommendations')
        .select('id, client_name, project_title, prescriptor_name, receiver_id')
        .eq('id', recoId)
        .maybeSingle()
      if (re) { setErr(re.message); setLoading(false); return }
      if (!r) { setErr('Recommandation introuvable.'); setLoading(false); return }
      setReco(r as Reco)

      // Récup notes + auteur
      const { data: n, error: ne } = await supabase
        .from('notes')
        .select(`
          id, body, created_at, author_id,
          author:author_id ( first_name, last_name, email )
        `)
        .eq('reco_id', recoId)
        .order('created_at', { ascending: false })
      if (ne) { setErr(ne.message); setLoading(false); return }
      setNotes((n ?? []) as any)
      setLoading(false)
    }
    run()
  }, [recoId])

  const addNote = async () => {
    if (!newNote.trim()) return
    setPosting(true)
    setErr(null)

    // Qui suis-je ? (pour author_id)
    const { data: me, error: meErr } = await supabase
      .from('employees')
      .select('id, first_name, last_name, email')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
      .maybeSingle()
    if (meErr || !me) { setPosting(false); setErr(meErr?.message ?? 'Employé introuvable'); return }

    const payload = { reco_id: recoId, author_id: me.id, body: newNote.trim() }

    const { data: inserted, error: insErr } = await supabase
      .from('notes')
      .insert(payload)
      .select(`
        id, body, created_at, author_id
      `)
      .single()

    setPosting(false)
    if (insErr) { setErr(insErr.message); return }

    // Ajout optimiste (recompose l’auteur côté client)
    setNotes(prev => [
      {
        ...(inserted as any),
        author: { first_name: me.first_name, last_name: me.last_name, email: me.email }
      },
      ...prev
    ])
    setNewNote('')
  }

  const delNote = async (id: string) => {
    if (!confirm('Supprimer cette note ?')) return
    const prev = notes
    setNotes(notes.filter(n => n.id !== id))
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (error) { alert(error.message); setNotes(prev) }
  }

  return (
    <main style={{ maxWidth: 900, margin: '32px auto', padding: 16, fontFamily: 'Inter, system-ui, Arial, sans-serif' }}>
      <div style={{ marginBottom: 12 }}>
        <Link href="/kanban" style={{ textDecoration:'none' }}>← Retour</Link>
      </div>

      {loading && <p>Chargement…</p>}
      {err && <p style={{ color:'crimson' }}>Erreur : {err}</p>}

      {reco && (
        <>
          <h1 style={{ margin:'8px 0 4px' }}>{reco.client_name}</h1>
          <div style={{ color:'#475569', marginBottom:16 }}>{reco.project_title ?? '—'}</div>

          <section style={{ marginTop: 16 }}>
            <h2 style={{ fontSize:18, marginBottom:8 }}>Notes</h2>

            <div style={{ display:'flex', gap:8, margin:'8px 0 16px' }}>
              <textarea
                value={newNote}
                onChange={(e)=>setNewNote(e.target.value)}
                rows={3}
                placeholder="Écrire une note…"
                style={{ flex:1, padding:10, border:'1px solid #e5e7eb', borderRadius:8 }}
              />
              <button
                onClick={addNote}
                disabled={posting || !newNote.trim()}
                style={{ padding:'10px 14px', borderRadius:8 }}
              >
                {posting ? '…' : 'Ajouter'}
              </button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {notes.map(n => (
                <article key={n.id} style={{ border:'1px solid #e5e7eb', borderRadius:10, padding:'10px 12px' }}>
                  <div style={{ fontSize:13, color:'#64748b', marginBottom:6 }}>
                    {n.author
                      ? `${n.author.first_name ?? ''} ${n.author.last_name ?? ''}`.trim() || n.author.email
                      : 'Auteur'}
                    {' • '}
                    {new Date(n.created_at).toLocaleString('fr-FR')}
                  </div>
                  <div style={{ whiteSpace:'pre-wrap' }}>{n.body}</div>
                  <div style={{ marginTop:6 }}>
                    <button onClick={()=>delNote(n.id)} style={{ fontSize:12, color:'#dc2626' }}>
                      Supprimer
                    </button>
                  </div>
                </article>
              ))}
              {notes.length === 0 && <div style={{ opacity:.7 }}>Aucune note pour l’instant.</div>}
            </div>
          </section>
        </>
      )}
    </main>
  )
}
