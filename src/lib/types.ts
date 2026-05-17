export type Geslacht = "mannen" | "vrouwen";

export type Wedstrijd = {
  naam: string;
  datum: string;
  locatie: string;
  afstand: string;
  divisie: string;
  poule: string | null;
  geslacht: Geslacht;
  vzc_teams: string[];
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
