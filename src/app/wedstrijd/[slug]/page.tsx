import Link from "next/link";
import { notFound } from "next/navigation";
import {
  alleWedstrijden,
  formatSeconden,
  teamformatLabel,
  teamuitslagVoorWedstrijd,
  wedstrijdBijSlug,
  SEGMENT_LABELS,
} from "@/lib/data";
import type { SegmentSleutel } from "@/lib/types";
import VzcSpotlight from "@/components/VzcSpotlight";
import GapToWinner from "@/components/GapToWinner";
import PositieVerloopChart from "@/components/PositieVerloopChart";

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

  const teamuitslag = teamuitslagVoorWedstrijd(wedstrijd);
  const heeftVzc = wedstrijd.uitslagen.some((u) => u.isVzc);
  const heeftTeamuitslag = Boolean(teamuitslag && wedstrijd.wedstrijd.teamformat);
  const heeftFinishers =
    wedstrijd.uitslagen.filter((u) => u.rank !== "DNF" && u.splits.totaal !== null).length >= 2;

  const navLinks: { id: string; label: string }[] = [];
  if (heeftTeamuitslag) navLinks.push({ id: "team", label: "Team" });
  if (heeftVzc) navLinks.push({ id: "vzc", label: "VZC" });
  if (heeftFinishers) navLinks.push({ id: "gap", label: "Tijdverschil" });
  if (heeftFinishers) navLinks.push({ id: "verloop", label: "Positie-verloop" });
  navLinks.push({ id: "tabel", label: "Volledige uitslag" });

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

      {navLinks.length > 1 ? (
        <nav
          aria-label="Snel naar sectie"
          className="vzc-card flex flex-wrap items-center gap-2 px-4 py-3 text-sm"
        >
          <span className="text-xs font-medium uppercase tracking-wider text-[color:var(--color-vzc-muted)]">
            Op deze pagina
          </span>
          <span className="text-[color:var(--color-vzc-muted)]">·</span>
          {navLinks.map((link, idx) => (
            <span key={link.id} className="flex items-center gap-2">
              <a
                href={`#${link.id}`}
                className="rounded-full px-3 py-1 font-medium text-[color:var(--color-vzc-blue-dark)] hover:bg-[color:var(--color-vzc-blue-50)]"
              >
                {link.label}
              </a>
              {idx < navLinks.length - 1 ? (
                <span className="text-[color:var(--color-vzc-muted)]">·</span>
              ) : null}
            </span>
          ))}
        </nav>
      ) : null}

      {teamuitslag && wedstrijd.wedstrijd.teamformat ? (
        <section id="team" className="vzc-anchor space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[color:var(--color-vzc-blue-dark)]">
                Teamuitslag
              </h2>
              <p className="text-xs text-[color:var(--color-vzc-muted)]">
                {teamformatLabel(wedstrijd.wedstrijd.teamformat)}
              </p>
            </div>
            <span className="text-xs text-[color:var(--color-vzc-muted)]">
              {teamuitslag.resultaten.length}{" "}
              {teamuitslag.resultaten.length === 1 ? "team geklasseerd" : "teams geklasseerd"}
            </span>
          </div>
          <div className="scroll-hint">
            <span aria-hidden>←</span>
            Veeg horizontaal voor de volledige tabel
            <span aria-hidden>→</span>
          </div>
          <div className="vzc-card overflow-x-auto">
            <table className="uitslagen min-w-[560px] sm:min-w-[640px]">
              <thead>
                <tr>
                  <th className="w-12">#</th>
                  <th>Team</th>
                  <th className="text-right">Teamtijd</th>
                  <th className="text-right">Tellend</th>
                  <th className="text-right">Punten</th>
                </tr>
              </thead>
              <tbody>
                {teamuitslag.resultaten.map((t) => (
                  <tr key={t.club} className={t.isVzc ? "vzc" : ""}>
                    <td className="text-sm font-semibold text-[color:var(--color-vzc-ink-soft)]">
                      {t.rank}
                    </td>
                    <td className="font-medium text-[color:var(--color-vzc-ink)]">
                      {t.club}
                      {t.isVzc ? (
                        <span className="vzc-pill-vzc vzc-pill ml-2 align-middle">VZC</span>
                      ) : null}
                    </td>
                    <td className="text-right font-semibold tabular-nums">
                      {formatSeconden(t.teamtijd)}
                    </td>
                    <td className="text-right text-xs text-[color:var(--color-vzc-muted)]">
                      {t.tellendeAtleten.length} van {t.finishersInTeam}
                    </td>
                    <td className="text-right font-semibold tabular-nums text-[color:var(--color-vzc-blue-dark)]">
                      {t.punten}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {teamuitslag.ongeldig.length > 0 ? (
            <p className="text-xs text-[color:var(--color-vzc-muted)]">
              Niet geklasseerd ({teamuitslag.ongeldig.length}): te weinig finishers voor een geldige
              teamtijd —{" "}
              {teamuitslag.ongeldig
                .map((o) => `${o.club} (${o.finishers})`)
                .join(", ")}
              .
            </p>
          ) : null}
        </section>
      ) : null}

      <div id="vzc" className="vzc-anchor">
        <VzcSpotlight wedstrijd={wedstrijd} />
      </div>

      <div id="gap" className="vzc-anchor">
        <GapToWinner wedstrijd={wedstrijd} />
      </div>

      <div id="verloop" className="vzc-anchor">
        <PositieVerloopChart wedstrijd={wedstrijd} />
      </div>

      <div id="tabel" className="vzc-anchor flex flex-wrap items-center gap-3 text-xs text-[color:var(--color-vzc-muted)]">
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

      <div className="scroll-hint">
        <span aria-hidden>←</span>
        Veeg horizontaal om alle segmenttijden te zien
        <span aria-hidden>→</span>
      </div>
      <div className="vzc-card overflow-x-auto">
        <table className="uitslagen heatmap min-w-[980px] sm:min-w-[1100px]">
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
