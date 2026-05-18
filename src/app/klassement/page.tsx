import Link from "next/link";
import { divisieKlassement, pouleSlug, vzcPoules } from "@/lib/data";

export const metadata = {
  title: "Seizoensklassement — VZC Triathlon",
  description:
    "Stand van alle teams in de NTB teamcompetitie 2026 per divisie en poule waar VZC in uitkomt.",
};

export default function KlassementPagina() {
  const poules = vzcPoules();
  const klassementen = poules.map((p) => ({
    sleutel: pouleSlug(p),
    data: divisieKlassement(p),
  }));

  return (
    <div className="space-y-10">
      <section>
        <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[color:var(--color-vzc-blue-dark)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-vzc-red)]" />
          Seizoen 2026 — NTB teamcompetitie
        </div>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-[color:var(--color-vzc-ink)] sm:text-4xl">
          Klassement
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[color:var(--color-vzc-ink-soft)]">
          Per divisie en poule waar VZC een team heeft staat hier de stand van het seizoen. Per
          wedstrijd zie je welke positie elk team heeft behaald en hoeveel punten dat opleverde. De
          VZC-rijen zijn geel gemarkeerd.
        </p>
      </section>

      {klassementen.length > 1 ? (
        <nav
          aria-label="Spring naar VZC-team"
          className="vzc-card sticky top-3 z-20 flex flex-wrap items-center gap-2 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80"
        >
          <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-[color:var(--color-vzc-muted)]">
            Spring naar
          </span>
          {klassementen.map(({ sleutel, data: k }) => (
            <a
              key={sleutel}
              href={`#${sleutel}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--color-vzc-blue-50)] px-3 py-1 text-xs font-medium text-[color:var(--color-vzc-blue-dark)] transition hover:bg-[color:var(--color-vzc-blue)] hover:text-white"
            >
              {korteDivisie(k.divisie)}
              {k.poule ? ` ${k.poule}` : ""} · {k.geslacht === "mannen" ? "M" : "V"}
            </a>
          ))}
        </nav>
      ) : null}

      {klassementen.length === 0 ? (
        <div className="vzc-card p-6 text-sm text-[color:var(--color-vzc-muted)]">
          Nog geen wedstrijden met teamuitslagen geüpload voor 2026.
        </div>
      ) : (
        klassementen.map(({ sleutel: sectieSleutel, data: k }) => {
          return (
            <section
              key={sectieSleutel}
              id={sectieSleutel}
              className="space-y-4 scroll-mt-20"
            >
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-[color:var(--color-vzc-blue-dark)]">
                    {k.divisie}
                    {k.poule ? ` · poule ${k.poule}` : ""} ·{" "}
                    {k.geslacht === "mannen" ? "Mannen" : "Vrouwen"}
                  </h2>
                  <div className="mt-1 text-xs text-[color:var(--color-vzc-muted)]">
                    {k.teams.length} teams · {k.wedstrijden.length}{" "}
                    {k.wedstrijden.length === 1 ? "wedstrijd" : "wedstrijden"}
                    {k.vzcTeams.length > 0
                      ? ` · VZC: ${k.vzcTeams.join(", ")}`
                      : ""}
                  </div>
                </div>
              </div>

              {k.wedstrijden.length === 0 ? (
                <div className="vzc-card p-5 text-sm text-[color:var(--color-vzc-muted)]">
                  Nog geen wedstrijden gereden in deze poule.
                </div>
              ) : (
                <div className="vzc-card overflow-x-auto">
                  <table className="uitslagen min-w-[720px]">
                    <thead>
                      <tr>
                        <th className="w-12">#</th>
                        <th>Team</th>
                        {k.wedstrijden.map((w) => (
                          <th key={w.slug} className="text-center">
                            <Link
                              href={`/wedstrijd/${w.slug}`}
                              className="hover:text-[color:var(--color-vzc-blue)] hover:underline"
                              title={`${w.naam} · ${w.datum} · ${w.locatie}`}
                            >
                              {korteWedstrijdLabel(w.locatie, w.datum)}
                            </Link>
                          </th>
                        ))}
                        <th className="text-right">Totaal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {k.teams.map((rij, i) => (
                        <tr key={rij.club} className={rij.isVzc ? "vzc" : undefined}>
                          <td className="text-sm font-semibold tabular-nums">{i + 1}</td>
                          <td>
                            <div className="font-medium text-[color:var(--color-vzc-ink)]">
                              {rij.club}
                            </div>
                            {rij.isVzc ? (
                              <span className="mt-0.5 inline-flex text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-vzc-blue-dark)]">
                                VZC
                              </span>
                            ) : null}
                          </td>
                          {k.wedstrijden.map((w) => {
                            const res = rij.perWedstrijd[w.slug];
                            return (
                              <td key={w.slug} className="text-center tabular-nums">
                                {res ? (
                                  <div className="flex flex-col items-center leading-tight">
                                    <span className="text-sm font-semibold text-[color:var(--color-vzc-ink)]">
                                      #{res.rank}
                                    </span>
                                    <span className="text-[11px] text-[color:var(--color-vzc-muted)]">
                                      {res.punten} pnt
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-[color:var(--color-vzc-muted)]">
                                    —
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td className="text-right">
                            <div className="text-base font-bold tabular-nums text-[color:var(--color-vzc-blue-dark)]">
                              {rij.totaalPunten}
                            </div>
                            <div className="text-[11px] text-[color:var(--color-vzc-muted)]">
                              uit {rij.aantalWedstrijden}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })
      )}

      <section className="rounded-xl bg-[color:var(--color-vzc-blue-50)] px-6 py-5 text-sm text-[color:var(--color-vzc-ink-soft)]">
        <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-vzc-blue-dark)]">
          Hoe werkt deze stand?
        </div>
        <p className="mt-2 leading-relaxed">
          Per wedstrijd krijgt elk team punten op basis van zijn positie in de teamuitslag (NTB
          puntenschema: 25 voor de winnaar, 22 voor de tweede, oplopend tot 1 punt voor plek 20).
          Het totaal in de laatste kolom is de som van alle wedstrijdpunten in deze poule. Een
          streepje betekent dat een team in die wedstrijd geen geldige teamprestatie had (te weinig
          finishers of niet aanwezig).
        </p>
      </section>
    </div>
  );
}

function korteDivisie(divisie: string): string {
  return divisie
    .replace(/divisie/i, "div.")
    .replace(/eredivisie/i, "Ere")
    .replace(/\s+noord/i, " N")
    .replace(/\s+zuid/i, " Z")
    .replace(/\s+oost/i, " O")
    .replace(/\s+west/i, " W");
}

function korteWedstrijdLabel(locatie: string, datum: string): string {
  const dag = Number(datum.slice(8, 10));
  const maanden = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  const maand = maanden[Number(datum.slice(5, 7)) - 1] ?? "";
  const eersteStuk = locatie.split(/[,\s]/)[0];
  return `${eersteStuk} ${dag} ${maand}`;
}

