import Link from "next/link";
import { officieelKlassement } from "@/lib/data";
import Reveal from "@/components/ui/Reveal";

export const metadata = {
  title: "Seizoensklassement — VZC Triathlon",
  description:
    "Officiële tussenstand van de NTB teamcompetitie 2026 per divisie en poule waar VZC in uitkomt.",
};

export default function KlassementPagina() {
  const klassement = officieelKlassement();
  const poules = klassement?.poules ?? [];

  return (
    <div className="space-y-12">
      <section>
        <div className="eyebrow">Seizoen 2026 · NTB teamcompetitie</div>
        <h1 className="font-display mt-2 max-w-3xl text-4xl text-[color:var(--color-vzc-ink)] sm:text-5xl">
          Klassement
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[color:var(--color-vzc-ink-soft)]">
          De officiële tussenstand per divisie en poule waar VZC een team heeft. Per wedstrijd zie je
          de behaalde teamplaats; het laagste totaal aan plaatsen staat bovenaan. De VZC-rijen zijn
          met een gele spine gemarkeerd.
        </p>
        {klassement?.bijgewerkt ? (
          <p className="mt-3 text-xs text-[color:var(--color-vzc-muted)]">
            Bron:{" "}
            <a
              href={klassement.bron}
              target="_blank"
              rel="noreferrer"
              className="text-[color:var(--color-vzc-blue)] underline-offset-2 hover:underline"
            >
              teamcompetities.nl
            </a>{" "}
            · bijgewerkt <span className="num">{klassement.bijgewerkt}</span>
          </p>
        ) : null}
      </section>

      {poules.length > 1 ? (
        <nav
          aria-label="Spring naar VZC-team"
          className="vzc-card sticky top-3 z-20 flex flex-wrap items-center gap-2 bg-[color:var(--color-vzc-paper)]/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--color-vzc-paper)]/80"
        >
          <span className="eyebrow mr-1">Spring naar</span>
          {poules.map((p) => {
            const heeftVzc = p.teams.some((t) => t.isVzc);
            return (
              <a
                key={p.slug}
                href={`#${p.slug}`}
                className={
                  heeftVzc
                    ? "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-[color:var(--color-vzc-blue-dark)] shadow-[inset_0_0_0_1.5px_var(--color-vzc-yellow)] transition hover:bg-[color:var(--color-vzc-blue)] hover:text-white hover:shadow-none"
                    : "inline-flex items-center gap-1.5 rounded-full bg-[color:var(--color-vzc-blue-50)] px-3 py-1 text-xs font-medium text-[color:var(--color-vzc-blue-dark)] transition hover:bg-[color:var(--color-vzc-blue)] hover:text-white"
                }
              >
                {korteDivisie(p.divisie)}
                {p.poule ? ` ${p.poule}` : ""} ·{" "}
                <span className="num">{p.geslacht === "mannen" ? "M" : "V"}</span>
              </a>
            );
          })}
        </nav>
      ) : null}

      {poules.length === 0 ? (
        <div className="vzc-card p-6 text-sm text-[color:var(--color-vzc-muted)]">
          Nog geen tussenstand beschikbaar. Draai{" "}
          <code>scripts/fetch_klassement.py</code> om <code>data/klassement.json</code> te vullen.
        </div>
      ) : (
        poules.map((p) => {
          const gereden = p.races.filter((r) => r.gereden).length;
          const nogTeRijden = p.races.length - gereden;
          const vzcTeams = p.teams.filter((t) => t.isVzc).map((t) => t.club);
          const aantalTeams = p.teams.length;
          // Dual-encode-helper: balklengte ~ inverse rang in poule. Korter =
          // beter, want het laagste totaal wint. Rang 0 (koploper) krijgt de
          // kortste balk, de hekkensluiter de langste.
          const balkBreedte = (i: number) =>
            aantalTeams > 0 ? Math.round(((i + 1) / aantalTeams) * 100) : 0;

          return (
            <Reveal as="section" key={p.slug}>
              <section id={p.slug} className="scroll-mt-20 space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="eyebrow">
                      {p.divisie}
                      {p.poule ? ` · Poule ${p.poule}` : ""}
                    </div>
                    <h2 className="font-display mt-1 text-2xl text-[color:var(--color-vzc-blue-dark)]">
                      {p.geslacht === "mannen" ? "Mannen" : "Vrouwen"}
                    </h2>
                    <div className="mt-1.5 text-xs text-[color:var(--color-vzc-muted)]">
                      <span className="num">{p.teams.length}</span> teams ·{" "}
                      <span className="num">{gereden}</span> van{" "}
                      <span className="num">{p.races.length}</span> wedstrijden gereden
                      {nogTeRijden > 0 ? (
                        <>
                          {" "}
                          · <span className="num">{nogTeRijden}</span> op de planning
                        </>
                      ) : null}
                      {vzcTeams.length > 0 ? ` · VZC: ${vzcTeams.join(", ")}` : ""}
                    </div>
                  </div>
                </div>

                {/* --- Desktop / tablet: het uitslagenblad ------------------- */}
                <div className="hidden sm:block">
                  <div className="scroll-hint">
                    <span aria-hidden>←</span>
                    Veeg horizontaal om alle wedstrijden te zien
                    <span aria-hidden>→</span>
                  </div>
                  <div className="vzc-card overflow-x-auto">
                    <table className="uitslagen min-w-[680px]">
                      <thead>
                        <tr>
                          <th className="sticky-col">Team</th>
                          {p.races.map((r, i) => (
                            <th key={i} className="text-center">
                              {r.gereden && r.wedstrijdSlug ? (
                                <Link
                                  href={`/wedstrijd/${r.wedstrijdSlug}`}
                                  className="hover:text-[color:var(--color-vzc-blue)] hover:underline"
                                  title={r.label + (r.isTtt ? " (TTT)" : "")}
                                >
                                  {r.label}
                                </Link>
                              ) : (
                                <span
                                  className={r.gereden ? "" : "text-[color:var(--color-vzc-ink-faint)]"}
                                  title={r.gereden ? r.label : `${r.label} — op de planning`}
                                >
                                  {r.label}
                                </span>
                              )}
                            </th>
                          ))}
                          <th className="text-right">Totaal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.teams.map((rij, i) => {
                          const leider = i === 0;
                          return (
                            <tr key={rij.club} className={rij.isVzc ? "vzc" : undefined}>
                              <td className="sticky-col">
                                <div className="flex items-baseline gap-2">
                                  <span className="num text-sm font-semibold text-[color:var(--color-vzc-blue-dark)]">
                                    {i + 1}
                                  </span>
                                  <span className="font-medium text-[color:var(--color-vzc-ink)]">
                                    {rij.club}
                                  </span>
                                  {rij.isVzc ? (
                                    <span className="vzc-pill-vzc rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                                      VZC
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              {rij.perRace.map((res, ri) => {
                                const race = p.races[ri];
                                const nog = race ? !race.gereden : false;
                                return (
                                  <td
                                    key={ri}
                                    className={`text-center ${nog ? "hatch" : ""}`}
                                  >
                                    {res ? (
                                      <div className="flex flex-col items-center leading-tight">
                                        <span className="num text-sm font-semibold text-[color:var(--color-vzc-ink)]">
                                          #{res.plaats}
                                        </span>
                                        <span className="num text-[11px] text-[color:var(--color-vzc-muted)]">
                                          {res.som !== null ? `${res.som} klas.` : "TTT"}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="num text-xs text-[color:var(--color-vzc-ink-faint)]">
                                        —
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="text-right">
                                <div className="flex flex-col items-end gap-1">
                                  {leider ? (
                                    <span className="leader-ring num text-sm font-bold text-[color:var(--color-vzc-blue-dark)]">
                                      {rij.totaalPlaats ?? "—"}
                                    </span>
                                  ) : (
                                    <span className="num text-base font-bold text-[color:var(--color-vzc-blue-dark)]">
                                      {rij.totaalPlaats ?? "—"}
                                    </span>
                                  )}
                                  {/* Dual-encoded balk: lengte ~ rang, korter = beter */}
                                  <div
                                    className="h-1 w-16 overflow-hidden rounded-full bg-[color:var(--color-vzc-blue-50)]"
                                    aria-hidden
                                    title={`Stand: ${i + 1} van ${aantalTeams}`}
                                  >
                                    <div
                                      className="h-full rounded-full"
                                      style={{
                                        width: `${balkBreedte(i)}%`,
                                        backgroundColor: rij.isVzc
                                          ? "var(--color-vzc-yellow)"
                                          : leider
                                            ? "var(--color-vzc-blue-dark)"
                                            : "var(--color-vzc-blue)",
                                      }}
                                    />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* --- Mobiel: per-team stacked cards ------------------------ */}
                <div className="space-y-3 sm:hidden">
                  {p.teams.map((rij, i) => {
                    const leider = i === 0;
                    return (
                      <div
                        key={rij.club}
                        className={`vzc-card p-4 ${
                          rij.isVzc
                            ? "bg-[color:var(--color-vzc-blue-50)] shadow-[inset_3px_0_0_0_var(--color-vzc-yellow)]"
                            : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-baseline gap-2">
                            <span className="num text-sm font-semibold text-[color:var(--color-vzc-blue-dark)]">
                              {i + 1}
                            </span>
                            <span className="font-medium text-[color:var(--color-vzc-ink)]">
                              {rij.club}
                            </span>
                            {rij.isVzc ? (
                              <span className="vzc-pill-vzc rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                                VZC
                              </span>
                            ) : null}
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="eyebrow">Totaal</span>
                            {leider ? (
                              <span className="leader-ring num mt-0.5 text-sm font-bold text-[color:var(--color-vzc-blue-dark)]">
                                {rij.totaalPlaats ?? "—"}
                              </span>
                            ) : (
                              <span className="num text-lg font-bold text-[color:var(--color-vzc-blue-dark)]">
                                {rij.totaalPlaats ?? "—"}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Dual-encoded balk */}
                        <div
                          className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[color:var(--color-vzc-blue-50)]"
                          aria-hidden
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${balkBreedte(i)}%`,
                              backgroundColor: rij.isVzc
                                ? "var(--color-vzc-yellow)"
                                : leider
                                  ? "var(--color-vzc-blue-dark)"
                                  : "var(--color-vzc-blue)",
                            }}
                          />
                        </div>
                        {/* Per-race chips */}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {p.races.map((race, ri) => {
                            const res = rij.perRace[ri];
                            if (!race.gereden) {
                              return (
                                <span
                                  key={ri}
                                  className="hatch inline-flex items-center gap-1 rounded border border-[color:var(--color-vzc-line)] px-2 py-0.5 text-[11px] text-[color:var(--color-vzc-ink-faint)]"
                                  title={`${race.label} — op de planning`}
                                >
                                  {race.label}
                                </span>
                              );
                            }
                            return (
                              <span
                                key={ri}
                                className="inline-flex items-center gap-1 rounded border border-[color:var(--color-vzc-line)] bg-[color:var(--color-vzc-paper)] px-2 py-0.5 text-[11px]"
                                title={race.label + (race.isTtt ? " (TTT)" : "")}
                              >
                                <span className="text-[color:var(--color-vzc-muted)]">
                                  {race.label}
                                </span>
                                {res ? (
                                  <span className="num font-semibold text-[color:var(--color-vzc-ink)]">
                                    #{res.plaats}
                                  </span>
                                ) : (
                                  <span className="num text-[color:var(--color-vzc-ink-faint)]">
                                    —
                                  </span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </Reveal>
          );
        })
      )}

      <section className="border-l-2 border-[color:var(--color-vzc-blue)] bg-[color:var(--color-vzc-blue-50)] px-6 py-5 text-sm text-[color:var(--color-vzc-ink-soft)]">
        <div className="eyebrow text-[color:var(--color-vzc-blue-dark)]">
          Hoe werkt deze stand?
        </div>
        <p className="mt-2 leading-relaxed">
          Per individuele wedstrijd telt elk team de individuele klasseringen van zijn vier atleten
          op, waarbij de slechtste klassering wegvalt (de beste drie tellen). Het team met het
          laagste totaal is die wedstrijd als eerste geklasseerd. Die teamplaats (#) telt mee voor de
          seizoensstand: het totaal in de laatste kolom is de som van de plaatsen over alle gereden
          wedstrijden, en het laagste totaal staat bovenaan. De kleine waarde onder de plaats is de
          klasseringssom van die wedstrijd; bij een Team Time Trial (TTT) wordt op tijd geklasseerd
          en is er geen klasseringssom. De balk onder het totaal codeert de stand binnen de poule:
          korter is beter, want het laagste totaal wint. Gehatchte cellen staan op de planning. De
          cijfers komen rechtstreeks uit de officiële tussenstand van teamcompetities.nl.
        </p>
      </section>
    </div>
  );
}

function korteDivisie(divisie: string): string {
  return divisie
    .replace(/eredivisie/i, "Ere")
    .replace(/divisie/i, "div.")
    .replace(/\s+noord/i, " N")
    .replace(/\s+zuid/i, " Z")
    .replace(/\s+oost/i, " O")
    .replace(/\s+west/i, " W");
}
