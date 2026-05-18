import Link from "next/link";
import { notFound } from "next/navigation";
import {
  alleVzcTeams,
  formatSeconden,
  teamBijSlug,
  teamSeizoensStand,
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

  const seizoen = teamSeizoensStand(team);

  return (
    <div className="space-y-10">
      <div>
        <Link
          href="/"
          className="text-xs font-medium text-[color:var(--color-vzc-blue)] hover:underline"
        >
          ← Terug naar overzicht
        </Link>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{team.naam}</h1>
          <span className="vzc-pill-vzc vzc-pill">VZC-team</span>
        </div>
        <p className="mt-1 text-sm text-[color:var(--color-vzc-muted)]">
          {team.divisie}
          {team.poule ? ` · poule ${team.poule}` : ""} ·{" "}
          {team.geslacht === "mannen" ? "Mannen" : "Vrouwen"}
        </p>
      </div>

      {seizoen.perWedstrijd.length > 0 ? (
        <section className="vzc-card p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-base font-semibold text-[color:var(--color-vzc-blue-dark)]">
              Seizoensstand 2026
            </h2>
            <div className="text-right">
              <div className="text-2xl font-bold tabular-nums text-[color:var(--color-vzc-ink)]">
                {seizoen.totaalPunten}
              </div>
              <div className="text-[11px] uppercase tracking-wider text-[color:var(--color-vzc-muted)]">
                punten · {seizoen.perWedstrijd.length}{" "}
                {seizoen.perWedstrijd.length === 1 ? "wedstrijd" : "wedstrijden"}
              </div>
            </div>
          </div>
          <ul className="mt-4 divide-y divide-[color:var(--color-vzc-blue)]/10">
            {seizoen.perWedstrijd.map((r) => (
              <li
                key={r.wedstrijdSlug}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-[color:var(--color-vzc-muted)] tabular-nums">
                    {r.datum}
                  </span>
                  <Link
                    href={`/wedstrijd/${r.wedstrijdSlug}`}
                    className="font-medium text-[color:var(--color-vzc-ink)] hover:text-[color:var(--color-vzc-blue)] hover:underline"
                  >
                    {r.wedstrijdNaam}
                  </Link>
                </div>
                <div className="flex items-center gap-4 tabular-nums">
                  <span className="text-sm font-semibold text-[color:var(--color-vzc-ink-soft)]">
                    #{r.rank}
                  </span>
                  <span className="text-xs text-[color:var(--color-vzc-muted)]">
                    {formatSeconden(r.teamtijd)}
                  </span>
                  <span className="text-sm font-semibold text-[color:var(--color-vzc-blue-dark)]">
                    {r.punten} pnt
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
