'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Recommendation = {
  id: number
  sender_name: string
  receiver_name: string
  message: string
  created_at: string
}

export default function SentPage() {
  const [recos, setRecos] = useState<Recommendation[]>([])

  useEffect(() => {
    const fetchRecos = async () => {
      const { data, error } = await supabase
        .from('recommendations')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setRecos(data)
      }
    }

    fetchRecos()
  }, [])

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>📤 Recos envoyées</h1>

      {recos.length === 0 ? (
        <p>Aucune recommandation envoyée pour le moment.</p>
      ) : (
        <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {recos.map((reco) => (
            <li key={reco.id} style={{ padding: '12px', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
              <p><strong>À :</strong> {reco.receiver_name}</p>
              <p><strong>Message :</strong> {reco.message}</p>
              <p style={{ fontSize: '12px', color: '#64748b' }}>{new Date(reco.created_at).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
