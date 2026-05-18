import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VZC Triathlon — Uitslagen 2026",
  description:
    "Uitslagen van de NTB teamcompetitie 2026 voor VZC Triathlon Veenendaal. Per atleet inzicht in race-verloop en segmentanalyse.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <header className="border-b border-[color:var(--color-vzc-blue)]/15 bg-white">
          <div className="mx-auto flex max-w-6xl items-center gap-5 px-5 py-4">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/logo-vzc.png"
                alt="VZC Veenendaal"
                width={44}
                height={44}
                priority
                className="h-11 w-11 rounded-md"
              />
              <span className="leading-tight">
                <span className="block text-sm font-semibold text-[color:var(--color-vzc-blue-dark)]">
                  VZC Triathlon
                </span>
                <span className="block text-xs text-[color:var(--color-vzc-muted)]">
                  Uitslagen NTB teamcompetitie 2026
                </span>
              </span>
            </Link>
            <nav className="ml-auto flex items-center gap-5 text-sm font-medium text-[color:var(--color-vzc-ink-soft)]">
              <Link href="/" className="hover:text-[color:var(--color-vzc-blue)]">
                Overzicht
              </Link>
              <Link href="/klassement" className="hover:text-[color:var(--color-vzc-blue)]">
                Klassement
              </Link>
              <Link href="/atleten" className="hover:text-[color:var(--color-vzc-blue)]">
                Atleten
              </Link>
              <a
                href="https://vzcveenendaal.nl/triathlon"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[color:var(--color-vzc-blue)]"
              >
                vzcveenendaal.nl
              </a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
        <Analytics />
      </body>
    </html>
  );
}
