import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Reveal from "@/components/ui/Reveal";
import SeizoenTrend from "@/components/SeizoenTrend";
import SegmentAnalyse from "@/components/SegmentAnalyse";
import RaceVerloopChart from "@/components/RaceVerloopChart";
import {
  afstandenVoor,
  alleAtleten,
  atleetBijSlug,
  formatSeconden,
  tempoVoorSegment,
  wedstrijdBijSlug,
  SEGMENT_LABELS,
  type AtleetProfiel,
} from "@/lib/data";
import type { SegmentSleutel } from "@/lib/types";

export function generateStaticParams() {
  return alleAtleten().map((a) => ({ slug: a.slug }));
}

// Beste eindklassering (laagste rank) over alle races van de atleet.
function besteResultaat(atleet: AtleetProfiel): { rank: number; race: string } | null {
  let beste: { rank: number; race: string } | null = null;
  for (const r of atleet.resultaten) {
    if (typeof r.rank !== "number") continue;
    if (!beste || r.rank < beste.rank) {
      beste = { rank: r.rank, race: r.wedstrijd.naam };
    }
  }
  return beste;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const atleet = atleetBijSlug(slug);
  if (!atleet) return { title: "Atleet niet gevonden" };

  const beste = besteResultaat(atleet);
  const aantal = atleet.resultaten.length;
  const titelStaart = beste ? ` — beste resultaat #${beste.rank}` : "";
  const title = `${atleet.naam}${titelStaart}`;
  const description = beste
    ? `${atleet.naam} (${atleet.club}) — beste resultaat #${beste.rank} bij ${beste.race}, ${aantal} race${aantal === 1 ? "" : "s"} in 2026. Race-verloop, segmentanalyse en seizoenstempo.`
    : `${atleet.naam} (${atleet.club}) — ${aantal} race${aantal === 1 ? "" : "s"} in 2026. Race-verloop, segmentanalyse en seizoenstempo.`;

  return { title, description };
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
    <div className="space-y-12">
      <div>
        <Link
          href="/atleten"
          className="text-xs font-medium text-[color:var(--color-vzc-blue)] hover:underline"
        >
          ← Alle atleten
        </Link>
        <div className="mt-3">
          <span className="eyebrow">Atleet · seizoen 2026</span>
          <div className="mt-1 flex flex-wrap items-end gap-3">
            <h1 className="font-display text-4xl text-[color:var(--color-vzc-ink)]">
              {atleet.naam}
            </h1>
            {atleet.isVzc ? <span className="vzc-pill-vzc vzc-pill">VZC-atleet</span> : null}
          </div>
        </div>
        <p className="mt-2 text-sm text-[color:var(--color-vzc-muted)]">
          {atleet.club} ·{" "}
          <span className="num">{atleet.resultaten.length}</span> race
          {atleet.resultaten.length === 1 ? "" : "s"} in 2026
        </p>
      </div>

      <SeizoenTrend atleet={atleet} />

      {atleet.resultaten.map((race) => {
        const wedstrijd = wedstrijdBijSlug(race.wedstrijdSlug);
        if (!wedstrijd) return null;
        const segmenten: SegmentSleutel[] = ["zwem", "t1", "fiets", "t2", "loop"];
        const isDnf = race.rank === "DNF";
        const dist = afstandenVoor(race.wedstrijd);

        return (
          <Reveal
            as="section"
            key={race.wedstrijdSlug}
            className="vzc-card space-y-6 p-6"
          >
            <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[color:var(--color-vzc-line)] pb-5">
              <div>
                <Link
                  href={`/wedstrijd/${race.wedstrijdSlug}`}
                  className="font-display text-xl text-[color:var(--color-vzc-blue-dark)] hover:underline"
                >
                  {race.wedstrijd.naam}
                </Link>
                <div className="mt-1 text-xs text-[color:var(--color-vzc-muted)]">
                  {nlDatum(race.wedstrijd.datum)} · {race.wedstrijd.locatie} ·{" "}
                  {race.wedstrijd.afstand}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="num text-3xl leading-none text-[color:var(--color-vzc-ink)]">
                    {isDnf ? "DNF" : `#${race.rank}`}
                  </div>
                  <div className="eyebrow mt-1">
                    {isDnf ? "niet gefinisht" : `van ${wedstrijd.uitslagen.length}`}
                  </div>
                </div>
                <div className="h-12 w-px bg-[color:var(--color-vzc-line)]" />
                <div className="text-right">
                  <div className="num text-2xl leading-none text-[color:var(--color-vzc-blue-dark)]">
                    {formatSeconden(race.splits.totaal)}
                  </div>
                  <div className="eyebrow mt-1">eindtijd</div>
                </div>
              </div>
            </header>

            {!isDnf ? (
              <section>
                <h2 className="font-display mb-3 text-lg text-[color:var(--color-vzc-blue-dark)]">
                  Positie door de race
                </h2>
                <div className="rounded-xl border border-[color:var(--color-vzc-line)] p-4">
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
              <h2 className="font-display mb-3 text-lg text-[color:var(--color-vzc-blue-dark)]">
                Race-verloop
              </h2>
              <div className="scroll-hint">
                <span aria-hidden>←</span>
                Veeg horizontaal voor alle kolommen
                <span aria-hidden>→</span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-[color:var(--color-vzc-line)]">
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
                      const tempo = tempoVoorSegment(race.splits[seg], seg, dist);
                      return (
                        <tr key={seg}>
                          <td className="font-medium text-[color:var(--color-vzc-ink)]">
                            {SEGMENT_LABELS[seg]}
                          </td>
                          <td className="text-right">
                            <span className="num">{formatSeconden(race.splits[seg])}</span>
                            {tempo ? (
                              <div className="num text-[11px] font-normal text-[color:var(--color-vzc-muted)]">
                                {tempo.tekst} {tempo.eenheid}
                              </div>
                            ) : null}
                          </td>
                          <td className="text-right">
                            <span className="num text-[color:var(--color-vzc-ink-soft)]">
                              {formatSeconden(cumulatief)}
                            </span>
                          </td>
                          <td className="text-right text-sm text-[color:var(--color-vzc-muted)]">
                            {race.rankPerSegment[seg] ? (
                              <>
                                <span className="num">{race.rankPerSegment[seg]}</span> van{" "}
                                <span className="num">{totaalSeg}</span>
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <SegmentAnalyse atleet={race} alleInWedstrijd={wedstrijd.uitslagen} />
          </Reveal>
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
