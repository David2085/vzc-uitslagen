import Link from "next/link";
import { formatSeconden, formatVerschil } from "@/lib/data";
import type { WedstrijdVolledig, AtleetUitslag } from "@/lib/types";

export default function GapToWinner({ wedstrijd }: { wedstrijd: WedstrijdVolledig }) {
  const finishers: { atleet: AtleetUitslag; totaal: number }[] = [];
  const dnf: AtleetUitslag[] = [];
  for (const u of wedstrijd.uitslagen) {
    if (u.rank === "DNF" || u.splits.totaal === null) {
      dnf.push(u);
    } else {
      finishers.push({ atleet: u, totaal: u.splits.totaal });
    }
  }
  if (finishers.length === 0) return null;

  finishers.sort((a, b) => a.totaal - b.totaal);
  const winnaarTijd = finishers[0].totaal;
  const maxGap = finishers[finishers.length - 1].totaal - winnaarTijd;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-[color:var(--color-vzc-blue-dark)]">
          Tijdverschil met de winnaar
        </h2>
        <p className="text-xs text-[color:var(--color-vzc-muted)]">
          Eindtijd-verschil per atleet ten opzichte van {finishers[0].atleet.naam} (
          {formatSeconden(winnaarTijd)}). VZC-atleten in geel.
        </p>
      </div>

      <div className="vzc-card overflow-hidden py-1">
        {finishers.map(({ atleet, totaal }, idx) => {
          const gap = totaal - winnaarTijd;
          const pct = maxGap > 0 ? (gap / maxGap) * 100 : 0;
          const positie = idx + 1;
          return (
            <div
              key={atleet.atleetSlug}
              className={"gap-row" + (atleet.isVzc ? " vzc" : "")}
            >
              <span className="text-xs font-semibold tabular-nums text-[color:var(--color-vzc-ink-soft)]">
                {positie}
              </span>
              <Link
                href={`/atleet/${atleet.atleetSlug}`}
                className="truncate font-medium text-[color:var(--color-vzc-ink)] hover:text-[color:var(--color-vzc-blue)] hover:underline"
                title={atleet.club}
              >
                {atleet.naam}
              </Link>
              <span className="gap-bar" aria-hidden>
                <span
                  className="fill"
                  style={{ width: gap === 0 ? "100%" : `${Math.max(2, pct)}%` }}
                />
              </span>
              <span className="text-right tabular-nums text-[color:var(--color-vzc-ink-soft)]">
                {gap === 0 ? formatSeconden(totaal) : formatVerschil(gap)}
              </span>
            </div>
          );
        })}
      </div>

      {dnf.length > 0 ? (
        <p className="text-xs text-[color:var(--color-vzc-muted)]">
          Niet gefinisht ({dnf.length}):{" "}
          {dnf
            .map((u) => (u.isVzc ? `${u.naam} (VZC)` : u.naam))
            .join(", ")}
          .
        </p>
      ) : null}
    </section>
  );
}
