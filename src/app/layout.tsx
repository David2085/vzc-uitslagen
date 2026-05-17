import type { Metadata } from "next";
import Link from "next/link";
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
              <span
                aria-hidden
                className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[color:var(--color-vzc-yellow)] text-[color:var(--color-vzc-blue-dark)] font-extrabold tracking-tight"
                style={{ boxShadow: "inset 0 0 0 2px var(--color-vzc-red)" }}
              >
                VZC
              </span>
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
        <footer className="mt-16 border-t border-[color:var(--color-vzc-blue)]/10 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-6 text-xs text-[color:var(--color-vzc-muted)]">
            VZC Triathlon — Veenendaal. Uitslagen ter informatie voor leden. Officiële uitslagen
            staan op{" "}
            <a
              className="underline decoration-dotted underline-offset-2"
              href="https://www.triathlonbond.nl/"
              target="_blank"
              rel="noreferrer"
            >
              triathlonbond.nl
            </a>
            .
          </div>
        </footer>
      </body>
    </html>
  );
}
