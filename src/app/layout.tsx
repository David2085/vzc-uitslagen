import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { officieelKlassement } from "@/lib/data";
import MainNav from "@/components/ui/MainNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "VZC Triathlon — Uitslagen 2026",
  description:
    "Uitslagen van de NTB teamcompetitie 2026 voor VZC Triathlon Veenendaal. Per atleet inzicht in race-verloop en segmentanalyse.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const bijgewerkt = officieelKlassement()?.bijgewerkt ?? null;

  return (
    <html lang="nl" suppressHydrationWarning>
      <body>
        <header className="border-b border-[color:var(--color-vzc-line)] bg-[color:var(--color-vzc-paper)]">
          <div className="mx-auto max-w-6xl px-5 pt-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
              <Link href="/" className="flex items-center gap-3">
                <Image
                  src="/logo-vzc.png"
                  alt="VZC Veenendaal"
                  width={44}
                  height={44}
                  priority
                  className="h-9 w-9 rounded-md sm:h-11 sm:w-11"
                />
                <span className="leading-tight">
                  <span className="font-display block text-lg tracking-tight text-[color:var(--color-vzc-blue-dark)] sm:text-xl">
                    VZC Triathlon
                  </span>
                  <span className="eyebrow block">NTB teamcompetitie 2026</span>
                </span>
              </Link>
              <MainNav />
            </div>
            {/* Masthead-rule (graft: krant) */}
            <div className="mt-3 h-0.5 w-full bg-[color:var(--color-vzc-blue)]" />
            <div className="flex flex-wrap items-center justify-between gap-2 py-1.5 text-[11px] text-[color:var(--color-vzc-muted)]">
              <span>Seizoen 2026 · NTB teamcompetitie</span>
              {bijgewerkt ? (
                <span className="num">
                  Bijgewerkt {bijgewerkt} · bron teamcompetities.nl
                </span>
              ) : null}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-5 sm:py-8">{children}</main>

        <footer className="mt-16 border-t border-[color:var(--color-vzc-line)] bg-[color:var(--color-vzc-paper)]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-5 py-5 text-xs text-[color:var(--color-vzc-muted)]">
            <span>VZC Triathlon Veenendaal · NTB teamcompetitie 2026</span>
            <span className="num">
              {bijgewerkt ? `Klassement bijgewerkt ${bijgewerkt}` : ""}
            </span>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
