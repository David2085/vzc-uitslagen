import Link from "next/link";
import { notFound } from "next/navigation";
import {
  alleWedstrijden,
  formatSeconden,
  wedstrijdBijSlug,
  SEGMENT_LABELS,
} from "@/lib/data";
import type { SegmentSleutel } from "@/lib/types";

export function generateStaticParams() {
  return alleWedstrijden().map((w) => ({ slug: w.slug }));
}

export default async function WedstrijdPagina({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const wedstrijd = wedstrijdBijSlug(slug);
  if (!wedstrijd) return notFound();

  const uitslagen = [...wedstrijd.uitslagen].sort((a, b) => {
    if (a.rank === "DNF" && b.rank === "DNF") return 0;
    if (a.rank === "DNF") return 1;
    if (b.rank === "DNF") return -1;
    return (a.rank as number) - (b.rank as number);
  });

  const segmenten: SegmentSleutel[] = ["zwem", "t1", "fiets", "t2", "loop"];

  const aantalPerSegment: Record<SegmentSleutel, number> = {
    zwem: 0,
    t1: 0,
    fiets: 0,
    t2: 0,
    loop: 0,
  };
  for (const u of wedstrijd.uitslagen) {
    for (const s of segmenten) {
      if (u.rankPerSegment[s] !== null) aantalPerSegment[s] += 1;
    }
  }
  const aantalTotaal = wedstrijd.uitslagen.filter(
    (u) => u.rank !== "DNF" && u.splits.totaal !== null,
  ).length;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/"
          className="text-xs font-medium text-[color:var(--color-vzc-blue)] hover:underline"
        >
          ← Terug naar overzicht
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          {wedstrijd.wedstrijd.naam}
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-vzc-muted)]">
          {nlDatum(wedstrijd.wedstrijd.datum)} · {wedstrijd.wedstrijd.locatie} ·{" "}
          {wedstrijd.wedstrijd.afstand} · {wedstrijd.wedstrijd.divisie}
          {wedstrijd.wedstrijd.poule ? ` (poule ${wedstrijd.wedstrijd.poule})` : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {wedstrijd.wedstrijd.vzc_teams.map((t) => (
            <span key={t} className="vzc-pill-vzc vzc-pill">
              VZC team: {t}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-[color:var(--color-vzc-muted)]">
        <span className="font-medium uppercase tracking-wider">Snelheid per segment</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-6 rounded" style={{ background: heatmapKleur(0) }} />
          snelste
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-6 rounded" style={{ background: heatmapKleur(0.5) }} />
          midden
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-6 rounded" style={{ background: heatmapKleur(1) }} />
          langzaamste
        </span>
      </div>

      <div className="vzc-card overflow-x-auto">
        <table className="uitslagen heatmap min-w-[1100px]">
          <thead>
            <tr>
              <th className="w-10">#</th>
              <th className="w-14">Bib</th>
              <th>Atleet</th>
              <th>Team</th>
              {segmenten.flatMap((s) => [
                <th key={`${s}-tijd`} className="text-right">
                  {SEGMENT_LABELS[s]}
                </th>,
                <th
                  key={`${s}-rank`}
                  className="text-right text-[color:var(--color-vzc-muted)]"
                >
                  #
                </th>,
              ])}
              <th className="text-right">Totaal</th>
            </tr>
          </thead>
          <tbody>
            {uitslagen.map((u) => {
              const isDnf = u.rank === "DNF";
              const klassen = [u.isVzc ? "vzc" : "", isDnf ? "dnf" : ""]
                .filter(Boolean)
                .join(" ");
              return (
                <tr key={`${u.atleetSlug}-${u.bib ?? ""}`} className={klassen}>
                  <td className="text-sm font-semibold text-[color:var(--color-vzc-ink-soft)]">
                    {isDnf ? "DNF" : u.rank}
                  </td>
                  <td className="text-xs text-[color:var(--color-vzc-muted)] tabular-nums">
                    {u.bib ?? "—"}
                  </td>
                  <td>
                    <Link
                      href={`/atleet/${u.atleetSlug}`}
                      className="font-medium text-[color:var(--color-vzc-ink)] hover:text-[color:var(--color-vzc-blue)] hover:underline"
                    >
                      {u.naam}
                    </Link>
                  </td>
                  <td className="text-sm text-[color:var(--color-vzc-ink-soft)]">{u.club}</td>
                  {segmenten.flatMap((s) => {
                    const tijd = u.splits[s];
                    const rang = u.rankPerSegment[s];
                    const n = aantalPerSegment[s];
                    const kleur =
                      rang !== null && n > 1 ? heatmapKleur((rang - 1) / (n - 1)) : "transparent";
                    return [
                      <td
                        key={`${s}-tijd`}
                        className="text-right tabular-nums text-sm"
                        style={{ backgroundColor: kleur }}
                      >
                        {formatSeconden(tijd)}
                      </td>,
                      <td
                        key={`${s}-rank`}
                        className="text-right tabular-nums text-xs text-[color:var(--color-vzc-ink-soft)]"
                        style={{ backgroundColor: kleur }}
                      >
                        {rang ?? "—"}
                      </td>,
                    ];
                  })}
                  {(() => {
                    const totaal = u.splits.totaal;
                    const rang = typeof u.rank === "number" ? u.rank : null;
                    const kleur =
                      rang !== null && aantalTotaal > 1
                        ? heatmapKleur((rang - 1) / (aantalTotaal - 1))
                        : "transparent";
                    return (
                      <td
                        className="text-right font-semibold tabular-nums"
                        style={{ backgroundColor: kleur }}
                      >
                        {formatSeconden(totaal)}
                      </td>
                    );
                  })()}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[color:var(--color-vzc-muted)]">
        Tip: klik op een atleetnaam voor het race-verloop en de segmentanalyse. De kleuren tonen
        per segment de positie binnen het deelnemersveld — groen is snel, rood langzaam.
      </p>
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

function heatmapKleur(p: number): string {
  const t = Math.max(0, Math.min(1, p));
  const stops: [number, [number, number, number]][] = [
    [0.0, [99, 190, 123]],
    [0.5, [255, 235, 132]],
    [1.0, [248, 105, 107]],
  ];
  let lo = stops[0];
  let hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i][0] && t <= stops[i + 1][0]) {
      lo = stops[i];
      hi = stops[i + 1];
      break;
    }
  }
  const span = hi[0] - lo[0] || 1;
  const k = (t - lo[0]) / span;
  const r = Math.round(lo[1][0] + (hi[1][0] - lo[1][0]) * k);
  const g = Math.round(lo[1][1] + (hi[1][1] - lo[1][1]) * k);
  const b = Math.round(lo[1][2] + (hi[1][2] - lo[1][2]) * k);
  return `rgb(${r} ${g} ${b} / 0.78)`;
}
