import Link from "next/link";
import { alleVzcTeams, alleWedstrijden, alleAtleten } from "@/lib/data";

export default function Home() {
  const teams = alleVzcTeams();
  const wedstrijden = alleWedstrijden();
  const aantalVzcAtleten = alleAtleten().filter((a) => a.isVzc).length;

  return (
    <div className="space-y-12">
      <section>
        <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[color:var(--color-vzc-blue-dark)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-vzc-red)]" />
          Seizoen 2026 — NTB teamcompetitie
        </div>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-[color:var(--color-vzc-ink)] sm:text-4xl">
          Uitslagen van alle VZC-teams op één plek
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[color:var(--color-vzc-ink-soft)]">
          Zoek jezelf op, bekijk je race-verloop en zie in één blik waar je tijd hebt gewonnen of
          verloren op zwemmen, fietsen of lopen. Inclusief T1 en T2. Voor iedereen die meedoet,
          aanmoedigt of plant.
        </p>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-lg font-semibold text-[color:var(--color-vzc-blue-dark)]">
            VZC-teams in de competitie
          </h2>
          <span className="text-xs text-[color:var(--color-vzc-muted)]">
            {teams.length} {teams.length === 1 ? "team" : "teams"} · {aantalVzcAtleten} VZC-atleten
          </span>
        </div>
        {teams.length === 0 ? (
          <div className="vzc-card p-6 text-sm text-[color:var(--color-vzc-muted)]">
            Nog geen wedstrijduitslagen geüpload voor 2026.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((t) => (
              <Link
                key={t.slug}
                href={`/team/${t.slug}`}
                className="vzc-card group flex flex-col gap-3 p-5 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-[color:var(--color-vzc-ink)]">
                      {t.naam}
                    </div>
                    <div className="mt-1 text-xs text-[color:var(--color-vzc-muted)]">
                      {t.divisie}
                      {t.poule ? ` · poule ${t.poule}` : ""} ·{" "}
                      {t.geslacht === "mannen" ? "Mannen" : "Vrouwen"}
                    </div>
                  </div>
                  <span className="vzc-pill-vzc vzc-pill">VZC</span>
                </div>
                <div className="mt-auto text-xs font-medium text-[color:var(--color-vzc-blue-dark)] group-hover:underline">
                  {t.wedstrijdSlugs.length} wedstrijd{t.wedstrijdSlugs.length === 1 ? "" : "en"} →
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-lg font-semibold text-[color:var(--color-vzc-blue-dark)]">
            Wedstrijden 2026
          </h2>
          <span className="text-xs text-[color:var(--color-vzc-muted)]">
            {wedstrijden.length}{" "}
            {wedstrijden.length === 1 ? "wedstrijd" : "wedstrijden"} geregistreerd
          </span>
        </div>
        {wedstrijden.length === 0 ? (
          <div className="vzc-card p-6 text-sm text-[color:var(--color-vzc-muted)]">
            Nog geen wedstrijden in de repo. Voeg een JSON-bestand toe in{" "}
            <code>data/wedstrijden/</code>.
          </div>
        ) : (
          <div className="vzc-card divide-y divide-[color:var(--color-vzc-blue)]/10">
            {wedstrijden.map((w) => {
              const vzcAantal = w.uitslagen.filter((u) => u.isVzc).length;
              return (
                <Link
                  key={w.slug}
                  href={`/wedstrijd/${w.slug}`}
                  className="group flex flex-wrap items-center gap-4 px-5 py-4 transition hover:bg-[color:var(--color-vzc-blue-50)]"
                >
                  <div className="flex w-20 shrink-0 flex-col items-center rounded-md bg-[color:var(--color-vzc-blue)] py-2 text-white">
                    <span className="text-[10px] uppercase tracking-widest opacity-80">
                      {nlMaand(w.wedstrijd.datum)}
                    </span>
                    <span className="text-xl font-bold leading-none">
                      {Number(w.wedstrijd.datum.slice(8, 10))}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-base font-semibold text-[color:var(--color-vzc-ink)]">
                      {w.wedstrijd.naam}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[color:var(--color-vzc-muted)]">
                      <span>{w.wedstrijd.locatie}</span>
                      <span>·</span>
                      <span>{w.wedstrijd.afstand}</span>
                      <span>·</span>
                      <span>{w.wedstrijd.divisie}</span>
                      {w.wedstrijd.poule ? (
                        <>
                          <span>·</span>
                          <span>poule {w.wedstrijd.poule}</span>
                        </>
                      ) : null}
                      <span>·</span>
                      <span>{w.wedstrijd.geslacht === "mannen" ? "Mannen" : "Vrouwen"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="vzc-pill">{w.uitslagen.length} starters</span>
                    {vzcAantal > 0 ? (
                      <span className="vzc-pill-vzc vzc-pill">{vzcAantal} VZC</span>
                    ) : null}
                    <span className="hidden text-sm font-medium text-[color:var(--color-vzc-blue-dark)] sm:inline-flex sm:items-center sm:gap-1 group-hover:underline">
                      Bekijk uitslag
                      <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-xl bg-[color:var(--color-vzc-blue)] px-6 py-7 text-white">
        <h2 className="text-lg font-semibold">Zoek jezelf op</h2>
        <p className="mt-1 max-w-xl text-sm text-white/85">
          Elke gestarte atleet heeft een eigen pagina met race-verloop en segmentanalyse. Vergelijk
          jezelf met de mediaan van je poule, de top-3 of de winnaar.
        </p>
        <Link
          href="/atleten"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[color:var(--color-vzc-yellow)] px-5 py-2 text-sm font-semibold text-[color:var(--color-vzc-blue-dark)] hover:brightness-95"
        >
          Naar atleten-lijst →
        </Link>
      </section>
    </div>
  );
}

function nlMaand(datum: string): string {
  const maanden = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  const m = Number(datum.slice(5, 7));
  return maanden[m - 1] ?? "";
}
