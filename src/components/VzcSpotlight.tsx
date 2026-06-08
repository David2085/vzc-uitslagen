import Link from "next/link";
import { formatSeconden, formatVerschil } from "@/lib/data";
import Reveal from "@/components/ui/Reveal";
import type { WedstrijdVolledig, AtleetUitslag, SegmentSleutel } from "@/lib/types";

type SpotlightSegment = {
  key: SegmentSleutel;
  label: string;
};

const SPOTLIGHT_SEGMENTEN: SpotlightSegment[] = [
  { key: "zwem", label: "Zwem" },
  { key: "fiets", label: "Fiets" },
  { key: "loop", label: "Loop" },
];

export default function VzcSpotlight({ wedstrijd }: { wedstrijd: WedstrijdVolledig }) {
  const vzc = wedstrijd.uitslagen.filter((u) => u.isVzc);
  if (vzc.length === 0) return null;

  const aantalPerSegment: Record<SegmentSleutel, number> = {
    zwem: 0,
    t1: 0,
    fiets: 0,
    t2: 0,
    loop: 0,
  };
  for (const u of wedstrijd.uitslagen) {
    (Object.keys(aantalPerSegment) as SegmentSleutel[]).forEach((s) => {
      if (u.rankPerSegment[s] !== null) aantalPerSegment[s] += 1;
    });
  }
  const aantalFinishers = wedstrijd.uitslagen.filter(
    (u) => u.rank !== "DNF" && u.splits.totaal !== null,
  ).length;

  const winnaarTijd = wedstrijd.uitslagen
    .map((u) => u.splits.totaal)
    .filter((t): t is number => t !== null)
    .sort((a, b) => a - b)[0];

  const sortedVzc = [...vzc].sort((a, b) => {
    if (a.rank === "DNF" && b.rank === "DNF") return 0;
    if (a.rank === "DNF") return 1;
    if (b.rank === "DNF") return -1;
    return (a.rank as number) - (b.rank as number);
  });

  return (
    <Reveal as="section" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">VZC-spotlight</span>
          <h2 className="font-display mt-1 text-2xl text-[color:var(--color-vzc-blue-dark)]">
            VZC in deze wedstrijd
          </h2>
          <p className="mt-1.5 max-w-xl text-xs text-[color:var(--color-vzc-muted)]">
            <span className="num">{vzc.length}</span> {vzc.length === 1 ? "atleet" : "atleten"} aan
            de start. De balken tonen de positie binnen het deelnemersveld; vol = leider in dat
            segment.
          </p>
        </div>
        <span className="vzc-pill-vzc vzc-pill">VZC</span>
      </div>
      <div className="vzc-card divide-y divide-[color:var(--color-vzc-line)]">
        {sortedVzc.map((atleet) => (
          <VzcRij
            key={atleet.atleetSlug}
            atleet={atleet}
            aantalPerSegment={aantalPerSegment}
            aantalFinishers={aantalFinishers}
            winnaarTijd={winnaarTijd ?? null}
          />
        ))}
      </div>
    </Reveal>
  );
}

function VzcRij({
  atleet,
  aantalPerSegment,
  aantalFinishers,
  winnaarTijd,
}: {
  atleet: AtleetUitslag;
  aantalPerSegment: Record<SegmentSleutel, number>;
  aantalFinishers: number;
  winnaarTijd: number | null;
}) {
  const isDnf = atleet.rank === "DNF";
  const totaalRank = typeof atleet.rank === "number" ? atleet.rank : null;
  const eindTijd = atleet.splits.totaal;
  const gap =
    winnaarTijd !== null && eindTijd !== null && eindTijd > winnaarTijd
      ? eindTijd - winnaarTijd
      : null;
  const leider = totaalRank === 1;

  return (
    <div className={"spotlight-row" + (isDnf ? " dnf" : "")}>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          {leider ? (
            <span className="leader-ring num text-sm font-bold text-[color:var(--color-vzc-blue-dark)]">
              1
            </span>
          ) : (
            <span className="num text-base font-semibold text-[color:var(--color-vzc-blue-dark)]">
              {isDnf ? "DNF" : `#${atleet.rank}`}
            </span>
          )}
          <Link
            href={`/atleet/${atleet.atleetSlug}`}
            className="truncate font-medium text-[color:var(--color-vzc-ink)] hover:text-[color:var(--color-vzc-blue)] hover:underline"
          >
            {atleet.naam}
          </Link>
        </div>
        <div className="mt-0.5 truncate text-xs text-[color:var(--color-vzc-muted)]">
          {atleet.club}
          {atleet.bib ? (
            <>
              {" · "}
              <span className="num">#{atleet.bib}</span>
            </>
          ) : null}
        </div>
      </div>

      <div className="spotlight-bars">
        {SPOTLIGHT_SEGMENTEN.map((seg) => {
          const rang = atleet.rankPerSegment[seg.key];
          const totaal = aantalPerSegment[seg.key];
          const pct =
            rang !== null && totaal > 1
              ? ((totaal - rang) / (totaal - 1)) * 100
              : rang === 1
                ? 100
                : 0;
          return (
            <SegmentRegel
              key={seg.key}
              label={seg.label}
              rang={rang}
              totaal={totaal}
              pct={pct}
            />
          );
        })}
      </div>

      <div className="text-right">
        {isDnf ? (
          <div className="text-sm font-medium text-[color:var(--color-vzc-muted)]">
            Niet gefinisht
          </div>
        ) : (
          <>
            <div className="num text-lg font-semibold text-[color:var(--color-vzc-blue-dark)]">
              {formatSeconden(eindTijd)}
            </div>
            <div className="mt-0.5 text-xs text-[color:var(--color-vzc-muted)]">
              {totaalRank !== null && aantalFinishers > 0 ? (
                <span className="num">
                  {totaalRank}e van {aantalFinishers}
                </span>
              ) : null}
              {gap !== null ? (
                <>
                  {" · "}
                  <span className="num text-[color:var(--color-neg)]">{formatVerschil(gap)}</span>
                </>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SegmentRegel({
  label,
  rang,
  totaal,
  pct,
}: {
  label: string;
  rang: number | null;
  totaal: number;
  pct: number;
}) {
  const heeftData = rang !== null && totaal > 0;
  const isLeider = rang === 1;
  return (
    <>
      <span className="eyebrow !text-[0.66rem]">{label}</span>
      <span className={"spotlight-bar-track" + (heeftData ? "" : " muted")} aria-hidden>
        <span
          className="fill"
          style={{
            width: heeftData ? `${Math.max(4, pct)}%` : "0%",
            backgroundColor: isLeider ? "var(--color-vzc-blue-dark)" : undefined,
          }}
        />
      </span>
      <span className="num text-right text-xs text-[color:var(--color-vzc-ink-soft)]">
        {heeftData ? `#${rang}` : "—"}
      </span>
    </>
  );
}
