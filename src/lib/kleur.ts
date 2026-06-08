// Heatmap-ramp groen -> geel -> rood. p = 0 (snel / vooraan in het veld) -> 1
// (langzaam / achteraan). Naast de kleur toont elke cel altijd het rangnummer
// als redundant kanaal, zodat de tabel ook in grijswaarden leesbaar blijft.

type RGB = [number, number, number];

const STOPS: [number, RGB][] = [
  [0.0, [99, 190, 123]], // #63be7b groen = snel
  [0.5, [255, 235, 132]], // #ffeb84 geel = midden
  [1.0, [248, 105, 107]], // #f8696b rood = langzaam
];

export function heatmapKleur(p: number, alpha = 0.78): string {
  const t = Math.max(0, Math.min(1, p));
  let lo = STOPS[0];
  let hi = STOPS[STOPS.length - 1];
  for (let i = 0; i < STOPS.length - 1; i++) {
    if (t >= STOPS[i][0] && t <= STOPS[i + 1][0]) {
      lo = STOPS[i];
      hi = STOPS[i + 1];
      break;
    }
  }
  const span = hi[0] - lo[0] || 1;
  const k = (t - lo[0]) / span;
  const r = Math.round(lo[1][0] + (hi[1][0] - lo[1][0]) * k);
  const g = Math.round(lo[1][1] + (hi[1][1] - lo[1][1]) * k);
  const b = Math.round(lo[1][2] + (hi[1][2] - lo[1][2]) * k);
  return `rgb(${r} ${g} ${b} / ${alpha})`;
}

function interpRGB(p: number): RGB {
  const t = Math.max(0, Math.min(1, p));
  let lo = STOPS[0];
  let hi = STOPS[STOPS.length - 1];
  for (let i = 0; i < STOPS.length - 1; i++) {
    if (t >= STOPS[i][0] && t <= STOPS[i + 1][0]) {
      lo = STOPS[i];
      hi = STOPS[i + 1];
      break;
    }
  }
  const span = hi[0] - lo[0] || 1;
  const k = (t - lo[0]) / span;
  return [
    lo[1][0] + (hi[1][0] - lo[1][0]) * k,
    lo[1][1] + (hi[1][1] - lo[1][1]) * k,
    lo[1][2] + (hi[1][2] - lo[1][2]) * k,
  ];
}

// Leesbare tekstkleur bovenop een heatmap-cel. Berekent de composiet-luminantie
// (de cel ligt met alpha over wit/papier) en kiest wit op de donkere blauwe
// kant, donkere inkt op de lichte/amber kant. Zo blijft het rangnummer altijd
// leesbaar — ook het redundante, kleurenblind-veilige kanaal.
export function heatmapTekstKleur(p: number, alpha = 0.78): string {
  const [r, g, b] = interpRGB(p).map((c) => c * alpha + 255 * (1 - alpha));
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum < 0.55 ? "#ffffff" : "var(--color-vzc-ink)";
}

// Legenda-stops voor de "snel -> langzaam" swatch-strip.
export const HEAT_LEGENDA: { p: number; label: string }[] = [
  { p: 0, label: "snelste" },
  { p: 0.5, label: "midden" },
  { p: 1, label: "langzaamste" },
];
