import fs from "node:fs";
import path from "node:path";
import type {
  AtleetUitslag,
  CheckpointSleutel,
  CumulatieveTijden,
  DivisieKlassement,
  Geslacht,
  SegmentSleutel,
  SegmentTijden,
  SeizoensTeamRij,
  TeamResultaat,
  TeamSeizoensRace,
  TeamSeizoensStand,
  Teamformat,
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

function tijdslotFallback(w: Wedstrijd, slug: string): string {
  const haystack = `${w.naam} ${slug}`.toLowerCase();
  const isKwal = /kwalificatie/.test(haystack);
  const isFinale = /finale/.test(haystack);

  let uur = 10;
  if (isKwal) uur = 8;
  else if (isFinale) uur = 14;

  const d = w.divisie.toLowerCase();
  let divisieRang = 4;
  if (d.includes("3e")) divisieRang = 0;
  else if (d.includes("2e")) divisieRang = 1;
  else if (d.includes("1e")) divisieRang = 2;
  else if (d.includes("eredivisie")) divisieRang = 3;

  const geslachtOffset = w.geslacht === "vrouwen" ? 0 : 5;
  const minuten = divisieRang * 10 + geslachtOffset;

  return `${String(uur).padStart(2, "0")}:${String(minuten).padStart(2, "0")}`;
}

export function wedstrijdSortKey(w: Wedstrijd, slug: string): string {
  const tijd = w.starttijd && /^\d{2}:\d{2}$/.test(w.starttijd)
    ? w.starttijd
    : tijdslotFallback(w, slug);
  return `${w.datum}T${tijd}`;
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

function cumulatiefRankVoor(
  uitslagen: AtleetUitslag[],
): (atleet: AtleetUitslag) => Record<CheckpointSleutel, number | null> {
  const punten: CheckpointSleutel[] = ["na_zwem", "na_t1", "na_fiets", "na_t2", "eindtijd"];
  const gesorteerd: Record<CheckpointSleutel, { sleutel: string; tijd: number }[]> = {
    na_zwem: [],
    na_t1: [],
    na_fiets: [],
    na_t2: [],
    eindtijd: [],
  };
  for (const u of uitslagen) {
    for (const punt of punten) {
      const tijd = u.cumulatief[punt];
      if (tijd !== null && tijd > 0) {
        gesorteerd[punt].push({ sleutel: u.atleetSlug + "::" + u.wedstrijdSlug, tijd });
      }
    }
  }
  for (const punt of punten) {
    gesorteerd[punt].sort((a, b) => a.tijd - b.tijd);
  }
  return (atleet) => {
    const sleutel = atleet.atleetSlug + "::" + atleet.wedstrijdSlug;
    const out: Record<CheckpointSleutel, number | null> = {
      na_zwem: null,
      na_t1: null,
      na_fiets: null,
      na_t2: null,
      eindtijd: null,
    };
    for (const punt of punten) {
      const idx = gesorteerd[punt].findIndex((x) => x.sleutel === sleutel);
      out[punt] = idx === -1 ? null : idx + 1;
    }
    return out;
  };
}

function bouwAtletenVoorWedstrijd(slug: string, data: WedstrijdBestand): AtleetUitslag[] {
  const tussen: Omit<AtleetUitslag, "rankPerSegment" | "cumulatiefRank">[] = data.uitslagen.map(
    (u) => {
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
    },
  );
  const placeholder = tussen.map((t) => ({
    ...t,
    rankPerSegment: { zwem: null, t1: null, fiets: null, t2: null, loop: null } as Record<
      SegmentSleutel,
      number | null
    >,
    cumulatiefRank: {
      na_zwem: null,
      na_t1: null,
      na_fiets: null,
      na_t2: null,
      eindtijd: null,
    } as Record<CheckpointSleutel, number | null>,
  }));
  const bepaal = rankPerSegmentVoor(placeholder);
  const bepaalCum = cumulatiefRankVoor(placeholder);
  return placeholder.map((a) => ({
    ...a,
    rankPerSegment: bepaal(a),
    cumulatiefRank: bepaalCum(a),
  }));
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
  _cache.sort((a, b) =>
    wedstrijdSortKey(b.wedstrijd, b.slug).localeCompare(
      wedstrijdSortKey(a.wedstrijd, a.slug),
    ),
  );
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
    p.resultaten.sort((a, b) =>
      wedstrijdSortKey(b.wedstrijd, b.wedstrijdSlug).localeCompare(
        wedstrijdSortKey(a.wedstrijd, a.wedstrijdSlug),
      ),
    );
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

export const PUNTEN_SCHEMAS: Record<string, number[]> = {
  ntb_standaard: [25, 22, 20, 18, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
};

const DEFAULT_PUNTENSCHEMA = "ntb_standaard";

export function puntenVoorRank(rank: number, schemaKey?: string): number {
  const schema = PUNTEN_SCHEMAS[schemaKey ?? DEFAULT_PUNTENSCHEMA] ?? PUNTEN_SCHEMAS[DEFAULT_PUNTENSCHEMA];
  return schema[rank - 1] ?? 0;
}

export function teamformatLabel(format: Teamformat): string {
  if (format.type === "ttt_nde_man") {
    return `Tijd van de ${format.n}e finisher per ploeg (TTT)`;
  }
  return `Som van de ${format.n} snelste finishers per ploeg`;
}

export function teamuitslagVoorWedstrijd(
  w: WedstrijdVolledig,
): { resultaten: TeamResultaat[]; ongeldig: { club: string; finishers: number }[] } | null {
  const format = w.wedstrijd.teamformat;
  if (!format) return null;

  const minFinishers = format.min_finishers ?? format.n;
  const perClub = new Map<string, AtleetUitslag[]>();

  for (const u of w.uitslagen) {
    if (u.splits.totaal === null || u.splits.totaal <= 0) continue;
    if (u.rank === "DNF") continue;
    const lijst = perClub.get(u.club) ?? [];
    lijst.push(u);
    perClub.set(u.club, lijst);
  }

  const ongeldig: { club: string; finishers: number }[] = [];
  const ruwe: { club: string; teamtijd: number; tellendeAtleten: AtleetUitslag[]; finishersInTeam: number }[] = [];

  for (const [club, atleten] of perClub.entries()) {
    const opTijd = [...atleten].sort(
      (a, b) => (a.splits.totaal as number) - (b.splits.totaal as number),
    );
    if (opTijd.length < minFinishers) {
      ongeldig.push({ club, finishers: opTijd.length });
      continue;
    }
    if (format.type === "ttt_nde_man") {
      const nde = opTijd[format.n - 1];
      if (!nde || nde.splits.totaal === null) {
        ongeldig.push({ club, finishers: opTijd.length });
        continue;
      }
      ruwe.push({
        club,
        teamtijd: nde.splits.totaal,
        tellendeAtleten: opTijd.slice(0, format.n),
        finishersInTeam: opTijd.length,
      });
    } else {
      const top = opTijd.slice(0, format.n);
      const som = top.reduce((s, a) => s + (a.splits.totaal as number), 0);
      ruwe.push({
        club,
        teamtijd: som,
        tellendeAtleten: top,
        finishersInTeam: opTijd.length,
      });
    }
  }

  ruwe.sort((a, b) => a.teamtijd - b.teamtijd);
  const schema = w.wedstrijd.puntenschema ?? DEFAULT_PUNTENSCHEMA;
  const resultaten: TeamResultaat[] = ruwe.map((r, i) => ({
    rank: i + 1,
    club: r.club,
    isVzc: isVzcUitslag(r.club, w.wedstrijd.vzc_teams),
    teamtijd: r.teamtijd,
    tellendeAtleten: r.tellendeAtleten,
    finishersInTeam: r.finishersInTeam,
    punten: puntenVoorRank(i + 1, schema),
  }));

  ongeldig.sort((a, b) => a.club.localeCompare(b.club));
  return { resultaten, ongeldig };
}

export type PouleSleutel = {
  divisie: string;
  poule: string | null;
  geslacht: Geslacht;
};

export function vzcPoules(): PouleSleutel[] {
  const map = new Map<string, PouleSleutel>();
  for (const team of alleVzcTeams()) {
    const sleutel = `${team.divisie}::${team.poule ?? ""}::${team.geslacht}`;
    if (!map.has(sleutel)) {
      map.set(sleutel, {
        divisie: team.divisie,
        poule: team.poule,
        geslacht: team.geslacht,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.divisie !== b.divisie) return a.divisie.localeCompare(b.divisie);
    if (a.geslacht !== b.geslacht) return a.geslacht.localeCompare(b.geslacht);
    return (a.poule ?? "").localeCompare(b.poule ?? "");
  });
}

export function pouleSlug(p: PouleSleutel): string {
  return slugify(`${p.divisie}-${p.poule ?? "landelijk"}-${p.geslacht}`);
}

export function teltVoorKlassement(slug: string): boolean {
  return !/kwalificatie/i.test(slug);
}

export function divisieKlassement(p: PouleSleutel): DivisieKlassement {
  const wedstrijdenInPoule = alleWedstrijden().filter(
    (w) =>
      w.wedstrijd.divisie === p.divisie &&
      (w.wedstrijd.poule ?? null) === (p.poule ?? null) &&
      w.wedstrijd.geslacht === p.geslacht &&
      teltVoorKlassement(w.slug),
  );

  const oplopend = [...wedstrijdenInPoule].sort((a, b) =>
    wedstrijdSortKey(a.wedstrijd, a.slug).localeCompare(
      wedstrijdSortKey(b.wedstrijd, b.slug),
    ),
  );

  const vzcSet = new Set<string>();
  for (const w of oplopend) {
    for (const t of w.wedstrijd.vzc_teams) vzcSet.add(t);
  }

  const perClub = new Map<
    string,
    { totaalPunten: number; aantal: number; resultaten: Record<string, { rank: number; punten: number } | null> }
  >();

  for (const w of oplopend) {
    const uitslag = teamuitslagVoorWedstrijd(w);
    if (!uitslag) continue;
    for (const r of uitslag.resultaten) {
      const huidige = perClub.get(r.club) ?? {
        totaalPunten: 0,
        aantal: 0,
        resultaten: {} as Record<string, { rank: number; punten: number } | null>,
      };
      huidige.totaalPunten += r.punten;
      huidige.aantal += 1;
      huidige.resultaten[w.slug] = { rank: r.rank, punten: r.punten };
      perClub.set(r.club, huidige);
    }
  }

  const teams: SeizoensTeamRij[] = Array.from(perClub.entries())
    .map(([club, agg]) => {
      const perWedstrijd: Record<string, { rank: number; punten: number } | null> = {};
      for (const w of oplopend) {
        perWedstrijd[w.slug] = agg.resultaten[w.slug] ?? null;
      }
      return {
        club,
        isVzc: isVzcUitslag(club, Array.from(vzcSet)),
        totaalPunten: agg.totaalPunten,
        aantalWedstrijden: agg.aantal,
        perWedstrijd,
      };
    })
    .sort((a, b) => {
      if (b.totaalPunten !== a.totaalPunten) return b.totaalPunten - a.totaalPunten;
      return a.club.localeCompare(b.club);
    });

  return {
    divisie: p.divisie,
    poule: p.poule,
    geslacht: p.geslacht,
    vzcTeams: Array.from(vzcSet),
    wedstrijden: oplopend.map((w) => ({
      slug: w.slug,
      naam: w.wedstrijd.naam,
      datum: w.wedstrijd.datum,
      locatie: w.wedstrijd.locatie,
    })),
    teams,
  };
}

export function teamSeizoensStand(team: VzcTeam): TeamSeizoensStand {
  const races: TeamSeizoensRace[] = [];
  for (const w of alleWedstrijden()) {
    if (w.wedstrijd.divisie !== team.divisie) continue;
    if ((w.wedstrijd.poule ?? null) !== (team.poule ?? null)) continue;
    if (w.wedstrijd.geslacht !== team.geslacht) continue;
    if (!teltVoorKlassement(w.slug)) continue;
    const teamuitslag = teamuitslagVoorWedstrijd(w);
    if (!teamuitslag) continue;
    const eigen = teamuitslag.resultaten.find(
      (r) => r.club.toLowerCase() === team.naam.toLowerCase(),
    );
    if (!eigen) continue;
    races.push({
      wedstrijdSlug: w.slug,
      wedstrijdNaam: w.wedstrijd.naam,
      datum: w.wedstrijd.datum,
      rank: eigen.rank,
      punten: eigen.punten,
      teamtijd: eigen.teamtijd,
    });
  }
  races.sort((a, b) => a.datum.localeCompare(b.datum));
  return {
    teamSlug: team.slug,
    totaalPunten: races.reduce((s, r) => s + r.punten, 0),
    perWedstrijd: races,
  };
}
