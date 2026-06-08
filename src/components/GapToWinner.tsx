import Link from "next/link";
import { formatSeconden, formatVerschil } from "@/lib/data";
import Reveal from "@/components/ui/Reveal";
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
    <Reveal as="section" className="space-y-4">
      <div>
        <span className="eyebrow">Eindtijd-verschil</span>
        <h2 className="font-display mt-1 text-2xl text-[color:var(--color-vzc-blue-dark)]">
          Tijdverschil met de winnaar
        </h2>
        <p className="mt-1.5 max-w-xl text-xs text-[color:var(--color-vzc-muted)]">
          Verschil in eindtijd per atleet ten opzichte van {finishers[0].atleet.naam} (
          <span className="num">{formatSeconden(winnaarTijd)}</span>). VZC-atleten met gele spine.
        </p>
      </div>

      <div className="vzc-card overflow-hidden py-1">
        {finishers.map(({ atleet, totaal }, idx) => {
          const gap = totaal - winnaarTijd;
          const pct = maxGap > 0 ? (gap / maxGap) * 100 : 0;
          const positie = idx + 1;
          const leider = positie === 1;
          return (
            <div
              key={atleet.atleetSlug}
              className={"gap-row" + (atleet.isVzc ? " vzc" : "")}
            >
              {leider ? (
                <span className="leader-ring num text-xs font-bold text-[color:var(--color-vzc-blue-dark)]">
                  1
                </span>
              ) : (
                <span className="num text-xs font-semibold text-[color:var(--color-vzc-ink-soft)]">
                  {positie}
                </span>
              )}
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
              <span className="num text-right">
                {gap === 0 ? (
                  <span className="text-[color:var(--color-vzc-blue-dark)]">
                    {formatSeconden(totaal)}
                  </span>
                ) : (
                  <span className="text-[color:var(--color-neg)]">{formatVerschil(gap)}</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {dnf.length > 0 ? (
        <p className="text-xs text-[color:var(--color-vzc-muted)]">
          Niet gefinisht (<span className="num">{dnf.length}</span>):{" "}
          {dnf.map((u) => (u.isVzc ? `${u.naam} (VZC)` : u.naam)).join(", ")}.
        </p>
      ) : null}
    </Reveal>
  );
}
