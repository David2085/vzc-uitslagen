import fs from "node:fs";
import path from "node:path";
import type {
  AtleetUitslag,
  CumulatieveTijden,
  SegmentSleutel,
  SegmentTijden,
  Uitslag,
  Wedstrijd,
  WedstrijdBestand,
  WedstrijdVolledig,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data", "wedstrijden");

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function atleetSlug(naam: string, club: string): string {
  return `${slugify(naam)}__${slugify(club)}`;
}

export function ontleedAtleetSlug(slug: string): { naamSlug: string; clubSlug: string } | null {
  const delen = slug.split("__");
  if (delen.length !== 2) return null;
  return { naamSlug: delen[0], clubSlug: delen[1] };
}

export function parseTijd(input: string | null | undefined): number | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.toUpperCase() === "DNF") return null;
  const stukken = trimmed.split(":").map((s) => Number(s));
  if (stukken.some((n) => Number.isNaN(n))) return null;
  if (stukken.length === 3) {
    const [u, m, s] = stukken;
    return u * 3600 + m * 60 + s;
  }
  if (stukken.length === 2) {
    const [m, s] = stukken;
    return m * 60 + s;
  }
  return null;
}

export function formatSeconden(sec: number | null): string {
  if (sec === null || Number.isNaN(sec)) return "—";
  const teken = sec < 0 ? "-" : "";
  const abs = Math.abs(sec);
  const u = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = Math.round(abs % 60);
  if (u > 0) {
    return `${teken}${u}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${teken}${m}:${s.toString().padStart(2, "0")}`;
}

export function formatVerschil(sec: number | null): string {
  if (sec === null) return "—";
  const teken = sec < 0 ? "−" : "+";
  const abs = Math.abs(sec);
  const m = Math.floor(abs / 60);
  const s = Math.round(abs % 60);
  if (m === 0) return `${teken}${s}s`;
  return `${teken}${m}:${s.toString().padStart(2, "0")}`;
}

function berekenSegmenten(uitslag: Uitslag): {
  splits: SegmentTijden;
  cumulatief: CumulatieveTijden;
} {
  const swim = parseTijd(uitslag.splits.swim_split);
  const t1Cum = parseTijd(uitslag.splits.t1_cumulatief);
  const bikeCum = parseTijd(uitslag.splits.bike_cumulatief);
  const t2Cum = parseTijd(uitslag.splits.t2_cumulatief);
  const eind = parseTijd(uitslag.splits.eindtijd);

  const naZwem = swim;
  const t1 = swim !== null && t1Cum !== null ? t1Cum - swim : null;
  const fiets = t1Cum !== null && bikeCum !== null ? bikeCum - t1Cum : null;
  const t2 = bikeCum !== null && t2Cum !== null ? t2Cum - bikeCum : null;
  const loop = t2Cum !== null && eind !== null ? eind - t2Cum : null;

  return {
    splits: {
      zwem: swim,
      t1,
      fiets,
      t2,
      loop,
      totaal: eind,
    },
    cumulatief: {
      na_zwem: naZwem,
      na_t1: t1Cum,
      na_fiets: bikeCum,
      na_t2: t2Cum,
      eindtijd: eind,
    },
  };
}

function bestandsNaarSlug(bestand: string): string {
  return bestand.replace(/\.json$/i, "");
}

function leesBestand(bestandsnaam: string): WedstrijdBestand {
  const volledigPad = path.join(DATA_DIR, bestandsnaam);
  const ruw = fs.readFileSync(volledigPad, "utf-8");
  const parsed = JSON.parse(ruw) as WedstrijdBestand;
  if (!parsed.wedstrijd || !Array.isArray(parsed.uitslagen)) {
    throw new Error(`Ongeldig wedstrijdbestand: ${bestandsnaam}`);
  }
  return parsed;
}

function laadAlleBestanden(): { slug: string; data: WedstrijdBestand }[] {
  if (!fs.existsSync(DATA_DIR)) return [];
  const bestanden = fs
    .readdirSync(DATA_DIR)
    .filter((b) => b.toLowerCase().endsWith(".json"))
    .sort();
  return bestanden.map((bestand) => ({
    slug: bestandsNaarSlug(bestand),
    data: leesBestand(bestand),
  }));
}

function isVzcUitslag(club: string, vzcTeams: string[]): boolean {
  const c = club.trim().toLowerCase();
  return vzcTeams.some((t) => t.trim().toLowerCase() === c);
}

function rankPerSegmentVoor(
  uitslagen: AtleetUitslag[],
): (atleet: AtleetUitslag) => Record<SegmentSleutel, number | null> {
  const segmenten: SegmentSleutel[] = ["zwem", "t1", "fiets", "t2", "loop"];
  const gesorteerd: Record<SegmentSleutel, { slug: string; tijd: number }[]> = {
    zwem: [],
    t1: [],
    fiets: [],
    t2: [],
    loop: [],
  };
  for (const u of uitslagen) {
    for (const seg of segmenten) {
      const tijd = u.splits[seg];
      if (tijd !== null && tijd > 0) {
        gesorteerd[seg].push({ slug: u.atleetSlug + "::" + u.wedstrijdSlug, tijd });
      }
    }
  }
  for (const seg of segmenten) {
    gesorteerd[seg].sort((a, b) => a.tijd - b.tijd);
  }
  return (atleet) => {
    const sleutel = atleet.atleetSlug + "::" + atleet.wedstrijdSlug;
    const out: Record<SegmentSleutel, number | null> = {
      zwem: null,
      t1: null,
      fiets: null,
      t2: null,
      loop: null,
    };
    for (const seg of segmenten) {
      const idx = gesorteerd[seg].findIndex((x) => x.slug === sleutel);
      out[seg] = idx === -1 ? null : idx + 1;
    }
    return out;
  };
}

function bouwAtletenVoorWedstrijd(slug: string, data: WedstrijdBestand): AtleetUitslag[] {
  const tussen: Omit<AtleetUitslag, "rankPerSegment">[] = data.uitslagen.map((u) => {
    const { splits, cumulatief } = berekenSegmenten(u);
    return {
      wedstrijdSlug: slug,
      wedstrijd: data.wedstrijd,
      rank: u.rank,
      bib: u.bib,
      naam: u.naam,
      club: u.club,
      isVzc: isVzcUitslag(u.club, data.wedstrijd.vzc_teams),
      atleetSlug: atleetSlug(u.naam, u.club),
      splits,
      cumulatief,
    };
  });
  const placeholder = tussen.map((t) => ({
    ...t,
    rankPerSegment: { zwem: null, t1: null, fiets: null, t2: null, loop: null } as Record<
      SegmentSleutel,
      number | null
    >,
  }));
  const bepaal = rankPerSegmentVoor(placeholder);
  return placeholder.map((a) => ({ ...a, rankPerSegment: bepaal(a) }));
}

let _cache: WedstrijdVolledig[] | null = null;

export function alleWedstrijden(): WedstrijdVolledig[] {
  if (_cache) return _cache;
  const ruwe = laadAlleBestanden().filter(
    (r) => r.data.wedstrijd.datum.startsWith("2026"),
  );
  _cache = ruwe.map((r) => ({
    slug: r.slug,
    wedstrijd: r.data.wedstrijd,
    uitslagen: bouwAtletenVoorWedstrijd(r.slug, r.data),
  }));
  _cache.sort((a, b) => a.wedstrijd.datum.localeCompare(b.wedstrijd.datum));
  return _cache;
}

export function wedstrijdBijSlug(slug: string): WedstrijdVolledig | null {
  return alleWedstrijden().find((w) => w.slug === slug) ?? null;
}

export type VzcTeam = {
  naam: string;
  slug: string;
  divisie: string;
  poule: string | null;
  geslacht: "mannen" | "vrouwen";
  wedstrijdSlugs: string[];
};

export function alleVzcTeams(): VzcTeam[] {
  const map = new Map<string, VzcTeam>();
  for (const w of alleWedstrijden()) {
    for (const team of w.wedstrijd.vzc_teams) {
      const sleutel = `${team}::${w.wedstrijd.divisie}::${w.wedstrijd.poule ?? ""}::${w.wedstrijd.geslacht}`;
      const slug = slugify(`${team}-${w.wedstrijd.divisie}-${w.wedstrijd.poule ?? "landelijk"}-${w.wedstrijd.geslacht}`);
      const bestaande = map.get(sleutel);
      if (bestaande) {
        bestaande.wedstrijdSlugs.push(w.slug);
      } else {
        map.set(sleutel, {
          naam: team,
          slug,
          divisie: w.wedstrijd.divisie,
          poule: w.wedstrijd.poule,
          geslacht: w.wedstrijd.geslacht,
          wedstrijdSlugs: [w.slug],
        });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.divisie !== b.divisie) return a.divisie.localeCompare(b.divisie);
    if (a.geslacht !== b.geslacht) return a.geslacht.localeCompare(b.geslacht);
    return a.naam.localeCompare(b.naam);
  });
}

export function teamBijSlug(slug: string): VzcTeam | null {
  return alleVzcTeams().find((t) => t.slug === slug) ?? null;
}

export type AtleetProfiel = {
  slug: string;
  naam: string;
  club: string;
  isVzc: boolean;
  resultaten: AtleetUitslag[];
};

export function alleAtleten(): AtleetProfiel[] {
  const map = new Map<string, AtleetProfiel>();
  for (const w of alleWedstrijden()) {
    for (const r of w.uitslagen) {
      const bestaand = map.get(r.atleetSlug);
      if (bestaand) {
        bestaand.resultaten.push(r);
        bestaand.isVzc = bestaand.isVzc || r.isVzc;
      } else {
        map.set(r.atleetSlug, {
          slug: r.atleetSlug,
          naam: r.naam,
          club: r.club,
          isVzc: r.isVzc,
          resultaten: [r],
        });
      }
    }
  }
  for (const p of map.values()) {
    p.resultaten.sort((a, b) => a.wedstrijd.datum.localeCompare(b.wedstrijd.datum));
  }
  return Array.from(map.values()).sort((a, b) => a.naam.localeCompare(b.naam));
}

export function atleetBijSlug(slug: string): AtleetProfiel | null {
  return alleAtleten().find((a) => a.slug === slug) ?? null;
}

export const SEGMENT_LABELS: Record<SegmentSleutel, string> = {
  zwem: "Zwemmen",
  t1: "T1",
  fiets: "Fietsen",
  t2: "T2",
  loop: "Lopen",
};

export type Baseline = "mediaan" | "top3" | "podium" | "team";

export const BASELINE_LABELS: Record<Baseline, string> = {
  mediaan: "Mediaan poule",
  top3: "Gemiddelde top-3",
  podium: "Winnaar",
  team: "Beste VZC-tijd",
};

export function baselineTijd(
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
  if (baseline === "podium") {
    return opTijd[0].tijd;
  }
  if (baseline === "top3") {
    const top = opTijd.slice(0, Math.min(3, opTijd.length));
    return top.reduce((s, x) => s + x.tijd, 0) / top.length;
  }
  if (baseline === "mediaan") {
    const m = Math.floor(opTijd.length / 2);
    return opTijd.length % 2 === 0
      ? (opTijd[m - 1].tijd + opTijd[m].tijd) / 2
      : opTijd[m].tijd;
  }
  if (baseline === "team") {
    const eigenTeams = atleet.wedstrijd.vzc_teams;
    const vzcInWedstrijd = opTijd.filter((x) =>
      eigenTeams.some((t) => t.toLowerCase() === x.a.club.toLowerCase()),
    );
    if (vzcInWedstrijd.length === 0) return null;
    return vzcInWedstrijd[0].tijd;
  }
  return null;
}
