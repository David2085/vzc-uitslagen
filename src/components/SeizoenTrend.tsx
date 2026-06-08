import Reveal from "@/components/ui/Reveal";
import { seizoensSegmentTrend, SEGMENT_LABELS, type AtleetProfiel } from "@/lib/data";
import type { SegmentTrend } from "@/lib/types";

// Seizoens-tempo per discipline (zwem/fiets/loop) als mini-sparkline.
// Server component, hand-getekende SVG. x = races chronologisch, y = tempo.
// Toont een grote huidige .num waarde + unit en een delta t.o.v. het
// seizoensmediaan-tempo (fiets: hoger is beter, dus delta omgedraaid).

function tempoLabel(segment: SegmentTrend["segment"]): string {
  if (segment === "zwem") return "Zwemtempo";
  if (segment === "fiets") return "Fietssnelheid";
  return "Looptempo";
}

// Voor zwem/loop (sec) tonen we mm:ss, voor fiets (km/u) één decimaal.
function formatTempoWaarde(waarde: number, hogerIsBeter: boolean): string {
  if (hogerIsBeter) return waarde.toFixed(1);
  const m = Math.floor(waarde / 60);
  const s = Math.round(waarde % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Delta van de huidige (laatste) tempo t.o.v. mediaan, in "goede richting".
// Lager tempo = sneller (zwem/loop); hoger = sneller (fiets). We normaliseren
// naar: positief = beter (var(--pos)), negatief = slechter (var(--neg)).
function deltaInfo(
  laatste: number,
  mediaan: number,
  hogerIsBeter: boolean,
): { tekst: string; goed: boolean; neutraal: boolean } {
  const ruw = laatste - mediaan; // >0 betekent trager voor zwem/loop, sneller voor fiets
  if (Math.abs(ruw) < (hogerIsBeter ? 0.05 : 0.5)) {
    return { tekst: "op mediaan", goed: false, neutraal: true };
  }
  const beter = hogerIsBeter ? ruw > 0 : ruw < 0;
  if (hogerIsBeter) {
    const teken = ruw > 0 ? "+" : "−";
    return { tekst: `${teken}${Math.abs(ruw).toFixed(1)} km/u`, goed: beter, neutraal: false };
  }
  const abs = Math.abs(ruw);
  const m = Math.floor(abs / 60);
  const s = Math.round(abs % 60);
  const tijd = m === 0 ? `${s}s` : `${m}:${s.toString().padStart(2, "0")}`;
  const teken = ruw < 0 ? "−" : "+"; // sneller = minder tijd = −
  return { tekst: `${teken}${tijd}`, goed: beter, neutraal: false };
}

function Sparkline({ trend }: { trend: SegmentTrend }) {
  const metTempo = trend.punten.filter((p) => p.tempo !== null);
  const enkel = metTempo.length <= 1;

  const width = 220;
  const height = 64;
  const padX = 6;
  const padY = 10;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const waarden = metTempo.map((p) => p.tempo!.waarde);
  const min = Math.min(...waarden);
  const max = Math.max(...waarden);
  const span = max - min || 1;

  // y: voor hogerIsBeter (fiets) zetten we hoger = bovenaan; voor tempo (sec)
  // zetten we sneller (lager) = bovenaan. In beide gevallen: "beter = boven".
  const yFor = (w: number) => {
    const genorm = (w - min) / span; // 0..1
    const goedFractie = trend.hogerIsBeter ? genorm : 1 - genorm;
    return padY + (1 - goedFractie) * innerH;
  };
  const xFor = (i: number) =>
    metTempo.length === 1 ? width / 2 : padX + (i / (metTempo.length - 1)) * innerW;

  const punten = metTempo.map((p, i) => ({ x: xFor(i), y: yFor(p.tempo!.waarde) }));
  const polyline = punten.map((p) => `${p.x},${p.y}`).join(" ");

  const mediaanY = trend.mediaanTempo !== null ? yFor(trend.mediaanTempo) : null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-16 w-full"
      role="img"
      aria-label={`${tempoLabel(trend.segment)} over het seizoen`}
      preserveAspectRatio="none"
    >
      {mediaanY !== null && !enkel ? (
        <line
          x1={padX}
          y1={mediaanY}
          x2={width - padX}
          y2={mediaanY}
          stroke="var(--color-vzc-ink-faint)"
          strokeWidth={1}
          strokeDasharray="3 3"
          strokeOpacity={0.7}
        />
      ) : null}

      {!enkel ? (
        <polyline
          points={polyline}
          fill="none"
          stroke="var(--color-vzc-blue)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : null}

      {punten.map((p, i) => {
        const isLaatste = i === punten.length - 1;
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={isLaatste ? 3.5 : 2.5}
            fill={isLaatste ? "var(--color-vzc-blue-dark)" : "var(--color-vzc-paper)"}
            stroke="var(--color-vzc-blue)"
            strokeWidth={1.5}
          />
        );
      })}
    </svg>
  );
}

function TrendKaart({ trend }: { trend: SegmentTrend }) {
  const metTempo = trend.punten.filter((p) => p.tempo !== null);
  const laatste = metTempo[metTempo.length - 1]?.tempo ?? null;
  const enkel = metTempo.length <= 1;

  return (
    <div className="vzc-card flex flex-col gap-3 p-4">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow">{tempoLabel(trend.segment)}</span>
        <span className="text-[11px] text-[color:var(--color-vzc-ink-faint)]">
          {SEGMENT_LABELS[trend.segment]}
        </span>
      </div>

      {laatste ? (
        <div className="flex items-end gap-1.5">
          <span className="num text-3xl leading-none text-[color:var(--color-vzc-blue-dark)]">
            {formatTempoWaarde(laatste.waarde, trend.hogerIsBeter)}
          </span>
          <span className="mb-0.5 text-xs font-medium text-[color:var(--color-vzc-muted)]">
            {laatste.eenheid}
          </span>
        </div>
      ) : (
        <span className="num text-3xl leading-none text-[color:var(--color-vzc-ink-faint)]">—</span>
      )}

      {laatste && trend.mediaanTempo !== null && !enkel
        ? (() => {
            const d = deltaInfo(laatste.waarde, trend.mediaanTempo, trend.hogerIsBeter);
            const kleur = d.neutraal
              ? "var(--color-vzc-muted)"
              : d.goed
                ? "var(--color-pos)"
                : "var(--color-neg)";
            const glyph = d.neutraal ? "→" : d.goed ? "▲" : "▼";
            return (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="num font-semibold" style={{ color: kleur }} aria-hidden>
                  {glyph} {d.tekst}
                </span>
                <span className="text-[color:var(--color-vzc-muted)]">vs mediaan</span>
              </div>
            );
          })()
        : (
            <div className="text-xs text-[color:var(--color-vzc-muted)]">
              {enkel ? "Eén race — nog geen trend" : "Geen meting"}
            </div>
          )}

      {laatste ? (
        <Sparkline trend={trend} />
      ) : (
        <div className="h-16" aria-hidden />
      )}
    </div>
  );
}

export default function SeizoenTrend({ atleet }: { atleet: AtleetProfiel }) {
  const trends = seizoensSegmentTrend(atleet);
  const heeftIetsTeTonen = trends.some((t) => t.punten.some((p) => p.tempo !== null));
  if (!heeftIetsTeTonen) return null;

  const aantalRaces = atleet.resultaten.length;

  return (
    <Reveal as="section" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <span className="eyebrow">Seizoen 2026</span>
          <h2 className="font-display text-2xl text-[color:var(--color-vzc-blue-dark)]">
            Tempo door het seizoen
          </h2>
        </div>
        <p className="max-w-xs text-xs text-[color:var(--color-vzc-muted)]">
          {aantalRaces === 1
            ? "Eén race gereden — de waarden hieronder zijn een momentopname."
            : "Tempo per discipline over de races. De stippellijn is het seizoensmediaan; ▲ boven mediaan, ▼ eronder."}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {trends.map((t) => (
          <TrendKaart key={t.segment} trend={t} />
        ))}
      </div>
    </Reveal>
  );
}
