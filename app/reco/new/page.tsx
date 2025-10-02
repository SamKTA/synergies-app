'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Employee = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  is_active?: boolean | null
}

export default function NewRecoPage() {
  // Champs formulaire
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [projectTitle, setProjectTitle] = useState('')
  const [projectAddress, setProjectAddress] = useState('')
  const [projectDetails, setProjectDetails] = useState('')
  const [receiverId, setReceiverId] = useState<string>('')

  // État
  const [me, setMe] = useState<Employee | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  // Sélecteur intelligent (receveur)
  const [receiverSearch, setReceiverSearch] = useState('')
  const [receiverOpen, setReceiverOpen] = useState(false)

  const receiver = useMemo(
    () => employees.find(e => e.id === receiverId) ?? null,
    [employees, receiverId]
  )

  const filteredEmployees = useMemo(() => {
    const s = receiverSearch.trim().toLowerCase()
    if (!s) return employees
    return employees.filter(e => {
      const fn = (e.first_name ?? '').toLowerCase()
      const ln = (e.last_name ?? '').toLowerCase()
      const em = (e.email ?? '').toLowerCase()
      return fn.includes(s) || ln.includes(s) || em.includes(s)
    })
  }, [employees, receiverSearch])

  // Chargement des données de base
  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError(null)

      // 1) Utilisateur connecté ?
      const { data: userData, error: userErr } = await supabase.auth.getUser()
      if (userErr) { setError(userErr.message); setLoading(false); return }
      const user = userData?.user
      if (!user) { setError('Tu dois être connecté.'); setLoading(false); return }

      // 2) Ma fiche employé
      const { data: meRow, error: meErr } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, is_active')
        .eq('user_id', user.id)
        .maybeSingle()
      if (meErr) { setError(meErr.message); setLoading(false); return }
      if (!meRow) { setError('Aucune fiche employé liée à ton compte.'); setLoading(false); return }
      setMe(meRow)

      // 3) Liste des receveurs (annuaire sécurisé via RPC)
      const { data: list, error: listErr } = await supabase.rpc('list_active_employees')
      if (listErr) { setError(listErr.message); setLoading(false); return }
      setEmployees((list ?? []) as Employee[])

      setLoading(false)
    }
    run()
  }, [])

  // Soumission du formulaire
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!me) { setError('Utilisateur non identifié.'); return }
    if (!receiver) { setError('Choisis un receveur.'); return }
    if (!clientName) { setError('Le nom du client est requis.'); return }

    setSubmitting(true)

    const prescriptorName = [me.first_name ?? '', me.last_name ?? ''].join(' ').trim()

    const payload = {
      prescriptor_id: me.id,
      prescriptor_name: prescriptorName,
      prescriptor_email: me.email,

      receiver_id: receiver.id,
      receiver_email: receiver.email,

      client_name: clientName,
      client_email: clientEmail || null,
      client_phone: clientPhone || null,

      project_title: projectTitle || null,
      project_details: projectDetails || null,
      project_address: projectAddress || null,
    }

    // 4) Insert
    const { error: insertErr } = await supabase
      .from('recommendations')
      .insert(payload)

    if (insertErr) {
      setError(`Erreur à l’enregistrement : ${insertErr.message}`)
      setSubmitting(false)
      return
    }

    // 5) Envoi de l'e-mail au receveur (best-effort)
    try {
      const emailSubject = `Nouvelle recommandation – ${clientName}`
      const emailHtml = `
        <h2>Nouvelle recommandation</h2>
        <p><b>Client :</b> ${clientName}</p>
        ${clientEmail ? `<p><b>Email client :</b> ${clientEmail}</p>` : ''}
        ${clientPhone ? `<p><b>Téléphone client :</b> ${clientPhone}</p>` : ''}
        ${projectTitle ? `<p><b>Projet :</b> ${projectTitle}</p>` : ''}
        ${projectAddress ? `<p><b>Adresse :</b> ${projectAddress}</p>` : ''}
        ${projectDetails ? `<p><b>Détails :</b><br/>${projectDetails.replace(/\n/g,'<br/>')}</p>` : ''}
        <hr/>
        <p>Prescripteur : ${prescriptorName} (${me.email})</p>
        <p style="margin-top: 20px;"><a href="https://synergies-app-orpi.vercel.app" style="background: #2563eb; color: white; padding: 10px 16px; text-decoration: none; border-radius: 6px; display: inline-block;">🔗 Ouvrir l'application Synergies</a></p>
      `.trim()

      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: receiver.email,
          cc: me.email,
          subject: emailSubject,
          html: emailHtml
        })
      })
    } catch (e) {
      console.warn('Email send failed:', e)
    }

    setOk(true)
    setSubmitting(false)
    // reset minimal
    setClientName(''); setClientEmail(''); setClientPhone('');
    setProjectTitle(''); setProjectAddress(''); setProjectDetails('');
    setReceiverId(''); setReceiverSearch(''); setReceiverOpen(false)
  }

  if (loading) {
    return (
      <main style={{ maxWidth: 720, margin: '64px auto', fontFamily: 'sans-serif' }}>
        Chargement…
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 720, margin: '64px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Nouvelle recommandation</h1>
      {me && (
        <p style={{ opacity: .7, marginTop: 4 }}>
          Prescripteur : <b>{me.first_name ?? ''} {me.last_name ?? ''}</b> ({me.email})
        </p>
      )}

      {ok && (
        <div style={{ padding: 12, background: '#e6ffed', border: '1px solid #b7eb8f', margin: '16px 0' }}>
          ✅ Recommandation enregistrée.
        </div>
      )}
      {error && (
        <div style={{ padding: 12, background: '#fff1f0', border: '1px solid #ffa39e', margin: '16px 0', color: '#cf1322' }}>
          {error}
        </div>
      )}

      <form onSubmit={onSubmit}>
        {/* ---- Sélecteur intelligent de receveur ---- */}
        <label style={{ display: 'block', marginTop: 12, position: 'relative' }}>
          Receveur
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <input
              value={receiverSearch}
              onChange={(e) => { setReceiverSearch(e.target.value); setReceiverOpen(true) }}
              onFocus={() => setReceiverOpen(true)}
              placeholder="Tape un prénom, nom ou e-mail…"
              style={{ display: 'block', width: '100%', padding: 10, marginTop: 6 }}
            />
            {receiverId && (
              <button
                type="button"
                onClick={() => { setReceiverId(''); setReceiverSearch(''); setReceiverOpen(false) }}
                title="Effacer la sélection"
                style={{ marginTop: 6, padding:'8px 10px', border:'1px solid #ddd', borderRadius:8, background:'white' }}
              >
                Effacer
              </button>
            )}
          </div>

          <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
            {receiver
              ? <>Sélectionné : <b>{receiver.first_name ?? ''} {receiver.last_name ?? ''}</b> — {receiver.email}</>
              : <>Aucun receveur sélectionné</>}
          </div>

          {receiverOpen && (
            <div
              style={{
                position: 'absolute', left: 0, right: 0, top: '100%',
                background: 'white', border: '1px solid #e5e7eb', borderTop: 'none',
                zIndex: 20, maxHeight: 240, overflowY: 'auto', borderRadius: '0 0 10px 10px'
              }}
              onMouseDown={(e) => e.preventDefault()} // évite le blur pendant le clic
            >
              {filteredEmployees.length === 0 && (
                <div style={{ padding: 10, color: '#94a3b8' }}>Aucun résultat…</div>
              )}
              {filteredEmployees.map(emp => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => {
                    setReceiverId(emp.id)
                    setReceiverSearch(`${emp.first_name ?? ''} ${emp.last_name ?? ''} — ${emp.email}`)
                    setReceiverOpen(false)
                  }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '10px 12px', border: 'none', background: 'white', cursor: 'pointer'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'white')}
                >
                  <div style={{ fontWeight: 600 }}>{(emp.first_name ?? '')} {(emp.last_name ?? '')}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{emp.email}</div>
                </button>
              ))}
            </div>
          )}
        </label>

        <label style={{ display: 'block', marginTop: 12 }}>
          Nom du client *
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: 10, marginTop: 6 }}
          />
        </label>

        <label style={{ display: 'block', marginTop: 12 }}>
          Email du client
          <input
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 10, marginTop: 6 }}
          />
        </label>

        <label style={{ display: 'block', marginTop: 12 }}>
          Téléphone du client
          <input
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 10, marginTop: 6 }}
          />
        </label>

        <label style={{ display: 'block', marginTop: 12 }}>
          Projet concerné (titre)
          <input
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 10, marginTop: 6 }}
          />
        </label>

        <label style={{ display: 'block', marginTop: 12 }}>
          Adresse du projet
          <input
            value={projectAddress}
            onChange={(e) => setProjectAddress(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 10, marginTop: 6 }}
          />
        </label>

        <label style={{ display: 'block', marginTop: 12 }}>
          Détails du projet
          <textarea
            value={projectDetails}
            onChange={(e) => setProjectDetails(e.target.value)}
            rows={5}
            style={{ display: 'block', width: '100%', padding: 10, marginTop: 6 }}
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          style={{ marginTop: 16, padding: 12, width: '100%' }}
        >
          {submitting ? 'Enregistrement…' : 'Enregistrer la recommandation'}
        </button>
      </form>
    </main>
  )
}
