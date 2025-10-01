import './globals.css'
import Link from 'next/link'
import AdminLink from './_components/AdminLink'

export const metadata = {
  title: 'Synergies App',
  description: 'Recommandations internes Orpi',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-gray-100 text-gray-900">
        <div className="min-h-screen flex flex-col">

          {/* ✅ TEST visuel temporaire */}
          <div className="bg-red-600 text-white text-center font-bold py-2">
            LAYOUT EN PLACE ✅
          </div>

          {/* HEADER */}
          <header className="bg-gray-900 text-white shadow-md">
            <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
              <nav className="flex flex-wrap items-center gap-6 text-sm font-medium">
                <Link href="/" className="hover:underline font-bold">🎯 Synergies</Link>
                <Link href="/inbox" className="hover:underline">Mes reçues</Link>
                <Link href="/outbox" className="hover:underline">Mes envoyées</Link>
                <Link href="/kanban" className="hover:underline">Kanban</Link>
                <Link href="/reco/new" className="hover:underline">Nouvelle reco</Link>
                <AdminLink />
              </nav>
              <Link href="/login" className="hover:underline text-sm">Se connecter / Mon compte</Link>
            </div>
          </header>

          {/* CONTENU */}
          <main className="flex-1 max-w-4xl mx-auto px-6 py-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
