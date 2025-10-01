// app/layout.tsx
import './globals.css'
import Link from 'next/link'
import AdminLink from './_components/AdminLink'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Synergies App',
  description: 'Plateforme interne de recommandations',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-gray-100 text-gray-900">
        <nav className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center">
          <div className="flex space-x-6 items-center">
            <Link href="/" className="font-bold text-lg">🎯 Synergies</Link>
            <Link href="/inbox">Mes reçues</Link>
            <Link href="/sent">Mes envoyées</Link>
            <Link href="/kanban">Kanban</Link>
            <Link href="/reco/new">Nouvelle reco</Link>
            <AdminLink />
          </div>
          <div>
            <Link href="/login" className="text-sm opacity-80 hover:opacity-100 transition">Se connecter / Mon compte</Link>
          </div>
        </nav>

        <main className="p-6">{children}</main>
      </body>
    </html>
  )
}
