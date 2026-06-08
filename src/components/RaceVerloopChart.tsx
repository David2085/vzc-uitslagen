import type { AtleetUitslag, CheckpointSleutel } from "@/lib/types";

type Punt = {
  key: CheckpointSleutel;
  label: string;
  positie: number | null;
};

export default function RaceVerloopChart({
  atleet,
  totaalStarters,
}: {
  atleet: AtleetUitslag;
  totaalStarters: number;
}) {
  const punten: Punt[] = [
    { key: "na_zwem", label: "Zwem", positie: atleet.cumulatiefRank.na_zwem },
    { key: "na_t1", label: "T1", positie: atleet.cumulatiefRank.na_t1 },
    { key: "na_fiets", label: "Fiets", positie: atleet.cumulatiefRank.na_fiets },
    { key: "na_t2", label: "T2", positie: atleet.cumulatiefRank.na_t2 },
    { key: "eindtijd", label: "Finish", positie: atleet.cumulatiefRank.eindtijd },
  ];

  const width = 720;
  const height = 280;
  const padL = 56;
  const padR = 24;
  const padT = 28;
  const padB = 44;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const yMin = 1;
  const yMax = Math.max(totaalStarters, 2);

  const xFor = (i: number) => padL + (i / (punten.length - 1)) * innerW;
  const yFor = (positie: number) => padT + ((positie - yMin) / (yMax - yMin)) * innerH;

  const ptsMet = punten
    .map((p, i) =>
      p.positie !== null
        ? { i, x: xFor(i), y: yFor(p.positie), positie: p.positie, label: p.label }
        : null,
    )
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const polyline = ptsMet.map((p) => `${p.x},${p.y}`).join(" ");

  const yTicks = bepaalYTicks(yMin, yMax);
  const mono = "var(--font-mono)";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Klassement door de race voor ${atleet.naam}`}
    >
      {yTicks.map((pos) => (
        <g key={pos}>
          <line
            x1={padL}
            y1={yFor(pos)}
            x2={width - padR}
            y2={yFor(pos)}
            stroke="var(--color-vzc-line)"
            strokeWidth={1}
          />
          <text
            x={padL - 10}
            y={yFor(pos)}
            textAnchor="end"
            dominantBaseline="middle"
            fill="var(--color-vzc-muted)"
            fontSize={11}
            fontFamily={mono}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            #{pos}
          </text>
        </g>
      ))}

      {punten.map((p, i) => (
        <g key={p.key}>
          <line
            x1={xFor(i)}
            y1={padT}
            x2={xFor(i)}
            y2={padT + innerH}
            stroke="var(--color-vzc-line)"
            strokeOpacity={0.6}
            strokeWidth={1}
          />
          <text
            x={xFor(i)}
            y={height - padB + 22}
            textAnchor="middle"
            fill="var(--color-vzc-muted)"
            fontSize={11}
            letterSpacing="0.04em"
          >
            {p.label}
          </text>
        </g>
      ))}

      {ptsMet.length > 1 ? (
        <polyline
          points={polyline}
          fill="none"
          stroke="var(--color-vzc-blue)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : null}

      {ptsMet.map((p) => {
        const isFinish = p.i === punten.length - 1;
        return (
          <g key={p.i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={isFinish ? 6 : 5}
              fill={isFinish ? "var(--color-vzc-blue-dark)" : "var(--color-vzc-paper)"}
              stroke="var(--color-vzc-blue)"
              strokeWidth={2}
            />
            <text
              x={p.x}
              y={p.y - 14}
              textAnchor="middle"
              fill="var(--color-vzc-ink)"
              fontSize={12}
              fontWeight={600}
              fontFamily={mono}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              #{p.positie}
            </text>
          </g>
        );
      })}

      <text
        x={padL - 44}
        y={padT + innerH / 2}
        textAnchor="middle"
        transform={`rotate(-90 ${padL - 44} ${padT + innerH / 2})`}
        fill="var(--color-vzc-muted)"
        fontSize={10}
        letterSpacing="0.12em"
        style={{ textTransform: "uppercase" }}
      >
        positie
      </text>
    </svg>
  );
}

function bepaalYTicks(min: number, max: number): number[] {
  if (max - min <= 1) return [min, max];
  const ruwStap = (max - min) / 4;
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
