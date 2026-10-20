import React from "react";
import { ProgressBar } from "@/components/ui";
import { StationChip } from "@/components/transit";
import { formatHours } from "@/lib/format";

export interface DomainStat { domain: string; doneCnt: number; total: number; remainingHours: number }

/** Domain filter: a chip row and one tile per domain. Picking a domain filters the checklist. */
export default function DomainBreakdown({ domainStats, domainFilter, setDomainFilter }: {
  domainStats: DomainStat[]; domainFilter: string | null; setDomainFilter: (d: string | null) => void;
}) {
  const domains = domainStats.map(d => d.domain);
  return (
    <section className="mb-10" aria-labelledby="domains-h">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="domains-h" className="font-display text-xl font-extrabold text-foreground">By domain</h2>
        {domainFilter && (
          <button
            onClick={() => setDomainFilter(null)}
            className="min-h-11 rounded-full px-3 text-sm font-bold text-foreground underline underline-offset-4 hover:bg-muted"
          >
            Clear filter
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <StationChip pressed={!domainFilter} onToggle={() => setDomainFilter(null)}>All domains</StationChip>
        {domains.map(d => (
          <StationChip key={d} pressed={domainFilter === d} onToggle={() => setDomainFilter(d === domainFilter ? null : d)}>{d}</StationChip>
        ))}
      </div>

      <div className={`grid gap-3 ${domainStats.length <= 2 ? "grid-cols-2" : domainStats.length === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2 lg:grid-cols-4"}`}>
        {domainStats.map(ds => {
          const selected = domainFilter === ds.domain;
          return (
            <button
              key={ds.domain}
              type="button"
              onClick={() => setDomainFilter(ds.domain === domainFilter ? null : ds.domain)}
              aria-pressed={selected}
              className={`min-h-11 rounded-md border bg-card p-3 text-left transition-colors hover:border-foreground ${selected ? "border-foreground shadow-[inset_0_4px_0_0_var(--primary)]" : "border-border"}`}
            >
              <span className="block truncate text-sm font-bold text-foreground">{ds.domain}</span>
              <span className="mt-0.5 block font-mono text-lg font-bold text-foreground">{ds.doneCnt}/{ds.total}</span>
              <span className="mb-2 block text-sm text-muted-foreground">{ds.remainingHours > 0 ? `${formatHours(ds.remainingHours)} left` : "Done"}</span>
              <ProgressBar value={ds.doneCnt} max={Math.max(ds.total, 1)} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
