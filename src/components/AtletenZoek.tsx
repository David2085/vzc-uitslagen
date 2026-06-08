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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <input
          type="search"
          value={zoek}
          onChange={(e) => setZoek(e.target.value)}
          placeholder="Zoek op naam of club…"
          className="min-w-[220px] flex-1 rounded-full border border-[color:var(--color-vzc-line)] bg-[color:var(--color-vzc-paper)] px-4 py-2 text-sm text-[color:var(--color-vzc-ink)] shadow-sm transition placeholder:text-[color:var(--color-vzc-muted)] focus:border-[color:var(--color-vzc-blue)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-vzc-blue)]/20"
        />
        <label className="inline-flex items-center gap-2 text-sm text-[color:var(--color-vzc-ink-soft)]">
          <input
            type="checkbox"
            checked={alleenVzc}
            onChange={(e) => setAlleenVzc(e.target.checked)}
            className="h-4 w-4 rounded border-[color:var(--color-vzc-line)] text-[color:var(--color-vzc-blue)] focus:ring-[color:var(--color-vzc-blue)]"
          />
          Alleen VZC-atleten
        </label>
        <span className="ml-auto inline-flex items-baseline gap-1.5 text-xs text-[color:var(--color-vzc-muted)]">
          <span className="num text-sm font-semibold text-[color:var(--color-vzc-blue-dark)]">
            {lijst.length}
          </span>
          {lijst.length === 1 ? "atleet" : "atleten"}
        </span>
      </div>

      {lijst.length === 0 ? (
        <div className="vzc-card p-6 text-sm text-[color:var(--color-vzc-muted)]">
          Geen atleten gevonden.
        </div>
      ) : (
        <div className="vzc-card divide-y divide-[color:var(--color-vzc-line)] overflow-hidden">
          {lijst.map((a) => (
            <Link
              key={a.slug}
              href={`/atleet/${a.slug}`}
              className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-[color:var(--color-vzc-blue-50)]"
              style={
                a.isVzc
                  ? { boxShadow: "inset 3px 0 0 0 var(--color-vzc-yellow)" }
                  : undefined
              }
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium text-[color:var(--color-vzc-ink)]">
                    {a.naam}
                  </span>
                  {a.isVzc ? <span className="vzc-pill vzc-pill-vzc">VZC</span> : null}
                </div>
                <div className="mt-0.5 text-xs text-[color:var(--color-vzc-muted)]">{a.club}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm text-[color:var(--color-vzc-ink-soft)]">
                  <span className="num">{a.aantal}</span> race{a.aantal === 1 ? "" : "s"}
                </div>
                <div className="mt-0.5 text-[11px] text-[color:var(--color-vzc-muted)]">
                  {a.besteRank ? (
                    <>
                      beste <span className="num">#{a.besteRank}</span>
                    </>
                  ) : (
                    "geen finish"
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
