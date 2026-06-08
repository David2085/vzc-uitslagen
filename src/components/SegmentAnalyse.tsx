"use client";

import { useMemo, useState } from "react";
import type { AtleetUitslag, SegmentSleutel } from "@/lib/types";

type Props = {
  atleet: AtleetUitslag;
  alleInWedstrijd: AtleetUitslag[];
};

type Baseline = "mediaan" | "top3" | "podium" | "team";

const BASELINE_OPTIES: { id: Baseline; label: string; uitleg: string }[] = [
  { id: "mediaan", label: "Mediaan poule", uitleg: "Het midden van het deelnemersveld." },
  { id: "top3", label: "Gemiddelde top-3", uitleg: "De drie snelste tijden per segment." },
  { id: "podium", label: "Winnaar", uitleg: "De snelste tijd in dat segment." },
  { id: "team", label: "Snelste VZC", uitleg: "De snelste VZC-atleet in deze wedstrijd." },
];

const SEGMENT_LABELS: Record<SegmentSleutel, string> = {
  zwem: "Zwemmen",
  t1: "T1",
  fiets: "Fietsen",
  t2: "T2",
  loop: "Lopen",
};

function formatSec(sec: number | null): string {
  if (sec === null || Number.isNaN(sec)) return "—";
  const abs = Math.abs(sec);
  const u = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = Math.round(abs % 60);
  const teken = sec < 0 ? "-" : "";
  if (u > 0) return `${teken}${u}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${teken}${m}:${s.toString().padStart(2, "0")}`;
}

function formatVerschil(sec: number | null): string {
  if (sec === null) return "—";
  if (Math.abs(sec) < 1) return "±0s";
  const teken = sec < 0 ? "−" : "+";
  const abs = Math.abs(sec);
  const m = Math.floor(abs / 60);
  const s = Math.round(abs % 60);
  if (m === 0) return `${teken}${s}s`;
  return `${teken}${m}m${s.toString().padStart(2, "0")}s`;
}

function baselineTijd(
  alleInWedstrijd: AtleetUitslag[],
  segment: SegmentSleutel,
  baseline: Baseline,
  atleet: AtleetUitslag,
): number | null {
  const tijden = alleInWedstrijd
    .map((a) => ({ a, tijd: a.splits[segment] }))
    .filter((x): x is { a: AtleetUitslag; tijd: number } => x.tijd !== null && x.tijd > 0);
  if (tijden.length === 0) return null;
  const opTijd = [...tijden].sort((a, b) => a.tijd - b.tijd);
  if (baseline === "podium") return opTijd[0].tijd;
  if (baseline === "top3") {
    const top = opTijd.slice(0, Math.min(3, opTijd.length));
    return top.reduce((s, x) => s + x.tijd, 0) / top.length;
  }
  if (baseline === "mediaan") {
    const m = Math.floor(opTijd.length / 2);
    return opTijd.length % 2 === 0 ? (opTijd[m - 1].tijd + opTijd[m].tijd) / 2 : opTijd[m].tijd;
  }
  if (baseline === "team") {
    const eigenTeams = atleet.wedstrijd.vzc_teams;
    const vzc = opTijd.filter((x) =>
      eigenTeams.some((t) => t.toLowerCase() === x.a.club.toLowerCase()),
    );
    if (vzc.length === 0) return null;
    return vzc[0].tijd;
  }
  return null;
}

