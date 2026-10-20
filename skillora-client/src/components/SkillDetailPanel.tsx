import { useEffect, type ReactNode } from "react";
import { Badge, Spinner, ErrorState } from "@/components/ui";
import { useSkillDetail } from "@/api/queries";
import { toApiError } from "@/api/client";
import { categoryLabel, demandWord, formatHours, formatPercent, rankLabel } from "@/lib/format";
import { lineFor } from "@/components/landing/data";
import { CloseIcon } from "@/components/transit";
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
  /** Always float over the page (with a scrim) instead of sitting beside it on wide screens. */
  overlay?: boolean;
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
      <h3 className="mb-1.5 text-sm font-bold text-foreground">{title}</h3>
      {children}
    </div>
  );
}

export default function SkillDetailPanel({ skillId, status, step, nameOf, onSelect, onClose, overlay = false }: SkillDetailPanelProps) {
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
      className="min-h-11 rounded-full border border-border bg-card px-3 text-sm font-bold text-foreground transition-colors hover:border-foreground"
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
    const color = lineFor(skill.category);

    return (
      <div className="flex flex-col gap-5 p-5">
        <div>
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs font-bold text-foreground">
            <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden="true" />
            {categoryLabel(skill.category)}
          </span>
          <h2 className="font-display text-2xl font-extrabold text-foreground">{skill.name}</h2>
          {skill.description && <p className="text-sm text-muted-foreground mt-2">{skill.description}</p>}
          {skill.aliases.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {skill.aliases.map(a => <Badge key={a} variant="outline">{a}</Badge>)}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md border border-border p-2.5">
            <p className="text-sm text-muted-foreground">Estimated</p>
            <p className="font-mono text-base font-bold text-foreground">{formatHours(skill.estHours)}</p>
          </div>
          <div className="rounded-md border border-border p-2.5">
            <p className="text-sm text-muted-foreground">Demand</p>
            <p className="text-base font-bold leading-tight text-foreground">{demandWord(skill.marketDemand)}</p>
            <p className="font-mono text-sm text-muted-foreground">{formatPercent(skill.marketDemand)}</p>
          </div>
          <div className="rounded-md border border-border p-2.5">
            <p className="text-sm text-muted-foreground">Difficulty</p>
            <p className="font-mono text-base font-bold text-foreground">{skill.baseDifficulty} of 5</p>
            <div className="mt-1 flex gap-1" aria-hidden="true">
              {[1, 2, 3, 4, 5].map(i => (
                <span key={i} className={`h-2 w-2 rounded-full ${i <= skill.baseDifficulty ? "bg-foreground" : "bg-border"}`} />
              ))}
            </div>
          </div>
        </div>

        <Section title="Your status">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <span className="h-3 w-3 rounded-full" style={{ background: status.color }} aria-hidden="true" />
            {status.label}
          </div>
          {step && (
            <div className="mt-2 flex flex-col gap-1 rounded-md border border-border p-3">
              <p className="font-mono text-sm text-foreground">
                Step #{step.order} · {rankLabel(step.fromRank)} to {rankLabel(step.toRank)}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground">Why this skill? </span>{step.rationale}
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
                  <span className="mr-1 text-sm font-bold text-foreground">Any one of:</span>
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

  const wide = overlay ? "" : "lg:static lg:z-auto lg:w-96 lg:max-w-none lg:shrink-0";
  return (
    <>
      {/* Below 1024 px (or always, with `overlay`) the panel floats over the page; tapping outside closes it. */}
      <div className={`absolute inset-0 z-20 bg-black/40 ${overlay ? "" : "lg:hidden"}`} onClick={onClose} aria-hidden="true" />
      <aside
        className={`absolute inset-y-0 right-0 z-30 w-full sm:max-w-sm overflow-y-auto border-l border-border bg-card ${wide}`}
        aria-label="Skill details"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-5 py-1">
          <p className="text-base font-bold text-foreground">Skill details</p>
          <button
            onClick={onClose}
            aria-label="Close details"
            className="flex h-11 w-11 items-center justify-center rounded-full text-foreground hover:bg-muted"
          >
            <CloseIcon size={18} />
          </button>
        </div>
        {body()}
      </aside>
    </>
  );
}
