#!/usr/bin/env python3
"""Haalt de officiele NTB-tussenstand op en schrijft data/klassement.json.

De teamcompetitie classificeert TTT-wedstrijden op tijd; die teamplaatsen zijn
niet uit de individuele uitslagen te reconstrueren. Daarom is de officiele
tussenstand de bron voor het seizoensklassement. De individuele wedstrijd-JSONs
blijven de atleet- en wedstrijdanalyse voeden.

Koppelt elke officiele tabel aan een VZC-poule via clubnaam-overlap met de
wedstrijd-JSONs, en elke race-kolom aan een wedstrijd-slug via datum + locatie.

Gebruik:  python3 scripts/fetch_klassement.py [pad-naar-tussenstand.html]
Zonder argument wordt https://teamcompetities.nl/tussenstand/ opgehaald.
"""
import json
import re
import sys
import unicodedata
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data" / "wedstrijden"
OUT = ROOT / "data" / "klassement.json"
URL = "https://teamcompetities.nl/tussenstand/"

MAAND = {
    1: "jan", 2: "feb", 3: "mrt", 4: "apr", 5: "mei", 6: "jun",
    7: "jul", 8: "aug", 9: "sep", 10: "okt", 11: "nov", 12: "dec",
}


def slugify(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def norm_club(s: str) -> str:
    """Normaliseer clubnaam voor matching (en-dash/streepje, spaties, plaats)."""
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.replace("–", "-").replace("—", "-")
    s = re.sub(r"\s*-\s*(veenendaal|utrecht|amsterdam|drachten|apeldoorn|"
               r"renkum|wierden|deventer|weesp|zwolle|enschede|tiel|"
               r"amersfoort|barendrecht|breda|beesd|spijkenisse|maastricht|"
               r"doorn|hilversum|klazienaveen|goor|breezand|holten)\b", "", s)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return s.strip()


def strip_tags(s: str) -> str:
    import html as _html
    return _html.unescape(re.sub(r"<[^>]+>", " ", s)).strip()


def parse_cell(txt: str):
    """'4 (52)' -> (4, 52); '13' -> (13, None); '' -> None."""
    txt = txt.strip()
    if not txt:
        return None
    m = re.match(r"^(\d+)\s*(?:\((\d+)\))?$", txt)
    if not m:
        return None
    plaats = int(m.group(1))
    som = int(m.group(2)) if m.group(2) else None
    return (plaats, som)


def parse_tables(html_text: str):
    tables = []
    for tb in re.findall(r"<table.*?</table>", html_text, flags=re.S):
        rows = re.findall(r"<tr.*?</tr>", tb, flags=re.S)
        parsed = []
        for r in rows:
            cells = [strip_tags(c) for c in re.findall(r"<t[hd].*?</t[hd]>", r, flags=re.S)]
            parsed.append(cells)
        if len(parsed) < 2:
            continue
        head = parsed[0]
        # race-labels staan vanaf kolom 4; filter lege en 'strafpunten'
        race_labels = [h for h in head[4:] if h.strip() and "straf" not in h.lower()]
        teams = []
        for p in parsed[1:]:
            if len(p) < 4 or not p[1].strip():
                continue
            club = p[1].strip()
            value_cells = p[3:]  # eerste = totaal, daarna per race
            total = parse_cell(value_cells[0]) if value_cells else None
            per_race = [parse_cell(c) for c in value_cells[1:1 + len(race_labels)]]
            teams.append({"club": club, "total": total, "per_race": per_race})
        if teams:
            tables.append({"race_labels": race_labels, "teams": teams})
    return tables


def load_my_poules():
    """Groepeer mijn wedstrijd-JSONs per (divisie, poule, geslacht)."""
    groepen = {}
    for f in sorted(DATA_DIR.glob("*.json")):
        d = json.loads(f.read_text())
        w = d["wedstrijd"]
        if not w["datum"].startswith("2026"):
            continue
        key = (w["divisie"], w.get("poule"), w["geslacht"])
        g = groepen.setdefault(key, {"clubs": set(), "vzc": set(), "wedstrijden": []})
        for u in d["uitslagen"]:
            g["clubs"].add(norm_club(u["club"]))
        for t in w.get("vzc_teams", []):
            g["vzc"].add(norm_club(t))
        g["wedstrijden"].append({"slug": f.stem, "datum": w["datum"], "locatie": w["locatie"]})
    return groepen


def match_race_to_slug(label, wedstrijden):
    """'7/6 Groningen' -> wedstrijd-slug met datum 06-07 en locatie Groningen."""
    m = re.match(r"\s*(\d{1,2})/(\d{1,2})", label)
    if not m:
        return None
    dag, maand = int(m.group(1)), int(m.group(2))
    loc = re.sub(r"^\s*\d+/\d+\s*", "", label).split("(")[0].strip().lower()
    for w in wedstrijden:
        dd = int(w["datum"][8:10])
        mm = int(w["datum"][5:7])
        if dd == dag and mm == maand:
            return w["slug"]
    # alleen op locatie
    for w in wedstrijden:
        if loc and loc in w["locatie"].lower():
            return w["slug"]
    return None


def jaccard(a, b):
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def main():
    if len(sys.argv) > 1:
        html_text = Path(sys.argv[1]).read_text()
    else:
        req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0"})
        html_text = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")

    bijgewerkt = None
    # Alleen de datum (+ optioneel tijd) pakken — niet de rest van de pagina.
    m = re.search(
        r"[Ll]aatste update[:\s]*(\d{2}-\d{2}-\d{4}(?:\s+\d{1,2}:\d{2})?)",
        strip_tags(html_text),
    )
    if m:
        bijgewerkt = m.group(1).strip()

    tables = parse_tables(html_text)
    groepen = load_my_poules()

    poules_out = []
    gebruikt = set()
    for key, g in groepen.items():
        divisie, poule, geslacht = key
        # beste tabel-match op clubnaam-overlap, met VZC-team aanwezig
        best, best_score = None, 0.0
        for i, tb in enumerate(tables):
            if i in gebruikt:
                continue
            tbl_clubs = {norm_club(t["club"]) for t in tb["teams"]}
            if not (g["vzc"] & tbl_clubs):
                continue
            score = jaccard(g["clubs"], tbl_clubs)
            if score > best_score:
                best, best_score, best_i = tb, score, i
        if not best or best_score < 0.3:
            print(f"  ! geen match voor {key} (beste score {best_score:.2f})")
            continue
        gebruikt.add(best_i)

        races = []
        for label in best["race_labels"]:
            slug = match_race_to_slug(label, g["wedstrijden"])
            gereden = any(t["per_race"][len(races)] for t in best["teams"]
                          if len(t["per_race"]) > len(races))
            is_ttt = gereden and all(
                (c is None or c[1] is None)
                for t in best["teams"]
                for c in [t["per_race"][len(races)] if len(t["per_race"]) > len(races) else None]
            )
            races.append({
                "label": label,
                "gereden": bool(gereden),
                "isTtt": bool(is_ttt),
                "wedstrijdSlug": slug,
            })

        teams_out = []
        for t in best["teams"]:
            is_vzc = norm_club(t["club"]) in g["vzc"]
            teams_out.append({
                "club": t["club"],
                "isVzc": is_vzc,
                "totaalPlaats": t["total"][0] if t["total"] else None,
                "totaalSom": t["total"][1] if t["total"] else None,
                "perRace": [
                    None if c is None else {"plaats": c[0], "som": c[1]}
                    for c in t["per_race"]
                ],
            })
        teams_out.sort(key=lambda x: (x["totaalPlaats"] is None, x["totaalPlaats"] or 0))

        poules_out.append({
            "divisie": divisie,
            "poule": poule,
            "geslacht": geslacht,
            "slug": slugify(f"{divisie}-{poule or 'landelijk'}-{geslacht}"),
            "races": races,
            "teams": teams_out,
        })

    poules_out.sort(key=lambda p: (p["divisie"], p["geslacht"], p["poule"] or ""))
    out = {
        "bron": URL,
        "bijgewerkt": bijgewerkt,
        "poules": poules_out,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2))
    print(f"Geschreven: {OUT.relative_to(ROOT)}  ({len(poules_out)} poules)")
    for p in poules_out:
        vzc = [t for t in p["teams"] if t["isVzc"]]
        vtxt = ", ".join(f"{t['club']} #{t['totaalPlaats']}" for t in vzc)
        print(f"  {p['divisie']} {p['poule'] or '-'} {p['geslacht']}: "
              f"{len(p['teams'])} teams, {sum(r['gereden'] for r in p['races'])} gereden | {vtxt}")


if __name__ == "__main__":
    main()
