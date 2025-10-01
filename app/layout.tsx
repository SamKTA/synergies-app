import Link from "next/link"
import AdminLink from "./_components/AdminLink"
import "./globals.css"

export const metadata = {
  title: "Synergies App",
  description: "Recommandations internes Orpi",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <header className="bg-gray-900 text-white shadow-md px-6 py-4 flex justify-between items-center">
          <nav className="flex flex-wrap items-center gap-6 text-sm font-medium">
            <Link href="/" className="hover:underline">🎯 Synergies</Link>
            <Link href="/inbox" className="hover:underline">Mes reçues</Link>
            <Link href="/outbox" className="hover:underline">Mes envoyées</Link>
            <Link href="/kanban" className="hover:underline">Kanban</Link>
            <Link href="/reco/new" className="hover:underline">Nouvelle reco</Link>
            <AdminLink />
          </nav>
          <Link href="/login" className="hover:underline text-sm">Se connecter / Mon compte</Link>
        </header>

        <main className="px-6 md:px-10 py-10 max-w-4xl mx-auto">
          {children}
        </main>
      </body>
    </html>
  )
}
