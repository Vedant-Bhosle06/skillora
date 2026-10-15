import { useEffect, type ReactNode } from "react";
import { Badge, Spinner, ErrorState } from "@/components/ui";
import { useSkillDetail } from "@/api/queries";
import { toApiError } from "@/api/client";
import { categoryColor, categoryLabel, formatHours, formatPercent, rankLabel } from "@/lib/format";
import type { PathStep, SkillEdge } from "@/api/types";

interface SkillDetailPanelProps {
  skillId: string;
  /** The user's status for this skill, as shown in the graph legend. */
  status: { label: string; color: string };
  /** Set when the skill is a step of the user's selected path. */
  step?: PathStep;
  /** Skill id -> name, from the full graph. */
  nameOf: (id: string) => string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

/** Requires / Unlocks / Related lists from the skill's own edges. */
function splitEdges(skillId: string, edges: ReadonlyArray<SkillEdge>) {
  const mandatory: string[] = [];
  const groups = new Map<string, string[]>();
  const unlocks: string[] = [];
  const related: string[] = [];
  for (const e of edges) {
    if (e.type === "corequisite_with") {
      const other = e.sourceSkillId === skillId ? e.targetSkillId : e.sourceSkillId;
      if (!related.includes(other)) related.push(other);
    } else if (e.targetSkillId === skillId) {
      if (e.group == null) mandatory.push(e.sourceSkillId);
      else groups.set(e.group, [...(groups.get(e.group) ?? []), e.sourceSkillId]);
    } else if (e.sourceSkillId === skillId) {
      unlocks.push(e.targetSkillId);
    }
  }
  return { mandatory, groups: [...groups.entries()], unlocks, related };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">{title}</p>
      {children}
    </div>
  );
}

export default function SkillDetailPanel({ skillId, status, step, nameOf, onSelect, onClose }: SkillDetailPanelProps) {
  const detail = useSkillDetail(skillId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const skillLink = (id: string) => (
    <button
      key={id}
      onClick={() => onSelect(id)}
      className="text-xs bg-muted text-foreground px-2 py-0.5 rounded hover:bg-secondary transition-colors"
    >
      {nameOf(id)}
    </button>
  );

  function body() {
    if (detail.isPending) {
      return <div className="flex justify-center py-16"><Spinner className="w-6 h-6" /></div>;
    }
    if (detail.isError) {
      return (
        <ErrorState
          title="Couldn't load this skill"
          message={toApiError(detail.error).message}
          onRetry={() => detail.refetch()}
        />
      );
    }

    const skill = detail.data;
    const { mandatory, groups, unlocks, related } = splitEdges(skill._id, skill.edges);
    const color = categoryColor(skill.category);

    return (
      <div className="flex flex-col gap-5 p-5">
        <div>
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-500 mb-2"
            style={{ backgroundColor: `${color}1a`, color }}
          >
            {categoryLabel(skill.category)}
          </span>
          <h2 className="font-display font-700 text-xl text-foreground">{skill.name}</h2>
          {skill.description && <p className="text-sm text-muted-foreground mt-2">{skill.description}</p>}
          {skill.aliases.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {skill.aliases.map(a => <Badge key={a} variant="outline">{a}</Badge>)}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-muted rounded-lg p-2.5">
            <p className="text-xs text-muted-foreground">Estimated</p>
            <p className="font-mono text-sm text-foreground">{formatHours(skill.estHours)}</p>
          </div>
          <div className="bg-muted rounded-lg p-2.5">
            <p className="text-xs text-muted-foreground">Demand</p>
            <p className="font-mono text-sm text-foreground">{formatPercent(skill.marketDemand)}</p>
          </div>
          <div className="bg-muted rounded-lg p-2.5">
            <p className="text-xs text-muted-foreground">Difficulty</p>
            <div className="flex gap-1 mt-1.5" aria-label={`Difficulty ${skill.baseDifficulty} of 5`}>
              {[1, 2, 3, 4, 5].map(i => (
                <span key={i} className={`w-2 h-2 rounded-full ${i <= skill.baseDifficulty ? "bg-primary" : "bg-border"}`} />
              ))}
            </div>
          </div>
        </div>

        <Section title="Your status">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: status.color }} />
            {status.label}
          </div>
          {step && (
            <div className="mt-2 rounded-lg border border-border p-3 flex flex-col gap-1">
              <p className="text-xs font-mono text-foreground">
                Step #{step.order} · {rankLabel(step.fromRank)} → {rankLabel(step.toRank)}
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-600 text-foreground">Why this skill? </span>{step.rationale}
              </p>
            </div>
          )}
        </Section>

        <Section title="Requires">
          {mandatory.length === 0 && groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing — a starting point.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {mandatory.length > 0 && (
                <div className="flex flex-wrap gap-1">{mandatory.map(id => skillLink(id))}</div>
              )}
              {groups.map(([group, ids]) => (
                <div key={group} className="flex flex-wrap items-center gap-1">
                  <span className="text-xs text-amber-600 dark:text-amber-400 mr-1">Any one of:</span>
                  {ids.map(id => skillLink(id))}
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Unlocks">
          {unlocks.length === 0
            ? <p className="text-sm text-muted-foreground">No dependent skills.</p>
            : <div className="flex flex-wrap gap-1">{unlocks.map(id => skillLink(id))}</div>}
        </Section>

        {related.length > 0 && (
          <Section title="Related">
            <div className="flex flex-wrap gap-1">{related.map(id => skillLink(id))}</div>
          </Section>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Below 1024 px the panel overlays the canvas; tapping outside closes it. */}
      <div className="absolute inset-0 z-20 bg-black/30 lg:hidden" onClick={onClose} aria-hidden="true" />
      <aside
        className="absolute inset-y-0 right-0 z-30 w-full max-w-sm bg-card border-l border-border shadow-xl overflow-y-auto lg:static lg:z-auto lg:shadow-none lg:w-96 lg:max-w-none lg:shrink-0"
        aria-label="Skill details"
      >
        <div className="sticky top-0 bg-card/95 backdrop-blur border-b border-border px-5 py-3 flex items-center justify-between">
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Skill details</p>
          <button
            onClick={onClose}
            aria-label="Close details"
            className="w-7 h-7 rounded border border-border text-muted-foreground hover:bg-muted flex items-center justify-center"
          >
            ✕
          </button>
        </div>
        {body()}
      </aside>
    </>
  );
}
