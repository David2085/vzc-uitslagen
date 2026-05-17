"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Item = {
  slug: string;
  naam: string;
  club: string;
  isVzc: boolean;
  aantal: number;
  besteRank: number | null;
};

export default function AtletenZoek({ items }: { items: Item[] }) {
  const [zoek, setZoek] = useState("");
  const [alleenVzc, setAlleenVzc] = useState(true);

  const lijst = useMemo(() => {
    const q = zoek.trim().toLowerCase();
    return items.filter((a) => {
      if (alleenVzc && !a.isVzc) return false;
      if (!q) return true;
      return (
        a.naam.toLowerCase().includes(q) || a.club.toLowerCase().includes(q)
      );
    });
  }, [items, zoek, alleenVzc]);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={zoek}
          onChange={(e) => setZoek(e.target.value)}
          placeholder="Zoek op naam of club…"
          className="flex-1 min-w-[220px] rounded-full border border-[color:var(--color-vzc-blue)]/20 bg-white px-4 py-2 text-sm shadow-sm focus:border-[color:var(--color-vzc-blue)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-vzc-blue)]/20"
        />
        <label className="inline-flex items-center gap-2 text-sm text-[color:var(--color-vzc-ink-soft)]">
          <input
            type="checkbox"
            checked={alleenVzc}
            onChange={(e) => setAlleenVzc(e.target.checked)}
            className="h-4 w-4 rounded border-[color:var(--color-vzc-blue)]/40 text-[color:var(--color-vzc-blue)] focus:ring-[color:var(--color-vzc-blue)]"
          />
          Alleen VZC-atleten
        </label>
        <span className="ml-auto text-xs text-[color:var(--color-vzc-muted)]">
          {lijst.length} resultaten
        </span>
      </div>

      {lijst.length === 0 ? (
        <div className="vzc-card p-6 text-sm text-[color:var(--color-vzc-muted)]">
          Geen atleten gevonden.
        </div>
      ) : (
        <div className="vzc-card divide-y divide-[color:var(--color-vzc-blue)]/10">
          {lijst.map((a) => (
            <Link
              key={a.slug}
              href={`/atleet/${a.slug}`}
              className="flex items-center gap-4 px-5 py-3 transition hover:bg-[color:var(--color-vzc-blue-50)]"
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-[color:var(--color-vzc-ink)]">{a.naam}</span>
                  {a.isVzc ? <span className="vzc-pill-vzc vzc-pill">VZC</span> : null}
                </div>
                <div className="text-xs text-[color:var(--color-vzc-muted)]">{a.club}</div>
              </div>
              <div className="text-right">
                <div className="text-sm tabular-nums text-[color:var(--color-vzc-ink-soft)]">
                  {a.aantal} race{a.aantal === 1 ? "" : "s"}
                </div>
                <div className="text-[11px] text-[color:var(--color-vzc-muted)]">
                  {a.besteRank ? `beste #${a.besteRank}` : "geen finish"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
