import Link from "next/link";
import AtletenZoek from "@/components/AtletenZoek";
import { alleAtleten } from "@/lib/data";

export default function AtletenPagina() {
  const atleten = alleAtleten();
  const items = atleten.map((a) => {
    const ranks = a.resultaten
      .map((r) => r.rank)
      .filter((r): r is number => typeof r === "number");
    return {
      slug: a.slug,
      naam: a.naam,
      club: a.club,
      isVzc: a.isVzc,
      aantal: a.resultaten.length,
      besteRank: ranks.length ? Math.min(...ranks) : null,
    };
  });

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/"
          className="text-xs font-medium text-[color:var(--color-vzc-blue)] hover:underline"
        >
          ← Terug naar overzicht
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Atleten</h1>
        <p className="mt-1 max-w-2xl text-sm text-[color:var(--color-vzc-muted)]">
          Alle atleten die in 2026 een NTB teamcompetitie-wedstrijd voor VZC of een tegenstander
          hebben gereden. Standaard zie je alleen de VZC-atleten; vink de checkbox uit om het hele
          deelnemersveld te zien.
        </p>
      </div>
      <AtletenZoek items={items} />
    </div>
  );
}
