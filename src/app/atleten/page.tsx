import Link from "next/link";
import AtletenZoek from "@/components/AtletenZoek";
import Reveal from "@/components/ui/Reveal";
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
    <div className="space-y-10">
      <Reveal as="div">
        <Link
          href="/"
          className="text-xs font-medium text-[color:var(--color-vzc-blue)] hover:underline"
        >
          ← Terug naar overzicht
        </Link>
        <p className="eyebrow mt-5">Deelnemersregister · 2026</p>
        <h1 className="font-display mt-2 text-3xl text-[color:var(--color-vzc-blue-dark)] sm:text-4xl">
          Atleten
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[color:var(--color-vzc-ink-soft)]">
          Alle atleten die in 2026 een NTB teamcompetitie-wedstrijd voor VZC of een tegenstander
          hebben gereden. Standaard zie je alleen de VZC-atleten; vink de checkbox uit om het hele
          deelnemersveld te zien.
        </p>
      </Reveal>
      <AtletenZoek items={items} />
    </div>
  );
}
