# JSON-schema NTB teamcompetitie 2026

Eén bestand per wedstrijd in `data/wedstrijden/`. De bestandsnaam wordt gebruikt als id en als URL-slug, dus alleen kleine letters, cijfers en streepjes. Aanbevolen patroon: `YYYY-MM-DD_locatie_divisie_geslacht.json`.

Voorbeeld: `2026-04-26_arnhem_2e-divisie_mannen.json`.

## Structuur op hoog niveau

```json
{
  "wedstrijd": { ... },
  "uitslagen": [ { ... } ]
}
```

## Veld `wedstrijd`

| Veld | Type | Verplicht | Toelichting |
| ---- | ---- | --------- | ----------- |
| `naam` | string | ja | Officiële wedstrijdnaam, bijvoorbeeld "1/8 Triathlon Arnhem". |
| `datum` | string `YYYY-MM-DD` | ja | Wedstrijddatum. |
| `locatie` | string | ja | Plaatsnaam. |
| `afstand` | string | ja | Vrij tekstveld, bijvoorbeeld "1/8e (Sprint)" of "OD". |
| `divisie` | string | ja | "Eredivisie", "1e divisie", "2e divisie" of "3e divisie". |
| `poule` | string \| null | nee | Regionale poule als die er is, bijvoorbeeld "Noord". `null` voor de Eredivisie. |
| `geslacht` | `"mannen"` \| `"vrouwen"` | ja | Wedstrijdcategorie. |
| `vzc_teams` | string[] | ja | Lijst clubnamen die in deze uitslag als VZC-team gelden, bijvoorbeeld `["VZC 3"]` of `["VZC Veenendaal"]`. Hiermee weet de site welke namen op de teamcompetitie-rekening van VZC vallen.

## Veld `uitslagen[]`

Elk element is één atleet-resultaat.

| Veld | Type | Verplicht | Toelichting |
| ---- | ---- | --------- | ----------- |
| `rank` | number \| `"DNF"` | ja | Eindklassement. `"DNF"` als de atleet niet finishte. |
| `bib` | string | nee | Startnummer. |
| `naam` | string | ja | Volledige naam zoals gepubliceerd in de NTB-uitslag. |
| `club` | string | ja | Clubnaam zoals gepubliceerd. Een atleet wordt over wedstrijden heen gematcht op `slug(naam) + "-" + slug(club)`. |
| `splits` | object | ja | Zie tabel hieronder. Alle waarden zijn strings in `H:MM:SS` of `MM:SS`. Gebruik `null` voor ontbrekende tussentijden. |

### Veld `splits`

In de NTB-bronbestanden is `Swim` een eigen segmenttijd en zijn `T1`, `Bike`, `T2` en `Eindtijd` cumulatieve tussentijden. Dat patroon houden we in het schema aan, omdat het in praktijk de meest robuuste weergave is bij ontbrekende metingen.

| Veld | Type | Toelichting |
| ---- | ---- | ----------- |
| `swim_split` | string \| null | Pure zwemtijd, niet cumulatief. |
| `t1_cumulatief` | string \| null | Cumulatieve tijd op het moment dat T1 voorbij is. |
| `bike_cumulatief` | string \| null | Cumulatieve tijd na het fietsen, voor T2. |
| `t2_cumulatief` | string \| null | Cumulatieve tijd na T2, voor het lopen. |
| `eindtijd` | string \| null | Cumulatieve eindtijd. |

De website berekent per-segment splits zelf uit deze cumulatieven:

* zwem = `swim_split`
* T1 = `t1_cumulatief - swim_split`
* fiets = `bike_cumulatief - t1_cumulatief`
* T2 = `t2_cumulatief - bike_cumulatief`
* loop = `eindtijd - t2_cumulatief`

Bij `null` of bij DNF blijft het betreffende segment leeg in de presentatie.

## Volledig voorbeeld

```json
{
  "wedstrijd": {
    "naam": "1/8 Triathlon Arnhem",
    "datum": "2026-04-26",
    "locatie": "Arnhem",
    "afstand": "1/8e (Sprint)",
    "divisie": "2e divisie",
    "poule": "Noord",
    "geslacht": "mannen",
    "vzc_teams": ["VZC 3"]
  },
  "uitslagen": [
    {
      "rank": 1,
      "bib": "12",
      "naam": "Jan Jansen",
      "club": "AV Zevenheuvelen",
      "splits": {
        "swim_split": "00:10:23",
        "t1_cumulatief": "00:11:45",
        "bike_cumulatief": "00:42:06",
        "t2_cumulatief": "00:42:47",
        "eindtijd": "01:03:01"
      }
    },
    {
      "rank": "DNF",
      "bib": "47",
      "naam": "Test Renner",
      "club": "VZC 3",
      "splits": {
        "swim_split": "00:11:50",
        "t1_cumulatief": "00:13:10",
        "bike_cumulatief": null,
        "t2_cumulatief": null,
        "eindtijd": null
      }
    }
  ]
}
```

## Spelregels voor de upload-pipeline

1. Eén bestand per (wedstrijd, divisie, poule, geslacht). Aparte bestanden voor mannen en vrouwen.
2. Bestandsnaam bepaalt de URL: `data/wedstrijden/2026-04-26_arnhem_2e-divisie_mannen.json` wordt `/wedstrijd/2026-04-26_arnhem_2e-divisie_mannen`.
3. JSON valideert tegen dit schema voordat het in de repo gecommit wordt. De website faalt de build expliciet als een veld ontbreekt of een tijd onparseerbaar is.
4. Alleen seizoen 2026: bestanden met een andere `datum`-jaar dan 2026 worden door de loader genegeerd.
5. Een nieuw VZC-team in een nieuwe poule vereist alleen dat de clubnaam in `vzc_teams` staat. Geen code-aanpassing.
