import Link from "next/link";
import { notFound } from "next/navigation";
import {
  alleVzcTeams,
  formatSeconden,
  officielePouleVoorTeam,
  officieelTeamInPoule,
  teamBijSlug,
  wedstrijdBijSlug,
} from "@/lib/data";

export function generateStaticParams() {
  return alleVzcTeams().map((t) => ({ slug: t.slug }));
}

export default async function TeamPagina({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const team = teamBijSlug(slug);
  if (!team) return notFound();

  const races = team.wedstrijdSlugs
    .map((s) => wedstrijdBijSlug(s))
    .filter((w): w is NonNullable<typeof w> => w !== null);

  const poule = officielePouleVoorTeam(team);
  const eigen = poule ? officieelTeamInPoule(poule, team) : null;
  const gespeeldeRaces = poule
    ? poule.races
        .map((r, i) => ({ race: r, res: eigen?.team.perRace[i] ?? null }))
        .filter((x) => x.res !== null)
    : [];

  return (
    <div className="space-y-10">
      <div>
        <Link
          href="/"
          className="text-xs font-medium text-[color:var(--color-vzc-blue)] hover:underline"
        >
          ← Terug naar overzicht
        </Link>
        <div className="eyebrow mt-4">
          {team.divisie}
          {team.poule ? ` · Poule ${team.poule}` : ""} ·{" "}
          {team.geslacht === "mannen" ? "Mannen" : "Vrouwen"}
        </div>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <h1 className="font-display text-3xl text-[color:var(--color-vzc-blue-dark)] sm:text-4xl">
            {team.naam}
          </h1>
          <span className="vzc-pill-vzc vzc-pill">VZC-team</span>
        </div>
      </div>

      {eigen && gespeeldeRaces.length > 0 ? (
        <section className="vzc-card p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-display text-xl text-[color:var(--color-vzc-blue-dark)]">
              Seizoensstand 2026
            </h2>
            <div className="text-right">
              <div className="num text-2xl font-bold text-[color:var(--color-vzc-ink)]">
                {eigen.positie}
                <span className="text-base font-medium text-[color:var(--color-vzc-muted)]">
                  {" "}
                  / {poule!.teams.length}
                </span>
              </div>
              <div className="text-[11px] uppercase tracking-wider text-[color:var(--color-vzc-muted)]">
                stand · {eigen.team.totaalPlaats} plaatsen uit {gespeeldeRaces.length}{" "}
                {gespeeldeRaces.length === 1 ? "wedstrijd" : "wedstrijden"}
              </div>
            </div>
          </div>
          <ul className="mt-4 divide-y divide-[color:var(--color-vzc-blue)]/10">
            {gespeeldeRaces.map(({ race, res }) => (
              <li
                key={race.label}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {race.wedstrijdSlug ? (
                    <Link
                      href={`/wedstrijd/${race.wedstrijdSlug}`}
                      className="font-medium text-[color:var(--color-vzc-ink)] hover:text-[color:var(--color-vzc-blue)] hover:underline"
                    >
                      {race.label}
                    </Link>
                  ) : (
                    <span className="font-medium text-[color:var(--color-vzc-ink)]">
                      {race.label}
                    </span>
                  )}
                  {race.isTtt ? (
                    <span className="vzc-pill text-[10px]">TTT</span>
                  ) : null}
                </div>
                <div className="num flex items-center gap-4">
                  <span className="text-xs text-[color:var(--color-vzc-muted)]">
                    {res!.som !== null ? `${res!.som} klas.` : "op tijd"}
                  </span>
                  <span className="text-sm font-semibold text-[color:var(--color-vzc-blue-dark)]">
                    #{res!.plaats}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {races.map((wedstrijd) => {
        const eigen = wedstrijd.uitslagen.filter((u) => u.isVzc);
        return (
          <section key={wedstrijd.slug} className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <Link
                  href={`/wedstrijd/${wedstrijd.slug}`}
                  className="text-base font-semibold text-[color:var(--color-vzc-blue-dark)] hover:underline"
                >
                  {wedstrijd.wedstrijd.naam}
                </Link>
                <div className="text-xs text-[color:var(--color-vzc-muted)]">
                  {wedstrijd.wedstrijd.datum} · {wedstrijd.wedstrijd.locatie}
                </div>
              </div>
              <Link
                href={`/wedstrijd/${wedstrijd.slug}`}
                className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-vzc-blue)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
              >
                Volledige uitslag <span aria-hidden>→</span>
              </Link>
            </div>

            <div className="vzc-card overflow-x-auto">
              <table className="uitslagen min-w-[640px]">
                <thead>
                  <tr>
                    <th className="w-12">#</th>
                    <th>Atleet</th>
                    <th className="text-right">Zwem</th>
                    <th className="text-right">Fiets</th>
                    <th className="text-right">Lopen</th>
                    <th className="text-right">Eindtijd</th>
                  </tr>
                </thead>
                <tbody>
                  {eigen
                    .sort((a, b) => {
                      if (a.rank === "DNF" && b.rank === "DNF") return 0;
                      if (a.rank === "DNF") return 1;
                      if (b.rank === "DNF") return -1;
                      return (a.rank as number) - (b.rank as number);
                    })
                    .map((u) => (
                      <tr key={u.atleetSlug} className="vzc">
                        <td className="text-sm font-semibold">
                          {u.rank === "DNF" ? "DNF" : u.rank}
                        </td>
                        <td>
                          <Link
                            href={`/atleet/${u.atleetSlug}`}
                            className="font-medium hover:underline"
                          >
                            {u.naam}
                          </Link>
                        </td>
                        <td className="text-right tabular-nums">
                          {formatSeconden(u.splits.zwem)}
                        </td>
                        <td className="text-right tabular-nums">
                          {formatSeconden(u.splits.fiets)}
                        </td>
                        <td className="text-right tabular-nums">
                          {formatSeconden(u.splits.loop)}
                        </td>
                        <td className="text-right font-semibold tabular-nums">
                          {formatSeconden(u.splits.totaal)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