export default function SegmentAnalyse({ atleet, alleInWedstrijd }: Props) {
  const [baseline, setBaseline] = useState<Baseline>("mediaan");

  const rijen = useMemo(() => {
    const segmenten: SegmentSleutel[] = ["zwem", "t1", "fiets", "t2", "loop"];
    return segmenten.map((segment) => {
      const eigen = atleet.splits[segment];
      const baselineWaarde = baselineTijd(alleInWedstrijd, segment, baseline, atleet);
      const verschil =
        eigen !== null && baselineWaarde !== null ? eigen - baselineWaarde : null;
      const rank = atleet.rankPerSegment[segment];
      const totaalInVeld = alleInWedstrijd.filter((a) => a.splits[segment] !== null).length;
      return { segment, eigen, baselineWaarde, verschil, rank, totaalInVeld };
    });
  }, [atleet, alleInWedstrijd, baseline]);

  const maxTijd = Math.max(
    1,
    ...rijen
      .flatMap((r) => [r.eigen ?? 0, r.baselineWaarde ?? 0])
      .filter((n): n is number => typeof n === "number"),
  );

  const totaalVerschil = rijen.reduce(
    (acc, r) => (r.verschil !== null ? acc + r.verschil : acc),
    0,
  );
  const heeftAlleVerschillen = rijen.every((r) => r.verschil !== null);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-[color:var(--color-vzc-blue-dark)]">
            Segmentanalyse
          </h2>
          <p className="text-sm text-[color:var(--color-vzc-muted)]">
            Tijdverschil per segment t.o.v. de gekozen vergelijking. Negatief = sneller dan
            referentie.
          </p>
        </div>
        <div className="segmented flex-wrap" role="tablist" aria-label="Vergelijking">
          {BASELINE_OPTIES.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={baseline === opt.id}
              data-active={baseline === opt.id}
              onClick={() => setBaseline(opt.id)}
              title={opt.uitleg}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="vzc-card divide-y divide-[color:var(--color-vzc-line)]">
        {rijen.map((r) => {
          const eigenPct = r.eigen !== null ? Math.min(100, (r.eigen / maxTijd) * 100) : 0;
          const basePct =
            r.baselineWaarde !== null ? Math.min(100, (r.baselineWaarde / maxTijd) * 100) : 0;
          const sneller = r.verschil !== null && r.verschil < 0;
          return (
            <div key={r.segment} className="grid grid-cols-12 items-center gap-4 px-5 py-4">
              <div className="col-span-12 sm:col-span-2">
                <div className="font-medium text-[color:var(--color-vzc-ink)]">
                  {SEGMENT_LABELS[r.segment]}
                </div>
                <div className="text-xs text-[color:var(--color-vzc-muted)]">
                  {r.rank ? (
                    <>
                      Positie <span className="num">{r.rank}</span> van{" "}
                      <span className="num">{r.totaalInVeld}</span>
                    </>
                  ) : (
                    "geen positie"
                  )}
                </div>
              </div>
              <div className="col-span-12 sm:col-span-6">
                <div className="vzc-segment-bar" aria-hidden>
                  <div className="fill-self" style={{ right: `${100 - eigenPct}%` }} />
                  <div className="fill-base" style={{ right: `${100 - basePct}%` }} />
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-[color:var(--color-vzc-muted)]">
                  <span>
                    Eigen: <span className="num">{formatSec(r.eigen)}</span>
                  </span>
                  <span>
                    Referentie: <span className="num">{formatSec(r.baselineWaarde)}</span>
                  </span>
                </div>
              </div>
              <div className="col-span-12 sm:col-span-4 text-right">
                <div
                  className="num text-lg font-semibold"
                  style={{
                    color:
                      r.verschil === null
                        ? "var(--color-vzc-muted)"
                        : sneller
                          ? "var(--color-pos)"
                          : "var(--color-neg)",
                  }}
                >
                  {formatVerschil(r.verschil)}
                </div>
                <div className="text-[11px] uppercase tracking-wider text-[color:var(--color-vzc-muted)]">
                  {r.verschil === null
                    ? "geen meting"
                    : sneller
                      ? "winst"
                      : "verlies"}
                </div>
              </div>
            </div>
          );
        })}
        {heeftAlleVerschillen ? (
          <div className="flex items-center justify-between gap-4 bg-[color:var(--color-vzc-blue)]/5 px-5 py-3 text-sm">
            <span className="font-medium text-[color:var(--color-vzc-blue-dark)]">
              Totaal t.o.v. {BASELINE_OPTIES.find((o) => o.id === baseline)?.label.toLowerCase()}
            </span>
            <span
              className="num font-semibold"
              style={{
                color: totaalVerschil < 0 ? "var(--color-pos)" : "var(--color-neg)",
              }}
            >
              {formatVerschil(totaalVerschil)}
            </span>
          </div>
        ) : null}
      </div>

      <p className="text-xs text-[color:var(--color-vzc-muted)]">
        De blauwe balk is jouw eigen tijd, de rode streep is de gekozen referentie. Beweeg over de
        knoppen om snel een andere vergelijking te kiezen.
      </p>
    </section>
  );
}
