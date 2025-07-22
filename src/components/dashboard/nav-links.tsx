'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navLinks = [
  { href: '/dashboard', label: 'Organization' },
  { href: '/projects', label: 'Projects' },
  { href: '/users', label: 'Users' },
]

export function NavLinks() {
  const pathname = usePathname()

  return (
    <>
      {navLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "transition-colors hover:text-foreground/80",
            pathname.startsWith(link.href) ? "text-foreground" : "text-foreground/60"
          )}
        >
          {link.label}
        </Link>
      ))}
    </>
  )
}
