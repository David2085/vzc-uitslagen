import Link from "next/link";
import { notFound } from "next/navigation";
import SegmentAnalyse from "@/components/SegmentAnalyse";
import RaceVerloopChart from "@/components/RaceVerloopChart";
import {
  alleAtleten,
  atleetBijSlug,
  formatSeconden,
  wedstrijdBijSlug,
  SEGMENT_LABELS,
} from "@/lib/data";
import type { SegmentSleutel } from "@/lib/types";

export function generateStaticParams() {
  return alleAtleten().map((a) => ({ slug: a.slug }));
}

export default async function AtleetPagina({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const atleet = atleetBijSlug(slug);
  if (!atleet) return notFound();

  return (
    <div className="space-y-10">
      <div>
        <Link
          href="/atleten"
          className="text-xs font-medium text-[color:var(--color-vzc-blue)] hover:underline"
        >
          ← Alle atleten
        </Link>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--color-vzc-ink)]">
            {atleet.naam}
          </h1>
          {atleet.isVzc ? <span className="vzc-pill-vzc vzc-pill">VZC-atleet</span> : null}
        </div>
        <p className="mt-1 text-sm text-[color:var(--color-vzc-muted)]">
          Club: {atleet.club} · {atleet.resultaten.length} race
          {atleet.resultaten.length === 1 ? "" : "s"} in 2026
        </p>
      </div>

      {atleet.resultaten.map((race) => {
        const wedstrijd = wedstrijdBijSlug(race.wedstrijdSlug);
        if (!wedstrijd) return null;
        const segmenten: SegmentSleutel[] = ["zwem", "t1", "fiets", "t2", "loop"];
        const isDnf = race.rank === "DNF";

        return (
          <article
            key={race.wedstrijdSlug}
            className="space-y-6 rounded-2xl border border-[color:var(--color-vzc-blue)]/12 bg-white p-6 shadow-[0_1px_2px_rgba(10,81,145,0.05),0_8px_24px_-16px_rgba(10,81,145,0.18)]"
          >
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link
                  href={`/wedstrijd/${race.wedstrijdSlug}`}
                  className="text-sm font-semibold text-[color:var(--color-vzc-blue-dark)] hover:underline"
                >
                  {race.wedstrijd.naam}
                </Link>
                <div className="text-xs text-[color:var(--color-vzc-muted)]">
                  {nlDatum(race.wedstrijd.datum)} · {race.wedstrijd.locatie} ·{" "}
                  {race.wedstrijd.afstand}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-3xl font-bold tabular-nums text-[color:var(--color-vzc-ink)]">
                    {isDnf ? "DNF" : `#${race.rank}`}
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-[color:var(--color-vzc-muted)]">
                    {isDnf ? "niet gefinisht" : `van ${wedstrijd.uitslagen.length} starters`}
                  </div>
                </div>
                <div className="h-12 w-px bg-[color:var(--color-vzc-blue)]/15" />
                <div className="text-right">
                  <div className="text-2xl font-semibold tabular-nums text-[color:var(--color-vzc-blue-dark)]">
                    {formatSeconden(race.splits.totaal)}
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-[color:var(--color-vzc-muted)]">
                    eindtijd
                  </div>
                </div>
              </div>
            </header>

            {!isDnf ? (
              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[color:var(--color-vzc-blue-dark)]">
                  Positie door de race
                </h2>
                <div className="rounded-lg border border-[color:var(--color-vzc-blue)]/10 bg-white p-4">
                  <RaceVerloopChart
                    atleet={race}
                    totaalStarters={wedstrijd.uitslagen.length}
                  />
                  <p className="mt-2 text-xs text-[color:var(--color-vzc-muted)]">
                    Klassement op elk meetpunt — hoger in de grafiek is een betere positie.
                  </p>
                </div>
              </section>
            ) : null}

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[color:var(--color-vzc-blue-dark)]">
                Race-verloop
              </h2>
              <div className="overflow-x-auto rounded-lg border border-[color:var(--color-vzc-blue)]/10">
                <table className="uitslagen min-w-[640px]">
                  <thead>
                    <tr>
                      <th>Punt</th>
                      <th className="text-right">Segmenttijd</th>
                      <th className="text-right">Cumulatief</th>
                      <th className="text-right">Positie in segment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {segmenten.map((seg) => {
                      const cumulatief =
                        seg === "zwem"
                          ? race.cumulatief.na_zwem
                          : seg === "t1"
                            ? race.cumulatief.na_t1
                            : seg === "fiets"
                              ? race.cumulatief.na_fiets
                              : seg === "t2"
                                ? race.cumulatief.na_t2
                                : race.cumulatief.eindtijd;
                      const totaalSeg = wedstrijd.uitslagen.filter(
                        (a) => a.splits[seg] !== null,
                      ).length;
                      return (
                        <tr key={seg}>
                          <td className="font-medium text-[color:var(--color-vzc-ink)]">
                            {SEGMENT_LABELS[seg]}
                          </td>
                          <td className="text-right tabular-nums">
                            {formatSeconden(race.splits[seg])}
                          </td>
                          <td className="text-right tabular-nums text-[color:var(--color-vzc-ink-soft)]">
                            {formatSeconden(cumulatief)}
                          </td>
                          <td className="text-right text-sm text-[color:var(--color-vzc-muted)]">
                            {race.rankPerSegment[seg]
                              ? `${race.rankPerSegment[seg]} van ${totaalSeg}`
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <SegmentAnalyse atleet={race} alleInWedstrijd={wedstrijd.uitslagen} />
          </article>
        );
      })}
    </div>
  );
}

function nlDatum(datum: string): string {
  const maanden = [
    "januari",
    "februari",
    "maart",
    "april",
    "mei",
    "juni",
    "juli",
    "augustus",
    "september",
    "oktober",
    "november",
    "december",
  ];
  const d = Number(datum.slice(8, 10));
  const m = Number(datum.slice(5, 7));
  const y = datum.slice(0, 4);
  return `${d} ${maanden[m - 1]} ${y}`;
}
