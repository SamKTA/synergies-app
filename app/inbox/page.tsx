'use client'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
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
  annual_amount?: number | null
  receiver_id: string | null
  notes: string | null
}

const INTAKE = ['non_traitee', 'contacte', 'rdv_pris', 'messagerie', 'injoignable']
const DEAL = ['nouveau', 'en_cours', 'transforme', 'acte_recrute', 'sans_suite'] as const
const PROJECT_COLORS: Record<string, string> = {
  Vente: '#ffe0e0',
  Achat: '#e0f7ff',
  Location: '#e8ffe0',
  Gestion: '#fff4cc',
  'Location & Gestion': '#f0e0ff',
  Syndic: '#e0ecff',
  'Ona Entreprises': '#ffe0f5',
  Recrutement: '#f0f0f0'
}

// Fenêtre modale pour les notes
function NotesModal({
  note,
  onSave,
  onClose
}: {
  note: string
  onSave: (v: string) => void
  onClose: () => void
}) {
  const [value, setValue] = useState(note)
  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
    >
      <div
        style={{
          background: 'white',
          padding: 20,
          borderRadius: 8,
          width: 400,
          maxWidth: '90%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}
      >
        <h3 style={{ marginTop: 0 }}>Notes</h3>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={6}
          style={{ width: '100%', padding: 8, resize: 'vertical' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, gap: 8 }}>
          <button onClick={onClose} style={{ padding: '6px 12px' }}>
            Annuler
          </button>
          <button
            onClick={() => {
              onSave(value)
              onClose()
            }}
            style={{
              padding: '6px 12px',
              background: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: 4
            }}
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// Page principale
export default function InboxPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [meId, setMeId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [openNoteId, setOpenNoteId] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [intakeFilter, setIntakeFilter] = useState<string[]>([])
  const [dealFilter, setDealFilter] = useState<string[]>([])

  useEffect(() => {
    const run = async () => {
      const { data: u } = await supabase.auth.getUser()
      if (!u?.user) return setErr('Connecte-toi.')
      const { data: me } = await supabase.from('employees').select('id').eq('user_id', u.user.id).maybeSingle()
      if (!me) return setErr('Pas de fiche employé.')
      setMeId(me.id)
      const { data, error } = await supabase
        .from('recommendations')
        .select(
          'id, created_at, client_name, project_title, intake_status, deal_stage, amount, annual_amount, receiver_id, notes'
        )
        .eq('receiver_id', me.id)
        .order('created_at', { ascending: false })
      if (error) setErr(error.message)
      setRows(data ?? [])
      setLoading(false)
    }
    run()
  }, [])

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const s = q.toLowerCase()
        const matchSearch =
          (r.client_name ?? '').toLowerCase().includes(s) ||
          (r.project_title ?? '').toLowerCase().includes(s) ||
          (r.intake_status ?? '').toLowerCase().includes(s) ||
          (r.deal_stage ?? '').toLowerCase().includes(s)
        const matchIntake = intakeFilter.length === 0 || intakeFilter.includes(r.intake_status)
        const matchDeal = dealFilter.length === 0 || dealFilter.includes(r.deal_stage)
        return matchSearch && matchIntake && matchDeal
      }),
    [rows, q, intakeFilter, dealFilter]
  )

  const updateRow = async (id: string, patch: Partial<Row>) => {
    setSavingId(id)
    const prev = rows
    const next = rows.map((r) => (r.id === id ? { ...r, ...patch } : r))
    setRows(next)
    const { error } = await supabase.from('recommendations').update(patch).eq('id', id)
    setSavingId(null)
    if (error) {
      setErr(`Erreur sauvegarde: ${error.message}`)
      setRows(prev)
    }
  }

  return (
    <main style={{ maxWidth: 1100, margin: '48px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Mes recommandations reçues</h1>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '12px 0 20px' }}>
        <input
          placeholder="Recherche (client, projet, statut)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ padding: 10, flex: 1 }}
        />
        <a
          href="/reco/new"
          style={{
            padding: '10px 14px',
            border: '1px solid #ddd',
            borderRadius: 8,
            textDecoration: 'none'
          }}
        >
          + Nouvelle reco
        </a>
      </div>

      {loading && <p>Chargement…</p>}
      {err && <p style={{ color: 'crimson' }}>Erreur : {err}</p>}

      {!loading && !err && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Date</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Client</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Projet</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Prise en charge</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Avancement</th>
              <th style={{ textAlign: 'right', borderBottom: '1px solid #ddd', padding: 8 }}>CA HT</th>
              <th style={{ textAlign: 'right', borderBottom: '1px solid #ddd', padding: 8 }}>CA Annuel HT</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Statut</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td style={{ padding: 8 }}>{new Date(r.created_at).toLocaleDateString('fr-FR')}</td>
                <td style={{ padding: 8 }}>{r.client_name}</td>
                <td
                  style={{
                    padding: 8,
                    backgroundColor: PROJECT_COLORS[r.project_title ?? ''] ?? 'transparent'
                  }}
                >
                  {r.project_title ?? '—'}
                </td>
                <td style={{ padding: 8 }}>
                  <select
                    value={r.intake_status}
                    onChange={(e) => updateRow(r.id, { intake_status: e.target.value })}
                    style={{ padding: 6 }}
                  >
                    {INTAKE.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: 8 }}>
                  <select
                    value={r.deal_stage}
                    onChange={(e) => updateRow(r.id, { deal_stage: e.target.value })}
                    style={{ padding: 6 }}
                  >
                    {DEAL.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: 8, textAlign: 'right' }}>
                  <input
                    type="number"
                    step="0.01"
                    value={r.amount ?? ''}
                    onChange={(e) =>
                      updateRow(r.id, { amount: e.target.value === '' ? null : Number(e.target.value) })
                    }
                    style={{ width: 120, padding: 6, textAlign: 'right' }}
                  />
                </td>
                <td style={{ padding: 8, textAlign: 'right' }}>
                  <input
                    type="number"
                    step="0.01"
                    value={r.annual_amount ?? ''}
                    onChange={(e) =>
                      updateRow(r.id, { annual_amount: e.target.value === '' ? null : Number(e.target.value) })
                    }
                    style={{ width: 120, padding: 6, textAlign: 'right' }}
                  />
                </td>
                <td style={{ padding: 8 }}>{savingId === r.id ? '💾 Sauvegarde…' : '—'}</td>
                <td style={{ padding: 8 }}>
                  <button
                    onClick={() => setOpenNoteId(r.id)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid #ccc',
                      background: r.notes ? '#e7f3ff' : '#f9f9f9',
                      cursor: 'pointer'
                    }}
                  >
                    📝 Notes
                  </button>
                  {openNoteId === r.id && (
                    <NotesModal
                      note={r.notes ?? ''}
                      onSave={(v) => updateRow(r.id, { notes: v })}
                      onClose={() => setOpenNoteId(null)}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
