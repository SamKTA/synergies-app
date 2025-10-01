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
      <body className="bg-white text-gray-900">
        <header className="bg-gray-900 text-white p-4 flex justify-between items-center">
          <nav className="flex gap-6 items-center">
            <Link href="/" className="font-bold hover:underline">🎯 Synergies</Link>
            <Link href="/inbox" className="hover:underline">Mes reçues</Link>
            <Link href="/outbox" className="hover:underline">Mes envoyées</Link>
            <Link href="/kanban" className="hover:underline">Kanban</Link>
            <Link href="/reco/new" className="hover:underline">Nouvelle reco</Link>
            <AdminLink />
          </nav>
          <Link href="/login" className="hover:underline">Se connecter / Mon compte</Link>
        </header>
        <main>{children}</main>
      </body>
    </html>
  )
}
