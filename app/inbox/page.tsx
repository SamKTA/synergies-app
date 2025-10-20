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
  client_phone?: string | null
  client_email?: string | null
  project_address?: string | null
  project_details?: string | null
  project_title: string | null
  intake_status: string
  deal_stage: string
  amount: number | null
  annual_amount?: number | null
  receiver_id: string | null
  prescriptor_name?: string | null
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

// ---- MODALES ----

// Notes
function NotesModal({ note, onSave, onClose }: { note: string; onSave: (v: string) => void; onClose: () => void }) {
  const [value, setValue] = useState(note)
  return createPortal(
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ marginTop: 0 }}>Notes</h3>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={6}
          style={{ width: '100%', padding: 8, resize: 'vertical' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, gap: 8 }}>
          <button onClick={onClose}>Annuler</button>
          <button
            onClick={() => {
              onSave(value)
              onClose()
            }}
            style={{ background: '#0070f3', color: 'white', border: 'none', borderRadius: 4, padding: '6px 12px' }}
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// Détails client
function DetailsModal({ data, onClose }: { data: Row; onClose: () => void }) {
  return createPortal(
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Détails du projet</h3>
        <div style={{ fontSize: 15, lineHeight: 1.6 }}>
          <p><b>Client :</b> {data.client_name}</p>
          <p><b>Téléphone :</b> {data.client_phone ?? '—'}</p>
          <p><b>Email :</b> {data.client_email ?? '—'}</p>
          <p><b>Adresse projet :</b> {data.project_address ?? '—'}</p>
          <p><b>Détails projet :</b> {data.project_details ?? '—'}</p>
          <hr />
          <p><b>Type de projet :</b> {data.project_title ?? '—'}</p>
          <p><b>Prescripteur :</b> {data.prescriptor_name ?? '—'}</p>
          <p><b>Date de création :</b> {new Date(data.created_at).toLocaleDateString('fr-FR')}</p>
        </div>
        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <button onClick={onClose} style={{ border: '1px solid #ccc', borderRadius: 4, padding: '6px 12px' }}>
            Fermer
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
} as const

const modalStyle = {
  background: 'white',
  padding: 20,
  borderRadius: 8,
  width: 420,
  maxWidth: '90%',
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
} as const

// ---- PAGE PRINCIPALE ----
export default function InboxPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [meId, setMeId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [openNoteId, setOpenNoteId] = useState<string | null>(null)
  const [openDetailId, setOpenDetailId] = useState<string | null>(null)
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
          `id, created_at, client_name, client_phone, client_email,
           project_address, project_details,
           project_title, intake_status, deal_stage, amount, annual_amount, receiver_id, prescriptor_name, notes`
        )
        .eq('receiver_id', me.id)
        .order('created_at', { ascending: false })

      if (error) setErr(error.message)
      setRows(data ?? [])
      setLoading(false)
    }
    run()
  }, [])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const s = q.toLowerCase()
      const matchSearch =
        (r.client_name ?? '').toLowerCase().includes(s) ||
        (r.project_title ?? '').toLowerCase().includes(s) ||
        (r.intake_status ?? '').toLowerCase().includes(s) ||
        (r.deal_stage ?? '').toLowerCase().includes(s)
      const matchIntake = intakeFilter.length === 0 || intakeFilter.includes(r.intake_status)
      const matchDeal = dealFilter.length === 0 || dealFilter.includes(r.deal_stage)
      return matchSearch && matchIntake && matchDeal
    })
  }, [rows, q, intakeFilter, dealFilter])

  const toggleFilter = (value: string, current: string[], setter: (v: string[]) => void) => {
    setter(current.includes(value) ? current.filter((v) => v !== value) : [...current, value])
  }

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
    <main style={{ maxWidth: 1200, margin: '48px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Mes recommandations reçues</h1>

      {/* Barre de recherche + filtres */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '12px 0 20px' }}>
        <input
          placeholder="Recherche (client, projet, statut)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ padding: 10, flex: 1 }}
        />
        <details style={{ position: 'relative' }}>
          <summary style={{ cursor: 'pointer' }}>Filtre prise en charge</summary>
          <div style={{ position: 'absolute', background: 'white', border: '1px solid #ccc', padding: 8, zIndex: 10 }}>
            {INTAKE.map((opt) => (
              <label key={opt} style={{ display: 'block' }}>
                <input
                  type="checkbox"
                  checked={intakeFilter.includes(opt)}
                  onChange={() => toggleFilter(opt, intakeFilter, setIntakeFilter)}
                />{' '}
                {opt}
              </label>
            ))}
          </div>
        </details>

        <details style={{ position: 'relative' }}>
          <summary style={{ cursor: 'pointer' }}>Filtre avancement</summary>
          <div style={{ position: 'absolute', background: 'white', border: '1px solid #ccc', padding: 8, zIndex: 10 }}>
            {DEAL.map((opt) => (
              <label key={opt} style={{ display: 'block' }}>
                <input
                  type="checkbox"
                  checked={dealFilter.includes(opt)}
                  onChange={() => toggleFilter(opt, dealFilter, setDealFilter)}
                />{' '}
                {opt}
              </label>
            ))}
          </div>
        </details>

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
              <th>Date</th>
              <th>Client</th>
              <th>Téléphone</th>
              <th>Projet</th>
              <th>Prise en charge</th>
              <th>Avancement</th>
              <th style={{ textAlign: 'right' }}>CA HT</th>
              <th style={{ textAlign: 'right' }}>CA Annuel HT</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td style={{ padding: 8 }}>{new Date(r.created_at).toLocaleDateString('fr-FR')}</td>
                <td style={{ padding: 8 }}>{r.client_name}</td>
                <td style={{ padding: 8 }}>{r.client_phone ?? '—'}</td>
                <td style={{ padding: 8, backgroundColor: PROJECT_COLORS[r.project_title ?? ''] ?? 'transparent' }}>
                  {r.project_title ?? '—'}
                </td>
                <td style={{ padding: 8 }}>
                  <select value={r.intake_status} onChange={(e) => updateRow(r.id, { intake_status: e.target.value })}>
                    {INTAKE.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: 8 }}>
                  <select value={r.deal_stage} onChange={(e) => updateRow(r.id, { deal_stage: e.target.value })}>
                    {DEAL.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ textAlign: 'right', padding: 8 }}>
                  <input
                    type="number"
                    step="0.01"
                    value={r.amount ?? ''}
                    onChange={(e) =>
                      updateRow(r.id, { amount: e.target.value === '' ? null : Number(e.target.value) })
                    }
                    style={{ width: 100 }}
                  />
                </td>
                <td style={{ textAlign: 'right', padding: 8 }}>
                  <input
                    type="number"
                    step="0.01"
                    value={r.annual_amount ?? ''}
                    onChange={(e) =>
                      updateRow(r.id, { annual_amount: e.target.value === '' ? null : Number(e.target.value) })
                    }
                    style={{ width: 100 }}
                  />
                </td>
                <td style={{ padding: 8 }}>{savingId === r.id ? '💾 Sauvegarde…' : '—'}</td>
                <td style={{ padding: 8, display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setOpenDetailId(r.id)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid #ccc',
                      background: '#f9f9f9',
                      cursor: 'pointer'
                    }}
                  >
                    ℹ️ Détails
                  </button>
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

                  {openDetailId === r.id && <DetailsModal data={r} onClose={() => setOpenDetailId(null)} />}
                  {openNoteId === r.id && (
                    <NotesModal note={r.notes ?? ''} onSave={(v) => updateRow(r.id, { notes: v })} onClose={() => setOpenNoteId(null)} />
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
