import Link from 'next/link'
import { getSession } from '@/lib/session'
import { NavLinks } from './nav-links'
import { ThemeToggle } from './theme-toggle'
import { UserNav } from './user-nav'
import { Package } from 'lucide-react'

export async function Header() {
  const session = await getSession()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
            <Package className="h-6 w-6" />
            <span className="font-bold">RGI DevOps Central</span>
          </Link>
          <nav className="hidden items-center space-x-6 text-sm font-medium md:flex">
            <NavLinks />
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <ThemeToggle />
          <UserNav user={session} />
        </div>
      </div>
    </header>
  )
}
