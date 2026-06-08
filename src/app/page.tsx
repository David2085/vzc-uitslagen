import Link from "next/link";
import Reveal from "@/components/ui/Reveal";
import {
  alleVzcTeams,
  alleWedstrijden,
  alleAtleten,
  officieelKlassement,
  officielePouleVoorTeam,
  officieelTeamInPoule,
} from "@/lib/data";

// Nog te rijden wedstrijden komen uit de officiële tussenstand (race-kolommen
// zonder uitslag). Geen runtime-datum nodig: een geüploade wedstrijd is per
// definitie gereden, de rest is toekomst — volledig deterministisch.
type ToekomstRace = { datum: string; locatie: string; label: string };

function toekomstigeRaces(): ToekomstRace[] {
  const k = officieelKlassement();
  if (!k) return [];
  const map = new Map<string, ToekomstRace>();
  for (const p of k.poules) {
    for (const r of p.races) {
      if (r.gereden) continue;
      const m = r.label.match(/^\s*(\d{1,2})\/(\d{1,2})\s+(.+?)(?:\s*\(.*\))?$/);
      if (!m) continue;
      const dag = m[1].padStart(2, "0");
      const maand = m[2].padStart(2, "0");
      const locatie = m[3].trim();
      const datum = `2026-${maand}-${dag}`;
      const sleutel = `${datum}|${locatie.toLowerCase()}`;
      if (!map.has(sleutel)) map.set(sleutel, { datum, locatie, label: r.label });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.datum.localeCompare(b.datum));
}

export default function Home() {
  const teams = alleVzcTeams();
  const wedstrijden = alleWedstrijden(); // nieuwste eerst; allemaal gereden
  const aantalVzcAtleten = alleAtleten().filter((a) => a.isVzc).length;

  const aantalGereden = wedstrijden.length;
  const toekomst = toekomstigeRaces();
  const totaalGepland = aantalGereden + toekomst.length;

  const eerstvolgende = toekomst[0] ?? null;
  const laatste = wedstrijden[0] ?? null;

  // Gecombineerde tijdlijn (gereden + nog te rijden), chronologisch.
  type TijdlijnItem = {
    type: "gereden" | "toekomst";
    datum: string;
    slug: string | null;
    locatie: string;
    naam: string;
    vzcAantal: number;
  };
  const tijdlijn: TijdlijnItem[] = [
    ...wedstrijden.map((w) => ({
      type: "gereden" as const,
      datum: w.wedstrijd.datum,
      slug: w.slug,
      locatie: w.wedstrijd.locatie,
      naam: w.wedstrijd.naam,
      vzcAantal: w.uitslagen.filter((u) => u.isVzc).length,
    })),
    ...toekomst.map((t) => ({
      type: "toekomst" as const,
      datum: t.datum,
      slug: null,
      locatie: t.locatie,
      naam: t.label,
      vzcAantal: 0,
    })),
  ].sort((a, b) => a.datum.localeCompare(b.datum));

  return (
    <div className="space-y-16">
      {/* (1) Asymmetrische masthead — links uitgelijnd, geen gradient */}
      <Reveal as="section">
        <div className="max-w-3xl">
          <div className="eyebrow flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--color-vzc-red)]"
            />
            Seizoen 2026 · NTB teamcompetitie
          </div>
          <h1 className="font-display mt-4 text-4xl leading-[1.05] text-[color:var(--color-vzc-blue-dark)] sm:text-5xl">
            Het uitslagenblad van alle VZC-teams
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[color:var(--color-vzc-ink-soft)]">
            Per wedstrijd de volledige uitslag met een heatmap per segment —{" "}
            <span className="font-medium text-[color:var(--color-vzc-ink)]">
              groen is snel, rood is langzaam
            </span>
            . Elke atleet heeft een eigen pagina met race-verloop en vergelijking met de
            mediaan, de top-3 of de winnaar. VZC-rijen staan met een gele spine gemarkeerd,
            zodat je je teamgenoten meteen ziet staan.
          </p>
        </div>
      </Reveal>

      {/* (2) KPI-band — ONgelijke readouts met haarlijn-scheiders */}
      <Reveal as="section">
        <div className="border-t border-[color:var(--color-vzc-line)] pt-6">
          <dl className="grid grid-cols-2 gap-y-8 sm:flex sm:flex-wrap sm:items-end sm:gap-0">
            <div className="sm:pr-10">
              <dt className="eyebrow">Teams</dt>
              <dd className="num mt-1 text-4xl leading-none text-[color:var(--color-vzc-blue-dark)]">
                {teams.length}
              </dd>
            </div>

            <div className="sm:border-l sm:border-[color:var(--color-vzc-line)] sm:px-10">
              <dt className="eyebrow">VZC-atleten</dt>
              <dd className="num mt-1 text-4xl leading-none text-[color:var(--color-vzc-blue-dark)]">
                {aantalVzcAtleten}
              </dd>
            </div>

            <div className="sm:border-l sm:border-[color:var(--color-vzc-line)] sm:px-10">
              <dt className="eyebrow">Wedstrijden gereden</dt>
              <dd className="mt-1 flex items-baseline gap-1.5">
                <span className="num text-4xl leading-none text-[color:var(--color-vzc-blue-dark)]">
                  {aantalGereden}
                </span>
                <span className="num text-sm text-[color:var(--color-vzc-muted)]">
                  / {totaalGepland}
                </span>
              </dd>
            </div>

            {/* Brede, ongelijke readout */}
            <div className="col-span-2 mt-2 sm:mt-0 sm:flex-1 sm:border-l sm:border-[color:var(--color-vzc-line)] sm:pl-10">
              <dt className="eyebrow">
                {eerstvolgende ? "Eerstvolgende race" : "Laatste race"}
              </dt>
              {eerstvolgende ? (
                <dd className="mt-1">
                  <span className="inline-flex items-baseline gap-2.5">
                    <span className="num text-2xl leading-none text-[color:var(--color-vzc-blue-dark)]">
                      {dagMaand(eerstvolgende.datum)}
                    </span>
                    <span className="font-display text-xl leading-none text-[color:var(--color-vzc-ink)]">
                      {eerstvolgende.locatie}
                    </span>
                  </span>
                  <div className="mt-1 text-xs text-[color:var(--color-vzc-muted)]">
                    Op de planning
                  </div>
                </dd>
              ) : laatste ? (
                <dd className="mt-1">
                  <Link
                    href={`/wedstrijd/${laatste.slug}`}
                    className="group inline-flex items-baseline gap-2.5"
                  >
                    <span className="num text-2xl leading-none text-[color:var(--color-vzc-blue-dark)]">
                      {dagMaand(laatste.wedstrijd.datum)}
                    </span>
                    <span className="font-display text-xl leading-none text-[color:var(--color-vzc-ink)] group-hover:underline">
                      {laatste.wedstrijd.locatie}
                    </span>
                  </Link>
                  <div className="mt-1 text-xs text-[color:var(--color-vzc-muted)]">
                    {laatste.wedstrijd.naam}
                  </div>
                </dd>
              ) : (
                <dd className="num mt-1 text-2xl text-[color:var(--color-vzc-ink-faint)]">—</dd>
              )}
            </div>
          </dl>
        </div>
      </Reveal>

      {/* (3) "De ploegen" — geruled INDEX-lijst (haarlijnen, géén kaartgrid) */}
      <Reveal as="section">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl text-[color:var(--color-vzc-blue-dark)]">
            De teams
          </h2>
          <span className="num text-xs text-[color:var(--color-vzc-muted)]">
            {teams.length} · {aantalVzcAtleten} atleten
          </span>
        </div>

        {teams.length === 0 ? (
          <p className="border-t border-[color:var(--color-vzc-line)] pt-5 text-sm text-[color:var(--color-vzc-muted)]">
            Nog geen wedstrijduitslagen geüpload voor 2026.
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--color-vzc-line)] border-t border-b border-[color:var(--color-vzc-line)]">
            {teams.map((t) => {
              const poule = officielePouleVoorTeam(t);
              const inPoule = poule ? officieelTeamInPoule(poule, t) : null;
              return (
                <li key={t.slug}>
                  <Link
                    href={`/team/${t.slug}`}
                    className="group flex items-center gap-4 py-4 pl-4 pr-1 transition hover:bg-[color:var(--color-vzc-blue-50)]"
                    style={{ boxShadow: "inset 3px 0 0 0 var(--color-vzc-yellow)" }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="eyebrow text-[color:var(--color-vzc-blue)]">
                        {t.divisie}
                        {t.poule ? ` · poule ${t.poule}` : ""} ·{" "}
                        {t.geslacht === "mannen" ? "Mannen" : "Vrouwen"}
                      </div>
                      <div className="mt-1 truncate text-base font-semibold text-[color:var(--color-vzc-ink)] group-hover:underline">
                        {t.naam}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="eyebrow">Stand</div>
                      {inPoule ? (
                        <div className="num text-2xl leading-none text-[color:var(--color-vzc-blue-dark)]">
                          {inPoule.positie}
                          <span className="text-sm text-[color:var(--color-vzc-muted)]">
                            /{poule!.teams.length}
                          </span>
                        </div>
                      ) : (
                        <div className="num text-2xl leading-none text-[color:var(--color-vzc-ink-faint)]">
                          —
                        </div>
                      )}
                    </div>
                    <span
                      aria-hidden
                      className="shrink-0 text-[color:var(--color-vzc-blue)] transition group-hover:translate-x-0.5"
                    >
                      →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Reveal>

      {/* (4) Race-tijdlijn / agenda */}
      <Reveal as="section">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl text-[color:var(--color-vzc-blue-dark)]">
            Wedstrijdagenda 2026
          </h2>
          <span className="num text-xs text-[color:var(--color-vzc-muted)]">
            {aantalGereden}/{totaalGepland} gereden
          </span>
        </div>

        {tijdlijn.length === 0 ? (
          <p className="border-t border-[color:var(--color-vzc-line)] pt-5 text-sm text-[color:var(--color-vzc-muted)]">
            Nog geen wedstrijden in de repo. Voeg een JSON-bestand toe in{" "}
            <code className="num">data/wedstrijden/</code>.
          </p>
        ) : (
          <ol className="relative ml-[7px] border-l border-[color:var(--color-vzc-line)]">
            {tijdlijn.map((w, i) => {
              const gereden = w.type === "gereden";
              return (
                <li key={`${w.datum}-${w.slug ?? i}`} className="relative pl-7">
                  <span
                    aria-hidden
                    className="absolute -left-[7px] top-5 h-3.5 w-3.5 rounded-full border-2 border-[color:var(--color-vzc-blue)]"
                    style={{
                      backgroundColor: gereden
                        ? "var(--color-vzc-blue)"
                        : "var(--color-vzc-cream)",
                    }}
                  />
                  {gereden && w.slug ? (
                    <Link
                      href={`/wedstrijd/${w.slug}`}
                      className="group flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-[color:var(--color-vzc-line)] py-4"
                    >
                      <span className="num w-24 shrink-0 text-sm text-[color:var(--color-vzc-blue-dark)]">
                        {dagMaand(w.datum)}
                      </span>
                      <span className="font-display text-lg text-[color:var(--color-vzc-ink)] group-hover:underline">
                        {w.locatie}
                      </span>
                      <span className="text-sm text-[color:var(--color-vzc-muted)]">
                        {w.naam}
                      </span>
                      <span className="ml-auto flex items-center gap-2">
                        {w.vzcAantal > 0 ? (
                          <span className="vzc-pill-vzc vzc-pill num">{w.vzcAantal} VZC</span>
                        ) : null}
                        <span
                          aria-hidden
                          className="text-[color:var(--color-vzc-blue)] transition group-hover:translate-x-0.5"
                        >
                          →
                        </span>
                      </span>
                    </Link>
                  ) : (
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-[color:var(--color-vzc-line)] py-4">
                      <span className="num w-24 shrink-0 text-sm text-[color:var(--color-vzc-ink-faint)]">
                        {dagMaand(w.datum)}
                      </span>
                      <span className="font-display text-lg text-[color:var(--color-vzc-ink-faint)]">
                        {w.locatie}
                      </span>
                      <span className="vzc-tag ml-auto">Op de planning</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </Reveal>

      {/* Sluit-rij: haarlijn-band met blauwe tekstlinks (geel = identiteit-only) */}
      <Reveal as="section">
        <div className="flex flex-col gap-4 border-t border-[color:var(--color-vzc-line)] pt-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <h2 className="font-display text-xl text-[color:var(--color-vzc-blue-dark)]">
              Zoek jezelf op
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[color:var(--color-vzc-ink-soft)]">
              Elke gestarte atleet heeft een eigen pagina met race-verloop en segmentanalyse.
              Vergelijk je tijden met de mediaan van je poule, de top-3 of de winnaar.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link
              href="/atleten"
              className="text-sm font-medium text-[color:var(--color-vzc-blue)] hover:underline"
            >
              Naar de atletenlijst →
            </Link>
            <Link
              href="/klassement"
              className="text-sm font-medium text-[color:var(--color-vzc-blue)] hover:underline"
            >
              Bekijk het seizoensklassement →
            </Link>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

const NL_MAANDEN = [
  "jan",
  "feb",
  "mrt",
  "apr",
  "mei",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
];

function dagMaand(datum: string): string {
  const dag = Number(datum.slice(8, 10));
  const m = Number(datum.slice(5, 7));
  const maand = NL_MAANDEN[m - 1] ?? "";
  return `${dag} ${maand}`;
}
