import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Card, ProgressBar, ProgressRing, StatTile, StatusBadge, PageLoader, ErrorState, EmptyState } from "@/components/ui";
import { qk, useCompleteSkill, useGraph, useSkillsCatalog } from "@/api/queries";
import { toApiError } from "@/api/client";
import { useCurrentUser } from "@/auth/AuthContext";
import { useEnsureFreshPath } from "@/hooks/useEnsureFreshPath";
import { categoryColor, categoryLabel, formatDate, formatHours } from "@/lib/format";
import { completedForRole, progressFraction, remainingSteps, selectedRankedPath, totalHours } from "@/lib/pathMetrics";
import { computeStepStatuses } from "@/lib/pathStatus";
import { heldRankMap, refId } from "@/lib/requirements";
import { useToast } from "@/context/ToastContext";

// ── Helpers ───────────────────────────────────────────────────────────────────

// Inline colour so categories an admin adds later still get a stable badge colour.
function CategoryBadge({ category }: { category: string }) {
  const color = categoryColor(category);
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-500"
      style={{ backgroundColor: `${color}1a`, color }}
    >
      {categoryLabel(category)}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Progress() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const fresh = useEnsureFreshPath();
  const { isLoading, loadError, isComputing, failure, retry, reload } = fresh;
  // A cached document for a previous role is never shown as this role's checklist.
  const pathDoc = fresh.pathDoc && fresh.pathDoc.targetRoleId === user.targetRoleId?._id ? fresh.pathDoc : null;

  // 400 (no role) or 404 (role deleted) from compute: the user has to pick a role again.
  const needsRole = !!failure && (failure.status === 400 || failure.status === 404);
  useEffect(() => {
    if (!needsRole || !failure) return;
    showToast(failure.message, "error");
    navigate("/onboarding/role", { replace: true });
  }, [needsRole, failure, navigate, showToast]);

  const catalog = useSkillsCatalog();
  const graph = useGraph("full");
  const held = useMemo(() => heldRankMap(user), [user]);

  // Steps completed for this role are filtered out even if a stale path still lists them.
  const completed = useMemo(() => completedForRole(user), [user]);
  const completedIds = useMemo(
    () => new Set(completed.map(c => refId(c.skillId)).filter((id): id is string => !!id)),
    [completed]
  );
  const currentPath = selectedRankedPath(pathDoc, user.selectedPathRank);
  const remaining = useMemo(() => remainingSteps(currentPath, completedIds), [currentPath, completedIds]);
  const steps = useMemo(
    () => computeStepStatuses(remaining, graph.data?.edges, held),
    [remaining, graph.data, held]
  );

  const [domainFilter, setDomainFilter] = useState<string | null>(null);

  const qc = useQueryClient();
  const complete = useCompleteSkill();
  // Set synchronously so a rapid double click can never send a second request.
  const inFlight = useRef(false);
  const busy = complete.isPending || isComputing;

  function handleComplete(skillId: string) {
    if (inFlight.current || busy) return;
    inFlight.current = true;
    const name = skillName(skillId);
    complete.mutate(skillId, {
      onSuccess: (res) => {
        if ("path" in res) {
          // 200: the server already recomputed; show the new document straight away.
          qc.setQueryData(qk.activePath, res.path);
          void qc.invalidateQueries({ queryKey: qk.me });
          void qc.invalidateQueries({ queryKey: ["paths", "history"] });
          void qc.invalidateQueries({ queryKey: ["paths", "alternatives"] });
          void qc.invalidateQueries({ queryKey: qk.graph("path") });
          showToast(`${name} marked complete — path updated`, "success");
        } else {
          // 202: saved, but the path service is down. The path is now stale, so
          // useEnsureFreshPath tries compute and shows the 503 banner with Retry.
          showToast("Saved. Your path will update when the path service is back.", "warning");
          void qc.invalidateQueries({ queryKey: qk.me });
          void qc.invalidateQueries({ queryKey: qk.activePath });
        }
      },
      onError: (err) => {
        const e = toApiError(err);
        showToast(e.status === 409 ? "Already completed" : e.message, e.status === 409 ? "info" : "error");
        // The completion may already be saved, so re-read both.
        void qc.invalidateQueries({ queryKey: qk.me });
        void qc.invalidateQueries({ queryKey: qk.activePath });
      },
      onSettled: () => {
        inFlight.current = false;
      },
    });
  }

  const skillName = (id: string) => catalog.byId.get(id)?.name ?? "Unknown skill";
  const stepCategory = (id: string) => catalog.byId.get(id)?.category ?? "";
  const completedCategory = (c: (typeof completed)[number]) =>
    c.skillId?.category ?? catalog.byId.get(refId(c.skillId) ?? "")?.category ?? "";

  const done = completed.length;
  const total = done + steps.length;
  const remainingHours = totalHours(steps);

  // Domain breakdown: completed and remaining items grouped by category label.
  const domainStats = useMemo(() => {
    const map = new Map<string, { domain: string; doneCnt: number; total: number; remainingHours: number }>();
    const bump = (cat: string, hoursLeft: number | null) => {
      if (!cat) return;
      const domain = categoryLabel(cat);
      const entry = map.get(domain) ?? { domain, doneCnt: 0, total: 0, remainingHours: 0 };
      entry.total += 1;
      if (hoursLeft === null) entry.doneCnt += 1;
      else entry.remainingHours += hoursLeft;
      map.set(domain, entry);
    };
    completed.forEach(c => bump(completedCategory(c), null));
    steps.forEach(s => bump(stepCategory(s.skillId), s.estCost));
    return [...map.values()];
  }, [completed, steps, catalog.byId]);
  const domains = domainStats.map(d => d.domain);

  const inFilter = (cat: string) => !domainFilter || categoryLabel(cat) === domainFilter;
  const visibleCompleted = completed.filter(c => inFilter(completedCategory(c)));
  const visibleSteps = steps.filter(s => inFilter(stepCategory(s.skillId)));

  if (isLoading) return <PageLoader label="Loading your progress…" />;
  if (loadError) return <ErrorState title="Couldn't load your progress" message={loadError.message} onRetry={reload} />;
  if (needsRole) return <PageLoader label="Taking you to role selection…" />;
  if (!user.targetRoleId) {
    return (
      <EmptyState
        icon="🎯"
        title="No target role yet"
        description="Pick a role to get a learning path you can track here."
        action={<Button onClick={() => navigate("/onboarding/role")}>Choose a role</Button>}
      />
    );
  }
  if (!pathDoc) {
    if (isComputing || !failure) return <PageLoader label="Computing your optimal path…" />;
    return (
      <ErrorState
        title={failure.status === 503 ? "Path service unavailable" : "Couldn't compute your path"}
        message={failure.message}
        onRetry={retry}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-800 text-2xl text-foreground mb-1">Progress</h1>
            <p className="text-muted-foreground text-sm">{user.targetRoleId.title}</p>
          </div>
          {busy && (
            <div className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-1.5 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
              <span className="text-xs font-mono text-secondary-foreground">Recalculating…</span>
            </div>
          )}
        </div>

        {failure && (
          <div className="mb-6 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-900/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              {failure.status === 503 ? "Path service unavailable — showing your last computed path" : `${failure.message} — showing your last computed path`}
            </p>
            <Button size="sm" variant="secondary" onClick={retry} disabled={isComputing}>Retry</Button>
          </div>
        )}

        {/* ── Stats row ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatTile label="Completed" value={`${done}/${total}`} sub="skills on this path" />
          <StatTile label="Remaining" value={formatHours(remainingHours)} sub={`${steps.length} skill${steps.length === 1 ? "" : "s"} to go`} />
          <div className="rounded-xl border border-primary/30 p-4 bg-primary/5 flex items-center justify-between gap-2">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Path progress</p>
            <ProgressRing value={progressFraction(done, steps.length)} size={64} stroke={6} />
          </div>
        </div>

        {/* ── Progress bar ────────────────────────────────────────────────── */}
        <div className="mb-8">
          <ProgressBar value={done} max={Math.max(total, 1)} />
          <div className="flex justify-between text-xs font-mono text-muted-foreground mt-1.5">
            <span>{done} skills done</span>
            <span>{steps.length} remaining</span>
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
                <p className="text-xs text-muted-foreground mb-2">{ds.remainingHours > 0 ? `${formatHours(ds.remainingHours)} left` : "Done"}</p>
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
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-muted text-muted-foreground">{domainFilter}</span>
          )}
        </div>
        <div className="flex flex-col gap-2 mb-10">
          {visibleCompleted.length > 0 && (
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mt-2">Completed</p>
          )}
          {visibleCompleted.map(c => {
            const category = completedCategory(c);
            return (
              <div key={c._id} className="rounded-xl border transition-all border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-900/10">
                <div className="flex items-center gap-3 p-3">
                  <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 bg-emerald-500 border-emerald-500 text-white">✓</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-600 text-sm text-foreground">{c.skillId?.name ?? "Deleted skill"}</span>
                      {category && <CategoryBadge category={category} />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Completed {formatDate(c.completedAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status="completed" />
                  </div>
                </div>
              </div>
            );
          })}

          {visibleSteps.length > 0 && (
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mt-2">Remaining</p>
          )}
          {visibleSteps.map(step => {
            const category = stepCategory(step.skillId);
            const isLocked = step.status === "locked";
            const lockHint = isLocked ? `Complete ${step.blockedBy.map(skillName).join(", ")} first` : undefined;

            return (
              <div
                key={step.skillId}
                className={`rounded-xl border transition-all ${
                  isLocked ? "border-border bg-card opacity-50" : "border-primary/30 bg-primary/5"
                }`}
              >
                <div className="flex items-center gap-3 p-3">
                  {/* Checkbox */}
                  <span title={lockHint} className="shrink-0">
                    <button
                      onClick={() => handleComplete(step.skillId)}
                      disabled={isLocked || busy}
                      aria-label={isLocked ? lockHint : `Mark ${skillName(step.skillId)} complete`}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        isLocked || busy
                          ? "border-border cursor-not-allowed"
                          : "border-primary hover:bg-primary hover:text-white cursor-pointer"
                      }`}
                    >
                      {isLocked ? "🔒" : ""}
                    </button>
                  </span>

                  {/* Label + rationale */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">#{step.order}</span>
                      <span className="font-600 text-sm text-foreground">{skillName(step.skillId)}</span>
                      {category && <CategoryBadge category={category} />}
                    </div>
                    {step.rationale && (
                      <p className="text-xs text-muted-foreground italic mt-0.5 truncate">"{step.rationale}"</p>
                    )}
                  </div>

                  {/* Hours + status */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-xs text-muted-foreground hidden sm:inline">{formatHours(step.estCost)}</span>
                    <StatusBadge status={step.status} />
                  </div>
                </div>
              </div>
            );
          })}

          {visibleCompleted.length === 0 && visibleSteps.length === 0 && (
            domainFilter ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No skills in this domain on your current path.
              </div>
            ) : (
              <Card className="p-4">
                <p className="text-sm text-muted-foreground text-center">
                  You already meet every requirement for {user.targetRoleId.title}.
                </p>
              </Card>
            )
          )}
        </div>
      </div>
    </div>
  );
}
