# VZC Triathlon — Uitslagen NTB teamcompetitie 2026

Openbare Next.js-website waar elke VZC-atleet zijn of haar uitslagen van de NTB teamcompetitie 2026 kan inzien, race-verloop kan bekijken en in één blik kan zien waar de tijd is gewonnen of verloren op zwemmen, fietsen of lopen, inclusief T1 en T2.

## Stack

* Next.js 15 met App Router
* React 19, TypeScript
* Tailwind v4 (CSS-tokens in `src/app/globals.css`)
* Volledig statisch (SSG), geen database
* Data komt uit JSON-bestanden in `data/wedstrijden/`

## Lokaal draaien

```bash
npm install
npm run dev
```

De site draait standaard op [http://localhost:3000](http://localhost:3000). Een productie-build maak je met `npm run build`; daarna `npm run start` voor de geserveerde versie.

## Datamodel

Elke wedstrijduitslag is één JSON-bestand in `data/wedstrijden/`. De bestandsnaam wordt de URL-slug. Voorbeeldnaam:

```
data/wedstrijden/2026-04-26_arnhem_2e-divisie-noord_mannen.json
```

Het volledige schema staat in [`docs/SCHEMA.md`](docs/SCHEMA.md). Op hoog niveau:

```json
{
  "wedstrijd": {
    "naam": "Schuiteman 2e Divisie Noord Mannen — Triathlon Arnhem",
    "datum": "2026-04-26",
    "locatie": "Arnhem",
    "afstand": "1/8e (Sprint)",
    "divisie": "2e divisie",
    "poule": "Noord",
    "geslacht": "mannen",
    "vzc_teams": ["VZC 3 - Veenendaal"]
  },
  "uitslagen": [
    {
      "rank": 1,
      "bib": "602",
      "naam": "Rick Kosse",
      "club": "Triteam Groningen 4",
      "splits": {
        "swim_split": "00:07:07",
        "t1_cumulatief": "00:08:40",
        "bike_cumulatief": "00:38:47",
        "t2_cumulatief": "00:39:59",
        "eindtijd": "00:58:17"
      }
    }
  ]
}
```

Belangrijke regels:

* `swim_split` is de pure zwemtijd. De andere splits zijn cumulatieven vanaf de start, conform de NTB-bronbestanden.
* De website rekent per-segment-tijden zelf uit (T1, fiets, T2, loop).
* `DNF` is toegestaan als waarde voor `rank` en de cumulatieven mogen `null` zijn vanaf het moment dat een atleet uitvalt.
* Een atleet wordt over wedstrijden heen herkend op `slug(naam) + "__" + slug(club)`. Naamspelling moet daarom consistent zijn per upload.
* Alleen bestanden met `wedstrijd.datum` in 2026 worden ingelezen.
* Een nieuw VZC-team toevoegen vereist alleen een nieuwe JSON met de juiste clubnaam in `vzc_teams`. Geen code-aanpassing.

## Routes

| Route | Omschrijving |
| ----- | ------------ |
| `/` | Overzicht VZC-teams en wedstrijden. |
| `/atleten` | Zoekbare lijst met alle atleten, default-filter op VZC. |
| `/atleet/[slug]` | Per atleet: race-verloop en segmentanalyse met baseline-keuze. |
| `/wedstrijd/[slug]` | Volledige uitslag van één wedstrijd. |
| `/team/[slug]` | Eén VZC-team: alle races en VZC-atleten daarin. |

## Verbeterpunten per atleet

Op de atleet-pagina kies je per segment een referentie:

1. Mediaan poule
2. Gemiddelde top-3
3. Winnaar
4. Snelste VZC

Het tijdverschil per segment plus de positie binnen het deelnemersveld maken in één blik zichtbaar waar winst en verlies zaten. T1 en T2 doen volwaardig mee.

## Workflow voor nieuwe wedstrijden

Eén commando, drie stappen.

1. Roep de `/wedstrijd-upload` skill aan met het pad naar het Excel-bestand. De skill:
   * vraagt alleen de metadata die niet uit de bestandsnaam te halen is (locatie, afstand, eventueel wedstrijdnaam),
   * roept het converter-script aan in `~/claude-floor/Projects/triatlon/sport-data/scripts/wedstrijd_excel_naar_json.py`,
   * schrijft het resultaat rechtstreeks in `data/wedstrijden/` van deze repo (default output-pad),
   * detecteert automatisch elke club met substring `VZC` als VZC-team.
2. Controleer de samenvatting (aantal atleten, gevonden VZC-teams). Optioneel `npm run dev` om visueel te toetsen.
3. Commit en push:
   ```bash
   git add data/wedstrijden/<slug>.json
   git commit -m "Voeg <wedstrijdnaam> toe"
   git push
   ```
   Vercel ziet de push en bouwt automatisch een nieuwe versie van de site.

Het converter-script accepteert ook handmatige CLI-aanroepen:

```bash
python3 ~/claude-floor/Projects/triatlon/sport-data/scripts/wedstrijd_excel_naar_json.py \
  "<excel-pad>" \
  --naam "Schuiteman 1e Divisie Noord Mannen — Triathlon Arnhem" \
  --datum 2026-04-26 \
  --locatie Arnhem \
  --afstand "1/8e (Sprint)" \
  --divisie "1e divisie" \
  --poule Noord \
  --geslacht mannen
```

Gebruik `--dry-run` om eerst te zien waar het bestand zou landen zonder te schrijven, en `--vzc-teams "Naam A,Naam B"` om de auto-detectie te overrulen.

## Deployen op Vercel

1. Push de repo naar GitHub.
2. Importeer in Vercel als Next.js-project (geen aparte build-instellingen nodig).
3. Domain naar keuze; standaard preview-URL volstaat voor de eerste lancering.
4. Nieuwe wedstrijden = nieuw commit op de repo, geen verdere actie nodig.

## Mappenstructuur

```
.
├── data/wedstrijden/                   # JSON per wedstrijd
├── docs/SCHEMA.md                      # JSON-schema-documentatie
├── src/
│   ├── app/
│   │   ├── page.tsx                    # home
│   │   ├── atleten/page.tsx            # atletenlijst + zoek
│   │   ├── atleet/[slug]/page.tsx
│   │   ├── wedstrijd/[slug]/page.tsx
│   │   ├── team/[slug]/page.tsx
│   │   ├── layout.tsx
│   │   └── globals.css                 # huisstijl + tokens
│   ├── components/
│   │   ├── SegmentAnalyse.tsx          # client: baseline-toggle
│   │   └── AtletenZoek.tsx             # client: zoekfilter
│   └── lib/
│       ├── data.ts                     # loader, slugs, splits, aggregaties
│       └── types.ts
└── package.json
```
