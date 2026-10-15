import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Card, ProgressBar, StatTile, Modal, Button } from "@/components/ui";
import { paths, skills, progressLog } from "@/data/mock";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/context/ToastContext";
import type { NodeStatus, Proficiency } from "@/data/mock";

// ── Helpers ───────────────────────────────────────────────────────────────────

function proficiencyLabel(level?: Proficiency) {
  if (!level) return null;
  const map: Record<Proficiency, { label: string; cls: string }> = {
    beginner:     { label: "Beginner",     cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    intermediate: { label: "Intermediate", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    advanced:     { label: "Advanced",     cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  };
  return map[level];
}

// Domain colours – consistent with Graph Explorer category colours
const domainColors: Record<string, string> = {
  Programming: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  Data:        "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  Math:        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "AI/ML":     "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Engineering: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Frontend:    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Backend:     "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
};

function DomainBadge({ domain }: { domain: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-500 ${domainColors[domain] ?? "bg-muted text-muted-foreground"}`}>
      {domain}
    </span>
  );
}

// ── Expanded skill detail (shared by accordion + modal) ───────────────────────

interface SkillDetailProps {
  skillId: string;
  status: NodeStatus;
  estimatedHours: number;
  hoursLogged: number;
  rationale: string;
  completedAt?: string;
  startedAt?: string;
}

function SkillDetail({ skillId, status, estimatedHours, hoursLogged, rationale, completedAt, startedAt }: SkillDetailProps) {
  const skill = skills.find(s => s.id === skillId);
  if (!skill) return null;
  const prof = proficiencyLabel(skill.proficiencyAchieved);

  return (
    <div className="flex flex-col gap-4 pt-3 pb-1">
      {/* What you learned */}
      <div>
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">What you learned</p>
        <ul className="flex flex-col gap-1.5">
          {skill.learningOutcomes.map((o, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
              <span className="text-sm text-foreground">{o}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-border">
        {/* Proficiency achieved */}
        {prof && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Proficiency:</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-500 ${prof.cls}`}>{prof.label}</span>
          </div>
        )}

        {/* Hours */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Hours:</span>
          <span className="font-mono text-xs text-foreground">{hoursLogged}h logged / {estimatedHours}h estimated</span>
        </div>

        {/* Date */}
        {completedAt && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Completed:</span>
            <span className="font-mono text-xs text-foreground">{completedAt}</span>
          </div>
        )}
        {!completedAt && startedAt && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Started:</span>
            <span className="font-mono text-xs text-foreground">{startedAt}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Progress() {
  const { selectedPath } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const path = paths.find(p => p.id === selectedPath) ?? paths[0];

  const [nodeStates, setNodeStates] = useState<Record<string, NodeStatus>>(
    Object.fromEntries(path.nodes.map(n => [n.skillId, n.status]))
  );
  const [recalculating, setRecalculating] = useState(false);
  const [completedLog, setCompletedLog] = useState(progressLog);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [domainFilter, setDomainFilter] = useState<string | null>(null);
  const [detailModal, setDetailModal] = useState<string | null>(null);

  async function handleComplete(skillId: string) {
    setRecalculating(true);
    await new Promise(r => setTimeout(r, 1800));
    setNodeStates(prev => {
      const next = { ...prev, [skillId]: "completed" as NodeStatus };
      const nodeIdx = path.nodes.findIndex(n => n.skillId === skillId);
      if (nodeIdx < path.nodes.length - 1) {
        const nextId = path.nodes[nodeIdx + 1].skillId;
        if (next[nextId] === "locked") next[nextId] = "unlocked";
      }
      return next;
    });
    setCompletedLog(prev => [...prev, { skillId, completedAt: new Date().toISOString().slice(0, 10) }]);
    setRecalculating(false);
    const skill = skills.find(s => s.id === skillId);
    showToast(`${skill?.name} marked complete! Path updated.`, "success");
  }

  function toggleRow(skillId: string) {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(skillId) ? next.delete(skillId) : next.add(skillId);
      return next;
    });
  }

  const completed = Object.values(nodeStates).filter(s => s === "completed").length;
  const total = path.nodes.length;
  const completedHours = path.nodes
    .filter(n => nodeStates[n.skillId] === "completed")
    .reduce((a, n) => a + n.estimatedHours, 0);

  // Domain breakdown data
  const domains = [...new Set(
    path.nodes.map(n => skills.find(s => s.id === n.skillId)?.category).filter(Boolean) as string[]
  )];

  const domainStats = domains.map(domain => {
    const domainNodes = path.nodes.filter(n => skills.find(s => s.id === n.skillId)?.category === domain);
    const doneCnt = domainNodes.filter(n => nodeStates[n.skillId] === "completed").length;
    const logged = domainNodes.reduce((a, n) => {
      const sk = skills.find(s => s.id === n.skillId);
      return a + (nodeStates[n.skillId] === "completed" ? (sk?.hoursLogged ?? n.estimatedHours) : 0);
    }, 0);
    const totalDomainHours = domainNodes.reduce((a, n) => a + n.estimatedHours, 0);
    return { domain, doneCnt, total: domainNodes.length, logged, totalHours: totalDomainHours };
  });

  // Filtered checklist nodes
  const filteredNodes = domainFilter
    ? path.nodes.filter(n => skills.find(s => s.id === n.skillId)?.category === domainFilter)
    : path.nodes;

  const modalSkillNode = path.nodes.find(n => n.skillId === detailModal);
  const modalSkill = skills.find(s => s.id === detailModal);
  const modalCompletedAt = completedLog.find(e => e.skillId === detailModal)?.completedAt;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-800 text-2xl text-foreground mb-1">Progress</h1>
            <p className="text-muted-foreground text-sm">{path.name}</p>
          </div>
          {recalculating && (
            <div className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-1.5 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
              <span className="text-xs font-mono text-secondary-foreground">Recalculating…</span>
            </div>
          )}
        </div>

        {/* ── Stats row ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatTile label="Completed" value={`${completed}/${total}`} />
          <StatTile label="Hours logged" value={`${completedHours}h`} />
          <StatTile label="Path progress" value={`${Math.round((completed / total) * 100)}%`} accent />
        </div>

        {/* ── Progress bar ────────────────────────────────────────────────── */}
        <div className="mb-8">
          <ProgressBar value={completed} max={total} />
          <div className="flex justify-between text-xs font-mono text-muted-foreground mt-1.5">
            <span>{completed} skills done</span>
            <span>{total - completed} remaining</span>
          </div>
        </div>

        {/* ── Domain Breakdown ────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-700 text-base text-foreground">Domain Breakdown</h2>
            {domainFilter && (
              <button
                onClick={() => setDomainFilter(null)}
                className="text-xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                ✕ Clear filter
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={() => setDomainFilter(null)}
              className={`px-2.5 py-1 rounded-full text-xs font-mono font-500 border transition-all ${
                !domainFilter
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              All domains
            </button>
            {domains.map(d => (
              <button
                key={d}
                onClick={() => setDomainFilter(d === domainFilter ? null : d)}
                className={`px-2.5 py-1 rounded-full text-xs font-mono font-500 border transition-all ${
                  domainFilter === d
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <div className={`grid gap-3 ${domainStats.length <= 2 ? "grid-cols-2" : domainStats.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
            {domainStats.map(ds => (
              <div
                key={ds.domain}
                onClick={() => setDomainFilter(ds.domain === domainFilter ? null : ds.domain)}
                className={`bg-card border rounded-xl p-3 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
                  domainFilter === ds.domain ? "ring-2 ring-primary border-primary" : "border-border"
                }`}
              >
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1 truncate">{ds.domain}</p>
                <p className="font-display font-800 text-lg text-foreground mb-0.5">{ds.doneCnt}/{ds.total}</p>
                <p className="text-xs text-muted-foreground mb-2">{ds.logged}h logged</p>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${ds.total > 0 ? Math.round((ds.doneCnt / ds.total) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Skill Checklist ─────────────────────────────────────────────── */}
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display font-700 text-base text-foreground">Skill Checklist</h2>
          {domainFilter && (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono ${domainColors[domainFilter] ?? "bg-muted text-muted-foreground"}`}>
              {domainFilter}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2 mb-10">
          {filteredNodes.map(node => {
            const skill = skills.find(s => s.id === node.skillId);
            const status = nodeStates[node.skillId] ?? node.status;
            const isLocked = status === "locked";
            const isDone = status === "completed";
            const isActive = status === "in-progress" || status === "unlocked";
            const isExpanded = expandedRows.has(node.skillId);
            const completedAt = completedLog.find(e => e.skillId === node.skillId)?.completedAt;

            return (
              <div
                key={node.skillId}
                className={`rounded-xl border transition-all ${
                  isDone ? "border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-900/10" :
                  isActive ? "border-primary/30 bg-primary/5" :
                  "border-border bg-card opacity-50"
                }`}
              >
                {/* ── Row header ── */}
                <div className="flex items-center gap-3 p-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => !isDone && isActive && handleComplete(node.skillId)}
                    disabled={isDone || isLocked || recalculating}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      isDone   ? "bg-emerald-500 border-emerald-500 text-white cursor-default" :
                      isActive ? "border-primary hover:bg-primary hover:text-white cursor-pointer" :
                      "border-border cursor-not-allowed"
                    }`}
                  >
                    {isDone ? "✓" : isLocked ? "🔒" : ""}
                  </button>

                  {/* Label + rationale */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">#{node.order}</span>
                      <span className={`font-600 text-sm ${isDone ? "text-foreground" : "text-foreground"}`}>
                        {skill?.name}
                      </span>
                      {skill?.category && <DomainBadge domain={skill.category} />}
                    </div>
                    {!isExpanded && (
                      <p className="text-xs text-muted-foreground italic mt-0.5 truncate">"{node.rationale}"</p>
                    )}
                  </div>

                  {/* Hours + status + chevron */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-xs text-muted-foreground hidden sm:inline">{node.estimatedHours}h</span>
                    <Badge variant={status}>{status === "in-progress" ? "Active" : status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
                    {!isLocked && (
                      <button
                        onClick={() => toggleRow(node.skillId)}
                        className={`w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-all ${isExpanded ? "rotate-180" : ""}`}
                        aria-label={isExpanded ? "Collapse" : "Expand"}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Expanded content ── */}
                {isExpanded && !isLocked && (
                  <div className="px-4 pb-4 border-t border-border/60 mt-0">
                    {/* Rationale always visible when expanded too */}
                    <p className="text-xs text-muted-foreground italic mt-3 mb-1">"{node.rationale}"</p>
                    <SkillDetail
                      skillId={node.skillId}
                      status={status}
                      estimatedHours={node.estimatedHours}
                      hoursLogged={skill?.hoursLogged ?? 0}
                      rationale={node.rationale}
                      completedAt={completedAt}
                      startedAt={status === "in-progress" ? "2025-01-08" : undefined}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {filteredNodes.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No skills in this domain on your current path.
            </div>
          )}
        </div>

        {/* ── Completion History ──────────────────────────────────────────── */}
        <h2 className="font-display font-700 text-base text-foreground mb-4">Completion History</h2>
        <Card className="divide-y divide-border">
          {completedLog.length === 0 && (
            <p className="text-sm text-muted-foreground p-4 text-center">No skills completed yet.</p>
          )}
          {[...completedLog].reverse().map((entry, i) => {
            const skill = skills.find(s => s.id === entry.skillId);
            const prof = proficiencyLabel(skill?.proficiencyAchieved);
            return (
              <div key={i} className="flex items-center gap-2 px-4 py-3 flex-wrap">
                {/* Left: dot + name + badges */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-sm text-foreground font-500">{skill?.name ?? entry.skillId}</span>
                  {skill?.category && <DomainBadge domain={skill.category} />}
                  {prof && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-500 ${prof.cls}`}>{prof.label}</span>
                  )}
                </div>

                {/* Right: date + view details */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-xs text-muted-foreground">{entry.completedAt}</span>
                  <button
                    onClick={() => setDetailModal(entry.skillId)}
                    className="text-xs text-primary hover:underline font-500"
                  >
                    View details
                  </button>
                </div>
              </div>
            );
          })}
        </Card>
      </div>

      {/* ── Skill detail modal ──────────────────────────────────────────────── */}
      <Modal
        open={!!detailModal}
        onClose={() => setDetailModal(null)}
        title={modalSkill?.name ?? "Skill Details"}
      >
        {detailModal && modalSkillNode && (
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {modalSkill?.category && <DomainBadge domain={modalSkill.category} />}
              {modalSkill?.proficiencyAchieved && (() => {
                const p = proficiencyLabel(modalSkill.proficiencyAchieved);
                return p ? <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-500 ${p.cls}`}>{p.label}</span> : null;
              })()}
            </div>
            <p className="text-sm text-muted-foreground mb-4">{modalSkill?.description}</p>
            <SkillDetail
              skillId={detailModal}
              status={nodeStates[detailModal] ?? modalSkillNode.status}
              estimatedHours={modalSkillNode.estimatedHours}
              hoursLogged={modalSkill?.hoursLogged ?? 0}
              rationale={modalSkillNode.rationale}
              completedAt={modalCompletedAt}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
