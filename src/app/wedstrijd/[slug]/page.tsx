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

      <div className="vzc-card overflow-x-auto">
        <table className="uitslagen min-w-[760px]">
          <thead>
            <tr>
              <th className="w-12">#</th>
              <th>Atleet</th>
              <th>Team</th>
              {segmenten.map((s) => (
                <th key={s} className="text-right">
                  {SEGMENT_LABELS[s]}
                </th>
              ))}
              <th className="text-right">Eindtijd</th>
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
                  <td>
                    <Link
                      href={`/atleet/${u.atleetSlug}`}
                      className="font-medium text-[color:var(--color-vzc-ink)] hover:text-[color:var(--color-vzc-blue)] hover:underline"
                    >
                      {u.naam}
                    </Link>
                    {u.bib ? (
                      <span className="ml-2 text-xs text-[color:var(--color-vzc-muted)]">
                        #{u.bib}
                      </span>
                    ) : null}
                  </td>
                  <td className="text-sm text-[color:var(--color-vzc-ink-soft)]">{u.club}</td>
                  {segmenten.map((s) => (
                    <td key={s} className="text-right tabular-nums text-sm">
                      {formatSeconden(u.splits[s])}
                    </td>
                  ))}
                  <td className="text-right font-semibold tabular-nums">
                    {formatSeconden(u.splits.totaal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[color:var(--color-vzc-muted)]">
        Tip: klik op een atleetnaam voor het race-verloop en de segmentanalyse.
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
