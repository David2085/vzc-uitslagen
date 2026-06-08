"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overzicht" },
  { href: "/klassement", label: "Klassement" },
  { href: "/atleten", label: "Atleten" },
];

export default function MainNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="-mx-5 flex items-center gap-4 overflow-x-auto px-5 text-sm font-medium text-[color:var(--color-vzc-ink-soft)] sm:mx-0 sm:ml-auto sm:gap-5 sm:overflow-visible sm:px-0">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={isActive(l.href) ? "page" : undefined}
          className={
            "shrink-0 border-b-2 pb-0.5 transition hover:text-[color:var(--color-vzc-blue)] " +
            (isActive(l.href)
              ? "border-[color:var(--color-vzc-blue)] text-[color:var(--color-vzc-blue-dark)]"
              : "border-transparent")
          }
        >
          {l.label}
        </Link>
      ))}
      <a
        href="https://vzcveenendaal.nl/triathlon"
        target="_blank"
        rel="noreferrer"
        className="shrink-0 border-b-2 border-transparent pb-0.5 text-[color:var(--color-vzc-muted)] hover:text-[color:var(--color-vzc-blue)]"
      >
        vzcveenendaal.nl
      </a>
    </nav>
  );
}
