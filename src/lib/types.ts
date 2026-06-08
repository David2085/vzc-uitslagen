export type Geslacht = "mannen" | "vrouwen";

export type TeamformatType = "ttt_nde_man" | "som_top_n";

export type Teamformat = {
  type: TeamformatType;
  n: number;
  min_finishers?: number;
};

export type Afstanden = {
  zwem_m: number;
  fiets_km: number;
  loop_km: number;
};

export type Wedstrijd = {
  naam: string;
  datum: string;
  starttijd?: string;
  locatie: string;
  afstand: string;
  divisie: string;
  poule: string | null;
  geslacht: Geslacht;
  vzc_teams: string[];
  teamformat?: Teamformat;
  puntenschema?: string;
  afstanden?: Afstanden;
};

export type TempoInfo = {
  waarde: number; // pace in sec (zwem/loop) of snelheid in km/u (fiets)
  eenheid: string; // "/100m" | "km/u" | "/km"
  tekst: string; // weergave, bv "1:38" of "39.4"
  hogerIsBeter: boolean;
};

export type SegmentTrendPunt = {
  wedstrijdSlug: string;
  datum: string;
  locatie: string;
  tijd: number | null;
  tempo: TempoInfo | null;
};

export type SegmentTrend = {
  segment: SegmentSleutel;
  punten: SegmentTrendPunt[];
  besteTijd: number | null;
  mediaanTempo: number | null;
  hogerIsBeter: boolean;
};

export type OfficieelTeamRaceResultaat = {
  club: string;
  isVzc: boolean;
  plaats: number;
  som: number | null;
};

export type Splits = {
  swim_split: string | null;
  t1_cumulatief: string | null;
  bike_cumulatief: string | null;
  t2_cumulatief: string | null;
  eindtijd: string | null;
};

export type Uitslag = {
  rank: number | "DNF";
  bib?: string;
  naam: string;
  club: string;
  splits: Splits;
};

export type WedstrijdBestand = {
  wedstrijd: Wedstrijd;
  uitslagen: Uitslag[];
};

export type SegmentSleutel = "zwem" | "t1" | "fiets" | "t2" | "loop";

export type SegmentTijden = {
  zwem: number | null;
  t1: number | null;
  fiets: number | null;
  t2: number | null;
  loop: number | null;
  totaal: number | null;
};

export type CumulatieveTijden = {
  na_zwem: number | null;
  na_t1: number | null;
  na_fiets: number | null;
  na_t2: number | null;
  eindtijd: number | null;
};

export type CheckpointSleutel = "na_zwem" | "na_t1" | "na_fiets" | "na_t2" | "eindtijd";

export type AtleetUitslag = {
  wedstrijdSlug: string;
  wedstrijd: Wedstrijd;
  rank: number | "DNF";
  bib?: string;
  naam: string;
  club: string;
  isVzc: boolean;
  atleetSlug: string;
  splits: SegmentTijden;
  cumulatief: CumulatieveTijden;
  rankPerSegment: Record<SegmentSleutel, number | null>;
  cumulatiefRank: Record<CheckpointSleutel, number | null>;
};

export type WedstrijdVolledig = {
  slug: string;
  wedstrijd: Wedstrijd;
  uitslagen: AtleetUitslag[];
};

export type TeamResultaat = {
  rank: number;
  club: string;
  isVzc: boolean;
  klasseringSom: number | null;
  teamtijd: number | null;
  isTtt: boolean;
  tellendeAtleten: AtleetUitslag[];
  finishersInTeam: number;
};

export type TeamSeizoensRace = {
  wedstrijdSlug: string;
  wedstrijdNaam: string;
  datum: string;
  teamPlaats: number;
  klasseringSom: number | null;
  teamtijd: number | null;
};

export type TeamSeizoensStand = {
  teamSlug: string;
  totaalKlassering: number;
  perWedstrijd: TeamSeizoensRace[];
};

export type SeizoensTeamRij = {
  club: string;
  isVzc: boolean;
  totaalKlassering: number;
  aantalWedstrijden: number;
  perWedstrijd: Record<string, { teamPlaats: number; klasseringSom: number | null } | null>;
};

// Officiele tussenstand (bron: teamcompetities.nl), ingelezen uit
// data/klassement.json. TTT-wedstrijden zijn op tijd geklasseerd en niet uit
// de individuele uitslagen te reconstrueren; daarom is dit de bron voor het
// seizoensklassement.
export type OfficieelRace = {
  label: string;
  gereden: boolean;
  isTtt: boolean;
  wedstrijdSlug: string | null;
};

export type OfficieelRaceResultaat = {
  plaats: number;
  som: number | null;
};

export type OfficieelTeam = {
  club: string;
  isVzc: boolean;
  totaalPlaats: number | null;
  totaalSom: number | null;
  perRace: (OfficieelRaceResultaat | null)[];
};

export type OfficielePoule = {
  divisie: string;
  poule: string | null;
  geslacht: Geslacht;
  slug: string;
  races: OfficieelRace[];
  teams: OfficieelTeam[];
};

export type OfficieelKlassement = {
  bron: string;
  bijgewerkt: string | null;
  poules: OfficielePoule[];
};

export type DivisieKlassement = {
  divisie: string;
  poule: string | null;
  geslacht: Geslacht;
  vzcTeams: string[];
  wedstrijden: { slug: string; naam: string; datum: string; locatie: string }[];
  teams: SeizoensTeamRij[];
};
