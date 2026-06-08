"use client";

import { useMemo, useState } from "react";
import type { WedstrijdVolledig, AtleetUitslag, CheckpointSleutel } from "@/lib/types";

const CHECKPOINTS: { key: CheckpointSleutel; label: string }[] = [
  { key: "na_zwem", label: "Zwem" },
  { key: "na_t1", label: "T1" },
  { key: "na_fiets", label: "Fiets" },
  { key: "na_t2", label: "T2" },
  { key: "eindtijd", label: "Finish" },
];

const TOP_LIMIT = 10;

type HoverInfo = {
  naam: string;
  club: string;
  eindpositie: number | "DNF";
  isVzc: boolean;
  x: number;
  y: number;
};

export default function PositieVerloopChart({
  wedstrijd,
}: {
  wedstrijd: WedstrijdVolledig;
}) {
  const atleten = wedstrijd.uitslagen;

  const finishers = useMemo(
    () =>
      atleten.filter(
        (u) => typeof u.rank === "number" && u.splits.totaal !== null,
      ),
    [atleten],
  );

  const heeftCumulatief = useMemo(
    () =>
      atleten.some((u) =>
        CHECKPOINTS.some((c) => u.cumulatiefRank[c.key] !== null),
      ),
    [atleten],
  );

  const vzcSlugs = useMemo(
    () => new Set(atleten.filter((u) => u.isVzc).map((u) => u.atleetSlug)),
    [atleten],
  );

  const topSlugs = useMemo(
    () =>
      new Set(
        [...finishers]
          .sort((a, b) => (a.rank as number) - (b.rank as number))
          .slice(0, TOP_LIMIT)
          .map((u) => u.atleetSlug),
      ),
    [finishers],
  );

  const [extraSlugs, setExtraSlugs] = useState<Set<string>>(() => new Set());
  const [toonTop10, setToonTop10] = useState(false);
  const [zoekTerm, setZoekTerm] = useState("");
  const [hover, setHover] = useState<HoverInfo | null>(null);

  if (finishers.length < 2 || !heeftCumulatief) return null;

  const totaal = finishers.length;
  const yMin = 1;
  const yMax = totaal;

  const width = 760;
  const height = 360;
  const padL = 48;
  const padR = 110;
  const padT = 28;
  const padB = 36;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const xFor = (i: number) => padL + (i / (CHECKPOINTS.length - 1)) * innerW;
  const yFor = (positie: number) =>
    padT + ((positie - yMin) / Math.max(1, yMax - yMin)) * innerH;

  function puntenVoor(atleet: AtleetUitslag) {
    return CHECKPOINTS.map((c, i) => {
      const positie = atleet.cumulatiefRank[c.key];
      return positie === null
        ? null
        : { x: xFor(i), y: yFor(positie), positie };
    }).filter((p): p is { x: number; y: number; positie: number } => p !== null);
  }

  const achtergrond: AtleetUitslag[] = [];
  const topGroep: AtleetUitslag[] = [];
  const extraGroep: AtleetUitslag[] = [];
  const vzcGroep: AtleetUitslag[] = [];

  for (const u of atleten) {
    if (u.isVzc) {
      vzcGroep.push(u);
    } else if (extraSlugs.has(u.atleetSlug)) {
      extraGroep.push(u);
    } else if (toonTop10 && topSlugs.has(u.atleetSlug)) {
      topGroep.push(u);
    } else {
      achtergrond.push(u);
    }
  }

  function toggleExtra(slug: string) {
    setExtraSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function resetSelectie() {
    setExtraSlugs(new Set());
    setToonTop10(false);
    setZoekTerm("");
  }

  const zoekTermLc = zoekTerm.trim().toLowerCase();
  const filterLijst = atleten
    .filter((u) => !u.isVzc)
    .filter((u) =>
      zoekTermLc === ""
        ? true
        : u.naam.toLowerCase().includes(zoekTermLc) ||
          u.club.toLowerCase().includes(zoekTermLc),
    )
    .sort((a, b) => {
      const aRank = typeof a.rank === "number" ? a.rank : 9999;
      const bRank = typeof b.rank === "number" ? b.rank : 9999;
      return aRank - bRank;
    });

  const yTicks = bepaalYTicks(yMin, yMax);

  const aantalExtra = extraSlugs.size;

  function lijnHandlers(atleet: AtleetUitslag) {
    return {
      onMouseEnter: (e: React.MouseEvent<SVGElement>) => {
        const svg = e.currentTarget.ownerSVGElement;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const punten = puntenVoor(atleet);
        const ref = punten[punten.length - 1] ?? punten[0];
        if (!ref) return;
        const scaleX = rect.width / width;
        const scaleY = rect.height / height;
        setHover({
          naam: atleet.naam,
          club: atleet.club,
          eindpositie: atleet.rank,
          isVzc: atleet.isVzc,
          x: ref.x * scaleX,
          y: ref.y * scaleY,
        });
      },
      onMouseLeave: () => setHover(null),
    };
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Door de race</span>
          <h2 className="font-display mt-1 text-2xl text-[color:var(--color-vzc-blue-dark)]">
            Positie-verloop
          </h2>
          <p className="mt-1.5 text-xs text-[color:var(--color-vzc-muted)]">
            Selecteer wie je in de grafiek wilt zien. VZC-atleten staan altijd uitgelicht.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-[color:var(--color-vzc-muted)]">
          <Legenda kleur="var(--color-vzc-yellow)" rand="var(--color-vzc-blue-dark)" label="VZC" />
          <Legenda kleur="var(--color-vzc-blue-dark)" label="Geselecteerd" />
          <Legenda kleur="var(--color-vzc-blue)" label={`Top ${TOP_LIMIT}`} dun />
          <Legenda kleur="var(--color-vzc-muted)" label="Overig veld" mutedFill />
        </div>
      </div>

      <details className="vzc-card">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[color:var(--color-vzc-blue-dark)]">
          Filter atleten
          <span className="ml-2 text-xs font-normal text-[color:var(--color-vzc-muted)]">
            {aantalExtra > 0
              ? `${aantalExtra} extra geselecteerd`
              : "geen extra geselecteerd"}
            {toonTop10 ? ` · top ${TOP_LIMIT} aan` : ""}
          </span>
        </summary>

        <div className="space-y-3 border-t border-[color:var(--color-vzc-line)] px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setToonTop10((v) => !v)}
              className={
                "rounded-full px-3 py-1 text-xs font-medium transition " +
                (toonTop10
                  ? "bg-[color:var(--color-vzc-blue)] text-white"
                  : "bg-[color:var(--color-vzc-blue)]/8 text-[color:var(--color-vzc-blue-dark)] hover:bg-[color:var(--color-vzc-blue)]/15")
              }
            >
              {toonTop10 ? `Top ${TOP_LIMIT} uit` : `Top ${TOP_LIMIT} erbij`}
            </button>
            {aantalExtra > 0 || toonTop10 ? (
              <button
                type="button"
                onClick={resetSelectie}
                className="rounded-full px-3 py-1 text-xs font-medium text-[color:var(--color-vzc-muted)] hover:bg-[color:var(--color-vzc-blue)]/8"
              >
                Reset
              </button>
            ) : null}
            <input
              type="search"
              value={zoekTerm}
              onChange={(e) => setZoekTerm(e.target.value)}
              placeholder="Zoek atleet of club…"
              className="ml-auto w-full max-w-xs rounded-full border border-[color:var(--color-vzc-line)] bg-[color:var(--color-vzc-paper)] px-3 py-1 text-sm placeholder:text-[color:var(--color-vzc-muted)] focus:border-[color:var(--color-vzc-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-vzc-blue)]/50 focus-visible:ring-offset-1"
            />
          </div>

          {aantalExtra > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {[...extraSlugs].map((slug) => {
                const a = atleten.find((x) => x.atleetSlug === slug);
                if (!a) return null;
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => toggleExtra(slug)}
                    className="inline-flex items-center gap-1 rounded-full bg-[color:var(--color-vzc-blue-dark)] px-2.5 py-1 text-xs font-medium text-white hover:bg-[color:var(--color-vzc-blue)]"
                    title="Klik om te verwijderen"
                  >
                    {a.naam}
                    <span aria-hidden>×</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <ul className="max-h-56 space-y-0.5 overflow-y-auto rounded-md bg-[color:var(--color-vzc-blue)]/5 px-2 py-2 text-sm">
            {filterLijst.length === 0 ? (
              <li className="px-2 py-1 text-xs text-[color:var(--color-vzc-muted)]">
                Geen atleten gevonden.
              </li>
            ) : (
              filterLijst.map((a) => {
                const checked = extraSlugs.has(a.atleetSlug);
                const isTop = topSlugs.has(a.atleetSlug);
                const rangText =
                  typeof a.rank === "number" ? `#${a.rank}` : "DNF";
                return (
                  <li key={a.atleetSlug}>
                    <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-white">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleExtra(a.atleetSlug)}
                        className="h-3.5 w-3.5 accent-[color:var(--color-vzc-blue-dark)]"
                      />
                      <span className="num w-10 shrink-0 text-xs font-semibold text-[color:var(--color-vzc-ink-soft)]">
                        {rangText}
                      </span>
                      <span className="truncate text-[color:var(--color-vzc-ink)]">
                        {a.naam}
                      </span>
                      <span className="truncate text-xs text-[color:var(--color-vzc-muted)]">
                        {a.club}
                      </span>
                      {isTop ? (
                        <span className="ml-auto rounded-full bg-[color:var(--color-vzc-blue)]/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[color:var(--color-vzc-blue-dark)]">
                          top {TOP_LIMIT}
                        </span>
                      ) : null}
                    </label>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </details>

      <div className="scroll-hint">
        <span aria-hidden>←</span>
        Veeg horizontaal voor de volledige grafiek
        <span aria-hidden>→</span>
      </div>
      <div className="vzc-card relative overflow-x-auto p-3 sm:p-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[320px] w-auto sm:h-auto sm:w-full"
          role="img"
          aria-label="Positie-verloop per atleet door de race"
        >
          {yTicks.map((pos) => (
            <g key={pos}>
              <line
                x1={padL}
                y1={yFor(pos)}
                x2={width - padR + 16}
                y2={yFor(pos)}
                stroke="var(--color-vzc-line)"
                strokeWidth={1}
              />
              <text
                x={padL - 8}
                y={yFor(pos)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={11}
                fill="var(--color-vzc-muted)"
                style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}
              >
                #{pos}
              </text>
            </g>
          ))}

          {CHECKPOINTS.map((c, i) => (
            <g key={c.key}>
              <line
                x1={xFor(i)}
                y1={padT}
                x2={xFor(i)}
                y2={padT + innerH}
                stroke="var(--color-vzc-line)"
                strokeOpacity={0.7}
                strokeWidth={1}
              />
              <text
                x={xFor(i)}
                y={height - padB + 18}
                textAnchor="middle"
                fontSize={11}
                fill="var(--color-vzc-muted)"
              >
                {c.label}
              </text>
            </g>
          ))}

          {achtergrond.map((a) => (
            <Polyline
              key={a.atleetSlug}
              atleet={a}
              punten={puntenVoor(a)}
              stroke="var(--color-vzc-muted)"
              strokeOpacity={0.18}
              strokeWidth={1}
              handlers={lijnHandlers(a)}
            />
          ))}
          {topGroep.map((a) => (
            <Polyline
              key={a.atleetSlug}
              atleet={a}
              punten={puntenVoor(a)}
              stroke="var(--color-vzc-blue)"
              strokeOpacity={0.6}
              strokeWidth={1.6}
              handlers={lijnHandlers(a)}
            />
          ))}
          {extraGroep.map((a) => (
            <Polyline
              key={a.atleetSlug}
              atleet={a}
              punten={puntenVoor(a)}
              stroke="var(--color-vzc-blue-dark)"
              strokeWidth={2.5}
              label
              handlers={lijnHandlers(a)}
            />
          ))}
          {vzcGroep.map((a) => (
            <Polyline
              key={a.atleetSlug}
              atleet={a}
              punten={puntenVoor(a)}
              stroke="var(--color-vzc-yellow)"
              strokeWidth={3}
              halo="var(--color-vzc-blue-dark)"
              label
              labelKleur="var(--color-vzc-blue-dark)"
              markers
              handlers={lijnHandlers(a)}
            />
          ))}

          <text
            x={padL - 34}
            y={padT + innerH / 2}
            textAnchor="middle"
            transform={`rotate(-90 ${padL - 34} ${padT + innerH / 2})`}
            fontSize={11}
            fill="var(--color-vzc-muted)"
          >
            positie (1 = leider)
          </text>
        </svg>

        {hover ? (
          <div
            className={
              "pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md px-2.5 py-1.5 text-xs font-medium shadow-md " +
              (hover.isVzc
                ? "bg-[color:var(--color-vzc-blue-dark)] text-white"
                : "bg-white text-[color:var(--color-vzc-ink)] ring-1 ring-[color:var(--color-vzc-blue)]/15")
            }
            style={{ left: hover.x, top: hover.y - 8 }}
          >
            <div>{hover.naam}</div>
            <div
              className={
                "text-[11px] " +
                (hover.isVzc
                  ? "text-white/80"
                  : "text-[color:var(--color-vzc-muted)]")
              }
            >
              {hover.club} · {hover.eindpositie === "DNF" ? "DNF" : `eindpositie ${hover.eindpositie}`}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Polyline({
  atleet,
  punten,
  stroke,
  strokeWidth,
  strokeOpacity,
  halo,
  label,
  labelKleur,
  markers,
  handlers,
}: {
  atleet: AtleetUitslag;
  punten: { x: number; y: number; positie: number }[];
  stroke: string;
  strokeWidth: number;
  strokeOpacity?: number;
  halo?: string;
  label?: boolean;
  labelKleur?: string;
  markers?: boolean;
  handlers?: {
    onMouseEnter: (e: React.MouseEvent<SVGElement>) => void;
    onMouseLeave: () => void;
  };
}) {
  if (punten.length < 2) return null;
  const points = punten
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const laatste = punten[punten.length - 1];
  const compleet = punten.length === CHECKPOINTS.length;
  const eindLabel =
    typeof atleet.rank === "number" && compleet
      ? `${korteNaam(atleet.naam)} #${atleet.rank}`
      : `${korteNaam(atleet.naam)} (uit)`;
  return (
    <g style={{ cursor: handlers ? "pointer" : "default" }}>
      {halo ? (
        <polyline
          points={points}
          fill="none"
          stroke={halo}
          strokeWidth={strokeWidth + 2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeOpacity={0.85}
        />
      ) : null}
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeOpacity={strokeOpacity ?? 1}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <polyline
        points={points}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(12, strokeWidth + 6)}
        strokeLinejoin="round"
        strokeLinecap="round"
        pointerEvents="stroke"
        onMouseEnter={handlers?.onMouseEnter}
        onMouseLeave={handlers?.onMouseLeave}
      />
      {markers
        ? punten.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={3.5}
              fill="white"
              stroke="var(--color-vzc-blue-dark)"
              strokeWidth={1.5}
              pointerEvents="none"
            />
          ))
        : null}
      {label ? (
        <text
          x={laatste.x + 8}
          y={laatste.y}
          dominantBaseline="middle"
          fontSize={11}
          fontWeight={600}
          fill={labelKleur ?? stroke}
          style={{ fontVariantNumeric: "tabular-nums", pointerEvents: "none" }}
        >
          {eindLabel}
        </text>
      ) : null}
    </g>
  );
}

function Legenda({
  kleur,
  rand,
  label,
  mutedFill,
  dun,
}: {
  kleur: string;
  rand?: string;
  label: string;
  mutedFill?: boolean;
  dun?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: 22,
          height: rand ? 4 : dun ? 2 : 3,
          background: kleur,
          opacity: mutedFill ? 0.4 : 1,
          border: rand ? `1px solid ${rand}` : "none",
          borderRadius: 2,
        }}
      />
      {label}
    </span>
  );
}

function bepaalYTicks(min: number, max: number): number[] {
  if (max - min <= 1) return [min, max];
  const ruwStap = (max - min) / 5;
  const stap = mooieStap(ruwStap);
  const ticks: number[] = [min];
  let v = Math.ceil((min + 1) / stap) * stap;
  while (v < max) {
    if (v > min) ticks.push(v);
    v += stap;
  }
  ticks.push(max);
  return Array.from(new Set(ticks)).sort((a, b) => a - b);
}

function mooieStap(ruw: number): number {
  const opties = [1, 2, 5, 10, 20, 25, 50, 100];
  for (const o of opties) if (o >= ruw) return o;
  return Math.ceil(ruw / 100) * 100;
}

function korteNaam(naam: string): string {
  const delen = naam.trim().split(/\s+/);
  if (delen.length === 1) return delen[0];
  const eerste = delen[0];
  const achternaam = delen[delen.length - 1];
  return `${eerste[0]}. ${achternaam}`;
}
