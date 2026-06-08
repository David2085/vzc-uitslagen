import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  alleWedstrijden,
  formatSeconden,
  teamformatLabel,
  teamuitslagVoorWedstrijd,
  officieleTeamuitslagVoorWedstrijd,
  wedstrijdBijSlug,
  SEGMENT_LABELS,
} from "@/lib/data";
import { heatmapKleur, heatmapTekstKleur, HEAT_LEGENDA } from "@/lib/kleur";
import type { SegmentSleutel } from "@/lib/types";
import Reveal from "@/components/ui/Reveal";
import VzcSpotlight from "@/components/VzcSpotlight";
import GapToWinner from "@/components/GapToWinner";
import PositieVerloopChart from "@/components/PositieVerloopChart";
import RaceDNA from "@/components/RaceDNA";

export function generateStaticParams() {
  return alleWedstrijden().map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const wedstrijd = wedstrijdBijSlug(slug);
  if (!wedstrijd) {
    return { title: "Wedstrijd niet gevonden — VZC Triathlon" };
  }
  const w = wedstrijd.wedstrijd;
  const datum = nlDatum(w.datum);
  const titel = `${w.naam} — ${datum} · VZC Triathlon`;
  const beschrijving = `Uitslag, segmentanalyse en VZC-prestaties van ${w.naam} (${datum}) in ${w.locatie} — ${w.afstand}, ${w.divisie}${w.poule ? ` poule ${w.poule}` : ""}.`;
  return {
    title: titel,
    description: beschrijving,
    openGraph: { title: titel, description: beschrijving },
  };
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

  // Officiële teamuitslag (bron: teamcompetities.nl) is leidend voor TTT-races,
  // waar de plaats op tijd is bepaald en niet uit de individuele uitslag volgt.
  // Valt die weg, dan rekenen we de teamuitslag zelf uit de individuele cijfers.
  const officieel = officieleTeamuitslagVoorWedstrijd(slug);
  const teamuitslag = teamuitslagVoorWedstrijd(wedstrijd);
  const gebruikOfficieel = Boolean(officieel && officieel.resultaten.length > 0);
  const heeftVzc = wedstrijd.uitslagen.some((u) => u.isVzc);
  const heeftTeamuitslag =
    Boolean(wedstrijd.wedstrijd.teamformat) &&
    (gebruikOfficieel || Boolean(teamuitslag));
  const heeftFinishers =
    wedstrijd.uitslagen.filter((u) => u.rank !== "DNF" && u.splits.totaal !== null).length >= 2;

  const navLinks: { id: string; label: string }[] = [];
  if (heeftTeamuitslag) navLinks.push({ id: "team", label: "Team" });
  if (heeftVzc) navLinks.push({ id: "vzc", label: "VZC" });
  if (heeftFinishers) navLinks.push({ id: "gap", label: "Tijdverschil" });
  if (heeftFinishers) navLinks.push({ id: "verloop", label: "Positie-verloop" });
  navLinks.push({ id: "tabel", label: "Volledige uitslag" });

  return (
    <div className="space-y-12">
      <header>
        <Link
          href="/"
          className="text-xs font-medium text-[color:var(--color-vzc-blue)] hover:underline"
        >
          ← Terug naar overzicht
        </Link>
        <div className="eyebrow mt-4">
          {wedstrijd.wedstrijd.divisie}
          {wedstrijd.wedstrijd.poule ? ` · Poule ${wedstrijd.wedstrijd.poule}` : ""} ·{" "}
          {wedstrijd.wedstrijd.geslacht === "mannen" ? "Mannen" : "Vrouwen"}
        </div>
        <h1 className="font-display mt-2 max-w-3xl text-4xl text-[color:var(--color-vzc-ink)] sm:text-5xl">
          {wedstrijd.wedstrijd.naam}
        </h1>
        <p className="mt-3 text-sm text-[color:var(--color-vzc-ink-soft)]">
          <span className="num">{nlDatum(wedstrijd.wedstrijd.datum)}</span> ·{" "}
          {wedstrijd.wedstrijd.locatie} · {wedstrijd.wedstrijd.afstand}
        </p>
        {wedstrijd.wedstrijd.vzc_teams.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {wedstrijd.wedstrijd.vzc_teams.map((t) => (
              <span key={t} className="vzc-pill-vzc vzc-pill">
                VZC-team: {t}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      {navLinks.length > 1 ? (
        <nav
          aria-label="Snel naar sectie"
          className="vzc-card flex flex-wrap items-center gap-1.5 px-4 py-3 text-sm"
        >
          <span className="eyebrow mr-1">Op deze pagina</span>
          {navLinks.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              className="rounded-full bg-[color:var(--color-vzc-blue-50)] px-3 py-1 text-xs font-medium text-[color:var(--color-vzc-blue-dark)] transition hover:bg-[color:var(--color-vzc-blue)] hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>
      ) : null}

      {heeftTeamuitslag && wedstrijd.wedstrijd.teamformat ? (
        <Reveal as="section">
          <section id="team" className="vzc-anchor space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <span className="eyebrow">Teamklassement</span>
                <h2 className="font-display mt-1 text-2xl text-[color:var(--color-vzc-blue-dark)]">
                  Teamuitslag
                </h2>
                <p className="mt-1 text-xs text-[color:var(--color-vzc-muted)]">
                  {teamformatLabel(wedstrijd.wedstrijd.teamformat)}
                  {bronLabel(gebruikOfficieel)}
                </p>
              </div>
            </div>

            {gebruikOfficieel && officieel ? (
              <OfficieleTeamtabel
                resultaten={officieel.resultaten}
                isTtt={officieel.isTtt}
              />
            ) : teamuitslag ? (
              <BerekendeTeamtabel teamuitslag={teamuitslag} />
            ) : null}
          </section>
        </Reveal>
      ) : null}

      {heeftVzc ? (
        <div id="vzc" className="vzc-anchor">
          <VzcSpotlight wedstrijd={wedstrijd} />
        </div>
      ) : null}

      {heeftFinishers ? (
        <div id="gap" className="vzc-anchor">
          <GapToWinner wedstrijd={wedstrijd} />
        </div>
      ) : null}

      {heeftFinishers ? (
        <div id="verloop" className="vzc-anchor">
          <PositieVerloopChart wedstrijd={wedstrijd} />
        </div>
      ) : null}

      <Reveal as="section">
        <section id="tabel" className="vzc-anchor space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="eyebrow">Snelheid per segment</span>
              <h2 className="font-display mt-1 text-2xl text-[color:var(--color-vzc-blue-dark)]">
                Volledige uitslag
              </h2>
              <p className="mt-1 max-w-2xl text-xs text-[color:var(--color-vzc-muted)]">
                Elke gekleurde cel toont de splittijd én het rangnummer binnen het veld voor dat
                segment. Groen = snel, rood = langzaam.
              </p>
            </div>
            <div className="heat-legend gap-2 text-[11px] text-[color:var(--color-vzc-muted)]">
              {HEAT_LEGENDA.map((stop) => (
                <span key={stop.label} className="inline-flex items-center gap-1">
                  <span
                    className="swatch"
                    style={{ backgroundColor: heatmapKleur(stop.p) }}
                    aria-hidden
                  />
                  {stop.label}
                </span>
              ))}
            </div>
          </div>

          {heeftVzc ? <RaceDNA wedstrijd={wedstrijd} /> : null}

          {/* --- Desktop / tablet: het uitslagenblad ------------------------ */}
          <div className="hidden sm:block">
            <div className="scroll-hint">
              <span aria-hidden>←</span>
              Veeg horizontaal om alle segmenttijden te zien
              <span aria-hidden>→</span>
            </div>
            <div className="vzc-card overflow-x-auto">
              <table className="uitslagen heatmap min-w-[980px]">
                <thead>
                  <tr>
                    <th
                      className="sticky-col w-10"
                      style={{ left: 0, backgroundColor: "var(--color-vzc-paper)" }}
                    >
                      #
                    </th>
                    <th
                      className="sticky-col"
                      style={{ left: "2.5rem", backgroundColor: "var(--color-vzc-paper)" }}
                    >
                      Atleet
                    </th>
                    <th>Team</th>
                    <th className="w-14 text-right">Bib</th>
                    {segmenten.map((s) => (
                      <th key={s} className="text-right">
                        {SEGMENT_LABELS[s]}
                      </th>
                    ))}
                    <th className="text-right">Totaal</th>
                  </tr>
                </thead>
                <tbody>
                  {uitslagen.map((u) => {
                    const isDnf = u.rank === "DNF";
                    const leider = u.rank === 1;
                    const klassen = [u.isVzc ? "vzc" : "", isDnf ? "dnf" : ""]
                      .filter(Boolean)
                      .join(" ");
                    const stickyBg = u.isVzc
                      ? "var(--color-vzc-blue-50)"
                      : "var(--color-vzc-paper)";
                    return (
                      <tr key={`${u.atleetSlug}-${u.bib ?? ""}`} className={klassen}>
                        <td
                          className="sticky-col"
                          style={{ left: 0, backgroundColor: stickyBg }}
                        >
                          {leider ? (
                            <span className="leader-ring num text-xs font-bold text-[color:var(--color-vzc-blue-dark)]">
                              1
                            </span>
                          ) : (
                            <span className="num text-sm font-semibold text-[color:var(--color-vzc-blue-dark)]">
                              {isDnf ? "DNF" : u.rank}
                            </span>
                          )}
                        </td>
                        <td
                          className="sticky-col"
                          style={{ left: "2.5rem", backgroundColor: stickyBg }}
                        >
                          <Link
                            href={`/atleet/${u.atleetSlug}`}
                            className="font-medium text-[color:var(--color-vzc-ink)] hover:text-[color:var(--color-vzc-blue)] hover:underline"
                          >
                            {u.naam}
                          </Link>
                        </td>
                        <td className="text-sm text-[color:var(--color-vzc-ink-soft)]">
                          {u.club}
                          {u.isVzc ? (
                            <span className="vzc-pill-vzc ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                              VZC
                            </span>
                          ) : null}
                        </td>
                        <td className="num text-right text-xs text-[color:var(--color-vzc-muted)]">
                          {u.bib ?? "—"}
                        </td>
                        {segmenten.map((s) => {
                          const tijd = u.splits[s];
                          const rang = u.rankPerSegment[s];
                          const n = aantalPerSegment[s];
                          const p =
                            rang !== null && n > 1 ? (rang - 1) / (n - 1) : null;
                          const kleur = p !== null ? heatmapKleur(p) : "transparent";
                          const tekst =
                            p !== null ? heatmapTekstKleur(p) : "var(--color-vzc-ink)";
                          return (
                            <td
                              key={s}
                              className="text-right"
                              style={{ backgroundColor: kleur }}
                            >
                              <div className="flex flex-col items-end leading-tight">
                                <span className="num text-sm" style={{ color: tekst }}>
                                  {formatSeconden(tijd)}
                                </span>
                                <span
                                  className="num text-[11px]"
                                  style={{ color: tekst, opacity: 0.82 }}
                                >
                                  {rang !== null ? `#${rang}` : "—"}
                                </span>
                              </div>
                            </td>
                          );
                        })}
                        {(() => {
                          const totaal = u.splits.totaal;
                          const rang = typeof u.rank === "number" ? u.rank : null;
                          const p =
                            rang !== null && aantalTotaal > 1
                              ? (rang - 1) / (aantalTotaal - 1)
                              : null;
                          const kleur = p !== null ? heatmapKleur(p) : "transparent";
                          const tekst =
                            p !== null
                              ? heatmapTekstKleur(p)
                              : "var(--color-vzc-blue-dark)";
                          return (
                            <td className="text-right" style={{ backgroundColor: kleur }}>
                              <span
                                className="num text-sm font-semibold"
                                style={{ color: tekst }}
                              >
                                {formatSeconden(totaal)}
                              </span>
                            </td>
                          );
                        })()}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* --- Mobiel: per-atleet stacked cards --------------------------- */}
          <div className="space-y-3 sm:hidden">
            {uitslagen.map((u) => {
              const isDnf = u.rank === "DNF";
              const leider = u.rank === 1;
              const totaalRang = typeof u.rank === "number" ? u.rank : null;
              const totaalP =
                totaalRang !== null && aantalTotaal > 1
                  ? (totaalRang - 1) / (aantalTotaal - 1)
                  : null;
              const totaalKleur =
                totaalP !== null ? heatmapKleur(totaalP) : "var(--color-vzc-blue-50)";
              const totaalTekst =
                totaalP !== null ? heatmapTekstKleur(totaalP) : "var(--color-vzc-blue-dark)";
              return (
                <div
                  key={`${u.atleetSlug}-${u.bib ?? ""}`}
                  className={`vzc-card p-4 ${
                    u.isVzc
                      ? "bg-[color:var(--color-vzc-blue-50)] shadow-[inset_3px_0_0_0_var(--color-vzc-yellow)]"
                      : ""
                  } ${isDnf ? "opacity-70" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        {leider ? (
                          <span className="leader-ring num text-xs font-bold text-[color:var(--color-vzc-blue-dark)]">
                            1
                          </span>
                        ) : (
                          <span className="num text-sm font-semibold text-[color:var(--color-vzc-blue-dark)]">
                            {isDnf ? "DNF" : `#${u.rank}`}
                          </span>
                        )}
                        <Link
                          href={`/atleet/${u.atleetSlug}`}
                          className="truncate font-medium text-[color:var(--color-vzc-ink)] hover:text-[color:var(--color-vzc-blue)] hover:underline"
                        >
                          {u.naam}
                        </Link>
                        {u.isVzc ? (
                          <span className="vzc-pill-vzc rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                            VZC
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-[color:var(--color-vzc-muted)]">
                        {u.club}
                        {u.bib ? (
                          <>
                            {" · "}
                            <span className="num">#{u.bib}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div
                      className="shrink-0 rounded-md px-2.5 py-1 text-right"
                      style={{ backgroundColor: totaalKleur }}
                    >
                      <span
                        className="block text-[0.6rem] font-semibold uppercase tracking-[0.12em]"
                        style={{ color: totaalTekst, opacity: 0.8 }}
                      >
                        Totaal
                      </span>
                      <div
                        className="num text-base font-semibold"
                        style={{ color: totaalTekst }}
                      >
                        {formatSeconden(u.splits.totaal)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-5 gap-1.5">
                    {segmenten.map((s) => {
                      const tijd = u.splits[s];
                      const rang = u.rankPerSegment[s];
                      const n = aantalPerSegment[s];
                      const p =
                        rang !== null && n > 1 ? (rang - 1) / (n - 1) : null;
                      const kleur =
                        p !== null ? heatmapKleur(p) : "var(--color-vzc-blue-50)";
                      const tekst =
                        p !== null ? heatmapTekstKleur(p) : "var(--color-vzc-ink)";
                      return (
                        <div
                          key={s}
                          className="flex flex-col items-center rounded-md border border-[color:var(--color-vzc-line)] px-1 py-1.5 text-center"
                          style={{ backgroundColor: kleur }}
                          title={SEGMENT_LABELS[s]}
                        >
                          <span
                            className="text-[0.6rem] font-semibold uppercase tracking-wider"
                            style={{ color: tekst, opacity: 0.8 }}
                          >
                            {SEGMENT_LABELS[s].slice(0, 4)}
                          </span>
                          <span
                            className="num mt-0.5 text-[11px] font-medium"
                            style={{ color: tekst }}
                          >
                            {formatSeconden(tijd)}
                          </span>
                          <span
                            className="num text-[10px]"
                            style={{ color: tekst, opacity: 0.82 }}
                          >
                            {rang !== null ? `#${rang}` : "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-[color:var(--color-vzc-muted)]">
            Tip: klik op een atleetnaam voor het race-verloop en de segmentanalyse. De kleuren tonen
            per segment de positie binnen het deelnemersveld — groen is snel, rood langzaam —
            en elk gekleurd vlak toont óók het rangnummer.
          </p>
        </section>
      </Reveal>
    </div>
  );
}

function bronLabel(officieel: boolean): string {
  return officieel ? " · officiële uitslag (teamcompetities.nl)" : "";
}

function OfficieleTeamtabel({
  resultaten,
  isTtt,
}: {
  resultaten: { club: string; isVzc: boolean; plaats: number; som: number | null }[];
  isTtt: boolean;
}) {
  return (
    <>
      <div className="scroll-hint">
        <span aria-hidden>←</span>
        Veeg horizontaal voor de volledige tabel
        <span aria-hidden>→</span>
      </div>
      <div className="vzc-card overflow-x-auto">
        <table className="uitslagen min-w-[420px]">
          <thead>
            <tr>
              <th className="w-12">#</th>
              <th>Team</th>
              <th className="text-right">{isTtt ? "Format" : "Klasseringssom"}</th>
            </tr>
          </thead>
          <tbody>
            {resultaten.map((t) => {
              const leider = t.plaats === 1;
              return (
                <tr key={t.club} className={t.isVzc ? "vzc" : undefined}>
                  <td>
                    {leider ? (
                      <span className="leader-ring num text-xs font-bold text-[color:var(--color-vzc-blue-dark)]">
                        1
                      </span>
                    ) : (
                      <span className="num text-sm font-semibold text-[color:var(--color-vzc-blue-dark)]">
                        {t.plaats}
                      </span>
                    )}
                  </td>
                  <td className="font-medium text-[color:var(--color-vzc-ink)]">
                    {t.club}
                    {t.isVzc ? (
                      <span className="vzc-pill-vzc ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                        VZC
                      </span>
                    ) : null}
                  </td>
                  <td className="num text-right font-semibold text-[color:var(--color-vzc-blue-dark)]">
                    {t.som !== null ? t.som : "TTT"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function BerekendeTeamtabel({
  teamuitslag,
}: {
  teamuitslag: NonNullable<ReturnType<typeof teamuitslagVoorWedstrijd>>;
}) {
  return (
    <>
      <div className="text-xs text-[color:var(--color-vzc-muted)]">
        <span className="num">{teamuitslag.resultaten.length}</span>{" "}
        {teamuitslag.resultaten.length === 1 ? "team geklasseerd" : "teams geklasseerd"}
      </div>
      <div className="scroll-hint">
        <span aria-hidden>←</span>
        Veeg horizontaal voor de volledige tabel
        <span aria-hidden>→</span>
      </div>
      <div className="vzc-card overflow-x-auto">
        <table className="uitslagen min-w-[560px]">
          <thead>
            <tr>
              <th className="w-12">#</th>
              <th>Team</th>
              <th className="text-right">Klasseringssom</th>
              <th className="text-right">Teamtijd</th>
              <th className="text-right">Tellend</th>
            </tr>
          </thead>
          <tbody>
            {teamuitslag.resultaten.map((t) => {
              const leider = t.rank === 1;
              return (
                <tr key={t.club} className={t.isVzc ? "vzc" : undefined}>
                  <td>
                    {leider ? (
                      <span className="leader-ring num text-xs font-bold text-[color:var(--color-vzc-blue-dark)]">
                        1
                      </span>
                    ) : (
                      <span className="num text-sm font-semibold text-[color:var(--color-vzc-blue-dark)]">
                        {t.rank}
                      </span>
                    )}
                  </td>
                  <td className="font-medium text-[color:var(--color-vzc-ink)]">
                    {t.club}
                    {t.isVzc ? (
                      <span className="vzc-pill-vzc ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                        VZC
                      </span>
                    ) : null}
                  </td>
                  <td className="num text-right font-semibold text-[color:var(--color-vzc-blue-dark)]">
                    {t.klasseringSom !== null ? t.klasseringSom : "TTT"}
                  </td>
                  <td className="num text-right">{formatSeconden(t.teamtijd)}</td>
                  <td className="num text-right text-xs text-[color:var(--color-vzc-muted)]">
                    {t.tellendeAtleten.length} van {t.finishersInTeam}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {teamuitslag.ongeldig.length > 0 ? (
        <p className="text-xs text-[color:var(--color-vzc-muted)]">
          Niet geklasseerd (<span className="num">{teamuitslag.ongeldig.length}</span>): te weinig
          finishers voor een geldige teamtijd —{" "}
          {teamuitslag.ongeldig.map((o) => `${o.club} (${o.finishers})`).join(", ")}.
        </p>
      ) : null}
    </>
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
