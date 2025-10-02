// app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Synergies App',
  description: 'Plateforme interne de recommandations',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-gradient-to-br from-gray-50 to-gray-200 text-gray-900 min-h-screen font-sans">
        {/* Barre de navigation */}
        <header className="bg-gray-900 text-white px-6 py-4 shadow">
          <nav className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex space-x-6 text-sm font-medium">
              <Link href="/" className="hover:underline">🎯 Synergies</Link>
              <Link href="/inbox" className="hover:underline">Mes reçues</Link>
              <Link href="/outbox" className="hover:underline">Mes envoyées</Link>
              <Link href="/kanban" className="hover:underline">Kanban</Link>
              <Link href="/reco/new" className="hover:underline">Nouvelle reco</Link>
            </div>
            <div>
              <Link href="/login" className="hover:underline text-sm">Se connecter / Mon compte</Link>
            </div>
          </nav>
        </header>

        {/* Contenu de la page */}
        <main className="px-4 py-10">
          {children}
        </main>
      </body>
    </html>
  )
}
