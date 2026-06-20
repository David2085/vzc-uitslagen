import fs from "node:fs";
import path from "node:path";
import type {
  Afstanden,
  AtleetUitslag,
  CheckpointSleutel,
  CumulatieveTijden,
  DivisieKlassement,
  Geslacht,
  OfficieelKlassement,
  OfficielePoule,
  OfficieelTeam,
  OfficieelTeamRaceResultaat,
  SegmentSleutel,
  SegmentTrend,
  SegmentTrendPunt,
  TempoInfo,
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
  const c = (club ?? "").trim().toLowerCase();
  if (!c) return false;
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

export function teamformatLabel(format: Teamformat): string {
  if (format.type === "ttt_nde_man") {
    return `Tijd van de ${format.n}e finisher per ploeg (TTT)`;
  }
  return `Som van de beste ${format.n} klasseringen per ploeg (slechtste valt weg)`;
}

// Individuele klassering van een atleet; DNF/DNS = laatste plaats
// (NTB art. 8.3/8.4: laatste plaats op basis van aantal gestarte deelnemers).
function klasseringVan(u: AtleetUitslag, aantalStarters: number): number {
  return typeof u.rank === "number" ? u.rank : aantalStarters;
}

export function teamuitslagVoorWedstrijd(
  w: WedstrijdVolledig,
): { resultaten: TeamResultaat[]; ongeldig: { club: string; finishers: number }[] } | null {
  const format = w.wedstrijd.teamformat;
  if (!format) return null;

  const isTtt = format.type === "ttt_nde_man";
  const aantalStarters = w.uitslagen.length;

  const perClub = new Map<string, AtleetUitslag[]>();
  for (const u of w.uitslagen) {
    // Atleten zonder ploeg (bv. NK-individuelen) tellen niet mee in het
    // team-klassement; ze blijven wel zichtbaar in de individuele uitslag.
    if (!u.club || !u.club.trim()) continue;
    const lijst = perClub.get(u.club) ?? [];
    lijst.push(u);
    perClub.set(u.club, lijst);
  }

  const ongeldig: { club: string; finishers: number }[] = [];
  const ruwe: {
    club: string;
    sorteer: number;
    tiebreak: number;
    klasseringSom: number | null;
    teamtijd: number | null;
    tellendeAtleten: AtleetUitslag[];
    finishersInTeam: number;
  }[] = [];

  for (const [club, atleten] of perClub.entries()) {
    if (isTtt) {
      // Team-wedstrijd (NTB art. 9.2a): klassering volgt de race-uitslag.
      // Teamtijd = tijd van de n-de finisher.
      const finishers = atleten
        .filter((a) => a.rank !== "DNF" && a.splits.totaal !== null)
        .sort((a, b) => (a.splits.totaal as number) - (b.splits.totaal as number));
      const minFinishers = format.min_finishers ?? format.n;
      if (finishers.length < minFinishers) {
        ongeldig.push({ club, finishers: finishers.length });
        continue;
      }
      const teamtijd = finishers[format.n - 1].splits.totaal as number;
      ruwe.push({
        club,
        sorteer: teamtijd,
        tiebreak: 0,
        klasseringSom: null,
        teamtijd,
        tellendeAtleten: finishers.slice(0, format.n),
        finishersInTeam: finishers.length,
      });
    } else {
      // Individuele wedstrijd (NTB art. 9.1): de beste n klasseringen van het
      // team tellen. Een DNF/DNS telt als laatste plaats, en ontbrekende
      // teamleden (team kleiner dan n) worden aangevuld met een laatste plaats.
      // Bij een volledig (vierkoppig) team valt de slechtste klassering zo
      // vanzelf weg.
      if (atleten.length < 2) {
        ongeldig.push({ club, finishers: atleten.length });
        continue;
      }
      const n = format.n;
      const opKlassering = [...atleten].sort(
        (a, b) =>
          klasseringVan(a, aantalStarters) - klasseringVan(b, aantalStarters),
      );
      const placings = opKlassering.map((a) => klasseringVan(a, aantalStarters));
      const tellendePlacings = Array.from(
        { length: n },
        (_, i) => placings[i] ?? aantalStarters,
      );
      const klasseringSom = tellendePlacings.reduce((s, p) => s + p, 0);
      const tellend = opKlassering.slice(0, Math.min(n, opKlassering.length));
      const teamtijd =
        tellend.length === n && tellend.every((a) => a.splits.totaal !== null)
          ? tellend.reduce((s, a) => s + (a.splits.totaal as number), 0)
          : null;
      ruwe.push({
        club,
        sorteer: klasseringSom,
        // Gelijke som: hoogste (laagste getal) weggelaten klassering wint (art. 9.1d).
        tiebreak: placings[n] ?? aantalStarters,
        klasseringSom,
        teamtijd,
        tellendeAtleten: tellend,
        finishersInTeam: atleten.length,
      });
    }
  }

  // Laagste som (resp. teamtijd) eerst. Bij gelijke som wint het team met de
  // hoogste — dus laagste getal — weggelaten klassering (NTB art. 9.1d).
  ruwe.sort((a, b) => a.sorteer - b.sorteer || a.tiebreak - b.tiebreak);

  const resultaten: TeamResultaat[] = ruwe.map((r, i) => ({
    rank: i + 1,
    club: r.club,
    isVzc: isVzcUitslag(r.club, w.wedstrijd.vzc_teams),
    klasseringSom: r.klasseringSom,
    teamtijd: r.teamtijd,
    isTtt,
    tellendeAtleten: r.tellendeAtleten,
    finishersInTeam: r.finishersInTeam,
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
    {
      totaalKlassering: number;
      aantal: number;
      resultaten: Record<string, { teamPlaats: number; klasseringSom: number | null } | null>;
    }
  >();

  for (const w of oplopend) {
    const uitslag = teamuitslagVoorWedstrijd(w);
    if (!uitslag) continue;
    for (const r of uitslag.resultaten) {
      const huidige = perClub.get(r.club) ?? {
        totaalKlassering: 0,
        aantal: 0,
        resultaten: {} as Record<
          string,
          { teamPlaats: number; klasseringSom: number | null } | null
        >,
      };
      // Seizoensstand telt de teamklassering (plaats) per wedstrijd op (art. 10.1a).
      huidige.totaalKlassering += r.rank;
      huidige.aantal += 1;
      huidige.resultaten[w.slug] = { teamPlaats: r.rank, klasseringSom: r.klasseringSom };
      perClub.set(r.club, huidige);
    }
  }

  const teams: SeizoensTeamRij[] = Array.from(perClub.entries())
    .map(([club, agg]) => {
      const perWedstrijd: Record<
        string,
        { teamPlaats: number; klasseringSom: number | null } | null
      > = {};
      for (const w of oplopend) {
        perWedstrijd[w.slug] = agg.resultaten[w.slug] ?? null;
      }
      return {
        club,
        isVzc: isVzcUitslag(club, Array.from(vzcSet)),
        totaalKlassering: agg.totaalKlassering,
        aantalWedstrijden: agg.aantal,
        perWedstrijd,
      };
    })
    // Laagste totaal aan klasseringen wint (NTB art. 10.1a).
    .sort((a, b) => {
      if (a.totaalKlassering !== b.totaalKlassering)
        return a.totaalKlassering - b.totaalKlassering;
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
      teamPlaats: eigen.rank,
      klasseringSom: eigen.klasseringSom,
      teamtijd: eigen.teamtijd,
    });
  }
  races.sort((a, b) => a.datum.localeCompare(b.datum));
  return {
    teamSlug: team.slug,
    totaalKlassering: races.reduce((s, r) => s + r.teamPlaats, 0),
    perWedstrijd: races,
  };
}

// --- Officiele tussenstand (teamcompetities.nl) -----------------------------

let _officieelCache: OfficieelKlassement | null | undefined;

export function officieelKlassement(): OfficieelKlassement | null {
  if (_officieelCache !== undefined) return _officieelCache;
  const pad = path.join(process.cwd(), "data", "klassement.json");
  if (!fs.existsSync(pad)) {
    _officieelCache = null;
    return null;
  }
  _officieelCache = JSON.parse(fs.readFileSync(pad, "utf-8")) as OfficieelKlassement;
  return _officieelCache;
}

export function officielePouleVoorTeam(team: VzcTeam): OfficielePoule | null {
  const k = officieelKlassement();
  if (!k) return null;
  return (
    k.poules.find(
      (p) =>
        p.divisie === team.divisie &&
        (p.poule ?? null) === (team.poule ?? null) &&
        p.geslacht === team.geslacht,
    ) ?? null
  );
}

export function officieelTeamInPoule(
  poule: OfficielePoule,
  team: VzcTeam,
): { team: OfficieelTeam; positie: number } | null {
  const idx = poule.teams.findIndex(
    (t) => slugify(t.club) === slugify(team.naam),
  );
  if (idx === -1) return null;
  return { team: poule.teams[idx], positie: idx + 1 };
}

// Officiele teamuitslag van één wedstrijd (gebruikt voor TTT-races, waar de
// plaats op tijd is bepaald en niet uit de individuele uitslag volgt).
export function officieleTeamuitslagVoorWedstrijd(
  slug: string,
): { resultaten: OfficieelTeamRaceResultaat[]; isTtt: boolean } | null {
  const k = officieelKlassement();
  if (!k) return null;
  for (const p of k.poules) {
    const idx = p.races.findIndex((r) => r.wedstrijdSlug === slug);
    if (idx === -1) continue;
    const resultaten: OfficieelTeamRaceResultaat[] = [];
    for (const t of p.teams) {
      const res = t.perRace[idx];
      if (!res) continue;
      resultaten.push({ club: t.club, isVzc: t.isVzc, plaats: res.plaats, som: res.som });
    }
    resultaten.sort((a, b) => a.plaats - b.plaats);
    return { resultaten, isTtt: p.races[idx].isTtt };
  }
  return null;
}

// --- Tempo (afstand-lookup) ------------------------------------------------

export const AFSTAND_DISTANCES: Record<string, Afstanden> = {
  "1/8e (Sprint)": { zwem_m: 500, fiets_km: 20, loop_km: 5 },
  OD: { zwem_m: 1500, fiets_km: 40, loop_km: 10 },
  "Super Sprint": { zwem_m: 400, fiets_km: 10, loop_km: 2.5 },
};

export function afstandenVoor(w: Wedstrijd): Afstanden | null {
  return w.afstanden ?? AFSTAND_DISTANCES[w.afstand] ?? null;
}

function mmss(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function tempoVoorSegment(
  sec: number | null,
  segment: SegmentSleutel,
  dist: Afstanden | null,
): TempoInfo | null {
  if (sec === null || sec <= 0 || !dist) return null;
  if (segment === "zwem") {
    const per100 = sec / (dist.zwem_m / 100);
    return { waarde: per100, eenheid: "/100m", tekst: mmss(per100), hogerIsBeter: false };
  }
  if (segment === "fiets") {
    const kmh = dist.fiets_km / (sec / 3600);
    return { waarde: kmh, eenheid: "km/u", tekst: kmh.toFixed(1), hogerIsBeter: true };
  }
  if (segment === "loop") {
    const perKm = sec / dist.loop_km;
    return { waarde: perKm, eenheid: "/km", tekst: mmss(perKm), hogerIsBeter: false };
  }
  return null; // T1/T2 hebben geen tempo
}

// --- Seizoens-trend per segment -------------------------------------------

function mediaanVan(getallen: number[]): number | null {
  if (getallen.length === 0) return null;
  const s = [...getallen].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

export function seizoensSegmentTrend(atleet: AtleetProfiel): SegmentTrend[] {
  const segmenten: SegmentSleutel[] = ["zwem", "fiets", "loop"];
  const races = [...atleet.resultaten].sort((a, b) =>
    wedstrijdSortKey(a.wedstrijd, a.wedstrijdSlug).localeCompare(
      wedstrijdSortKey(b.wedstrijd, b.wedstrijdSlug),
    ),
  );
  return segmenten.map((seg) => {
    const punten: SegmentTrendPunt[] = races.map((r) => {
      const dist = afstandenVoor(r.wedstrijd);
      const tijd = r.splits[seg];
      return {
        wedstrijdSlug: r.wedstrijdSlug,
        datum: r.wedstrijd.datum,
        locatie: r.wedstrijd.locatie,
        tijd,
        tempo: tempoVoorSegment(tijd, seg, dist),
      };
    });
    const tijden = punten
      .map((p) => p.tijd)
      .filter((t): t is number => t !== null && t > 0);
    const tempos = punten
      .map((p) => p.tempo?.waarde)
      .filter((t): t is number => t != null);
    return {
      segment: seg,
      punten,
      besteTijd: tijden.length ? Math.min(...tijden) : null,
      mediaanTempo: mediaanVan(tempos),
      hogerIsBeter: seg === "fiets",
    };
  });
}
