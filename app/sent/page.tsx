'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Recommendation = {
  id: string
  created_at: string
  client_name: string
  project_type: string
  prise_en_charge: string
  avancement: string
  montant: number
  statut: string
}

export default function SentRecommendationsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [recos, setRecos] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData?.user) return

      setUserId(userData.user.id)

      const { data, error } = await supabase
        .from('recommendations')
        .select('*')
        .eq('sender_id', userData.user.id)
        .order('created_at', { ascending: false })

      if (data) setRecos(data)
      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) return <p className="p-4">Chargement...</p>

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Mes recommandations envoyées</h1>

      <table className="min-w-full bg-white border border-gray-300 shadow-md rounded-md">
        <thead className="bg-gray-100 text-sm text-gray-700">
          <tr>
            <th className="px-4 py-2 text-left">Date</th>
            <th className="px-4 py-2 text-left">Client</th>
            <th className="px-4 py-2 text-left">Projet</th>
            <th className="px-4 py-2 text-left">Prise en charge</th>
            <th className="px-4 py-2 text-left">Avancement</th>
            <th className="px-4 py-2 text-left">Montant (€)</th>
            <th className="px-4 py-2 text-left">Statut</th>
          </tr>
        </thead>
        <tbody>
          {recos.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-4 text-center text-gray-500">
                Aucune recommandation envoyée pour le moment.
              </td>
            </tr>
          ) : (
            recos.map((reco) => (
              <tr key={reco.id} className="border-t text-sm">
                <td className="px-4 py-2">{new Date(reco.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-2">{reco.client_name}</td>
                <td className="px-4 py-2">{reco.project_type}</td>
                <td className="px-4 py-2">{reco.prise_en_charge}</td>
                <td className="px-4 py-2">{reco.avancement}</td>
                <td className="px-4 py-2">{reco.montant ?? '—'}</td>
                <td className="px-4 py-2">{reco.statut ?? '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
