import { SEGMENT_LABELS } from "@/lib/data";
import { heatmapKleur, heatmapTekstKleur, HEAT_LEGENDA } from "@/lib/kleur";
import type { WedstrijdVolledig, SegmentSleutel } from "@/lib/types";

// Race-DNA: een strip van vijf segment-chips (Zwem/T1/Fiets/T2/Loop). Elke chip
// is gekleurd met de heatmap-ramp op basis van de GEMIDDELDE positie-in-het-veld
// van de VZC-atleten in dat segment. De gemiddelde rang staat altijd als getal
// (.num) in de chip, zodat de informatie ook in grijswaarden leesbaar blijft.
// Server component — geen state.

const SEGMENTEN: { key: SegmentSleutel; kort: string }[] = [
  { key: "zwem", kort: "Zwem" },
  { key: "t1", kort: "T1" },
  { key: "fiets", kort: "Fiets" },
  { key: "t2", kort: "T2" },
  { key: "loop", kort: "Loop" },
];

type SegmentDna = {
  key: SegmentSleutel;
  kort: string;
  gemRang: number | null; // gemiddelde positie-in-veld van de VZC-atleten
  veld: number; // aantal geklasseerde deelnemers in dit segment
  p: number | null; // [0..1] genormaliseerd, 0 = snelste
};

export default function RaceDNA({ wedstrijd }: { wedstrijd: WedstrijdVolledig }) {
  const vzc = wedstrijd.uitslagen.filter((u) => u.isVzc);
  if (vzc.length === 0) return null;

  // Veldgrootte per segment = aantal deelnemers met een geldige segmentrang.
  const veldPerSegment: Record<SegmentSleutel, number> = {
    zwem: 0,
    t1: 0,
    fiets: 0,
    t2: 0,
    loop: 0,
  };
  for (const u of wedstrijd.uitslagen) {
    for (const { key } of SEGMENTEN) {
      if (u.rankPerSegment[key] !== null) veldPerSegment[key] += 1;
    }
  }

  const dna: SegmentDna[] = SEGMENTEN.map(({ key, kort }) => {
    const rangen = vzc
      .map((u) => u.rankPerSegment[key])
      .filter((r): r is number => r !== null);
    const veld = veldPerSegment[key];
    if (rangen.length === 0 || veld < 1) {
      return { key, kort, gemRang: null, veld, p: null };
    }
    const gemRang = rangen.reduce((s, r) => s + r, 0) / rangen.length;
    const p = veld > 1 ? (gemRang - 1) / (veld - 1) : 0;
    return { key, kort, gemRang, veld, p: Math.max(0, Math.min(1, p)) };
  });

  const heeftData = dna.some((d) => d.p !== null);
  if (!heeftData) return null;

  return (
    <section className="space-y-3" aria-label="Race-DNA: gemiddelde VZC-positie per segment">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Race-DNA</span>
          <p className="mt-1 max-w-xl text-xs text-[color:var(--color-vzc-muted)]">
            Gemiddelde positie van de VZC-atleten binnen het veld, per segment. Groen = sterk
            (vooraan), rood = zwakker (achteraan). Het getal is de gemiddelde rang.
          </p>
        </div>
        <div className="heat-legend gap-2 text-[11px] text-[color:var(--color-vzc-muted)]">
          {HEAT_LEGENDA.map((stop) => (
            <span key={stop.label} className="inline-flex items-center gap-1">
              <span
                className="swatch"
                style={{ backgroundColor: heatmapKleur(stop.p) }}
                aria-hidden
              />
              {stop.label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {dna.map((d) => {
          const heeft = d.p !== null && d.gemRang !== null;
          const achtergrond = heeft ? heatmapKleur(d.p as number) : "var(--color-vzc-blue-50)";
          // Tekstkleur op basis van composiet-luminantie (contrast-veilig).
          const lichteTekst = heeft && heatmapTekstKleur(d.p as number) === "#ffffff";
          return (
            <div
              key={d.key}
              className="flex flex-col items-center justify-center rounded-xl border border-[color:var(--color-vzc-line)] px-2 py-3 text-center"
              style={{ backgroundColor: achtergrond }}
              title={`${SEGMENT_LABELS[d.key]} — gemiddelde VZC-positie ${
                heeft ? `${(d.gemRang as number).toFixed(1)} van ${d.veld}` : "onbekend"
              }`}
            >
              <span
                className="text-[0.66rem] font-semibold uppercase tracking-[0.1em]"
                style={{
                  color: lichteTekst
                    ? "rgba(255,255,255,0.85)"
                    : "var(--color-vzc-ink-soft)",
                }}
              >
                {d.kort}
              </span>
              <span
                className="num mt-1 text-xl font-semibold leading-none"
                style={{ color: lichteTekst ? "#ffffff" : "var(--color-vzc-ink)" }}
              >
                {heeft ? (d.gemRang as number).toFixed(1) : "—"}
              </span>
              <span
                className="num mt-0.5 text-[10px]"
                style={{
                  color: lichteTekst ? "rgba(255,255,255,0.75)" : "var(--color-vzc-muted)",
                }}
              >
                {heeft ? `van ${d.veld}` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
