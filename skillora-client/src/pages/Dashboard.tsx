import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button, Badge, Card, PageLoader, ErrorState, EmptyState } from "@/components/ui";
import { ArrowIcon, CheckIcon, LineDiagram, ServiceList, ServiceRow, SignPanel, WarningIcon } from "@/components/transit";
import type { LineStop, StopState } from "@/components/transit";
import SkillDetailPanel from "@/components/SkillDetailPanel";
import JourneyClock from "@/components/progress/JourneyClock";
import { landingGraph } from "@/content/landingGraph";
import { useGraph, useSelectPath, useSkillsCatalog } from "@/api/queries";
import { useCurrentUser } from "@/auth/AuthContext";
import { useEnsureFreshPath } from "@/hooks/useEnsureFreshPath";
import { demandWord, formatDate, formatHours, formatPercent, pluralize, rankLabel } from "@/lib/format";
import {
  completedForRole, estWeeks, orChoiceDiff, pathLabel, progressFraction, remainingSteps, selectedRankedPath, totalHours,
} from "@/lib/pathMetrics";
import { computeStepStatuses } from "@/lib/pathStatus";
import { heldRankMap, refId } from "@/lib/requirements";
import { useToast } from "@/context/ToastContext";
import type { NodeStatus } from "@/lib/types";

const STOP_STATE: Record<NodeStatus, StopState> = { completed: "done", "in-progress": "current", unlocked: "next", locked: "locked" };
const STATUS_WORD: Record<NodeStatus, string> = { completed: "Completed", "in-progress": "Up next", unlocked: "Available", locked: "Locked" };
const STATUS_COLOR: Record<NodeStatus, string> = { completed: "var(--line-route)", "in-progress": "var(--line-route)", unlocked: "var(--foreground)", locked: "var(--line-grey)" };

export default function Dashboard() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const fresh = useEnsureFreshPath();
  const { isLoading, loadError, isComputing, failure, retry, reload } = fresh;
  // A cached document for a previous role is never shown as this role's roadmap.
  const pathDoc = fresh.pathDoc && fresh.pathDoc.targetRoleId === user.targetRoleId?._id ? fresh.pathDoc : null;

  // 400 (no role) or 404 (role deleted) from compute: the user has to pick a role again.
  const needsRole = !!failure && (failure.status === 400 || failure.status === 404);
  useEffect(() => {
    if (!needsRole || !failure) return;
    showToast(failure.message, "error");
    navigate("/onboarding/role", { replace: true });
  }, [needsRole, failure, navigate, showToast]);

  // Steps completed for this role are filtered out even if a stale path still lists them.
  const completed = useMemo(() => completedForRole(user), [user]);
  const completedIds = useMemo(
    () => new Set(completed.map(c => refId(c.skillId)).filter((id): id is string => !!id)),
    [completed]
  );
  const currentPath = selectedRankedPath(pathDoc, user.selectedPathRank);
  const remaining = useMemo(() => remainingSteps(currentPath, completedIds), [currentPath, completedIds]);
  const remainingHours = totalHours(remaining);

  const catalog = useSkillsCatalog();
  const graph = useGraph("full");
  const held = useMemo(() => heldRankMap(user), [user]);
  const steps = useMemo(
    () => computeStepStatuses(remaining, graph.data?.edges, held),
    [remaining, graph.data, held]
  );
  const skillName = (id: string) => catalog.byId.get(id)?.name ?? "Unknown skill";

  const selectPath = useSelectPath();
  const otherPaths = (pathDoc?.paths ?? []).filter(p => p.rank !== currentPath?.rank);

  function handleSelectPath(rank: number) {
    selectPath.mutate(rank, {
      onSuccess: () => showToast(`Switched to ${pathLabel(rank)}`, "success"),
      onError: (err) => showToast(err.message, "error"),
    });
  }
  const weeks = estWeeks(remainingHours);

  // Clicking a stop opens its skill sign (the same panel the graph uses).
  const [openSkillId, setOpenSkillId] = useState<string | null>(null);
  const closeSkill = useCallback(() => setOpenSkillId(null), []);

  if (isLoading) return <PageLoader label="Loading your roadmap…" />;
  if (loadError) return <ErrorState title="Couldn't load your roadmap" message={loadError.message} onRetry={reload} />;
  if (needsRole) return <PageLoader label="Taking you to role selection…" />;
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

  const roleTitle = user.targetRoleId?.title ?? "this role";
  const alreadyQualified = !currentPath || remaining.length === 0;

  const stops: LineStop[] = [
    ...completed.map(c => ({
      key: c._id,
      state: "done" as StopState,
      label: c.skillId?.name ?? "Deleted skill",
      detail: <>Completed {formatDate(c.completedAt)}</>,
      onSelect: refId(c.skillId) ? () => setOpenSkillId(refId(c.skillId)) : undefined,
    })),
    ...steps.map(step => {
      const skill = catalog.byId.get(step.skillId);
      return {
        key: step.skillId,
        state: STOP_STATE[step.status],
        label: skill?.name ?? "Unknown skill",
        hours: formatHours(step.estCost),
        onSelect: () => setOpenSkillId(step.skillId),
        detail: (
          <>
            <span className="font-mono">{rankLabel(step.fromRank)} to {rankLabel(step.toRank)}</span>
            {step.rationale && <span className="mt-1 block"><span className="font-bold text-foreground">Why this skill? </span>{step.rationale}</span>}
            {step.status === "locked" && step.blockedBy.length > 0 && (
              <span className="mt-1 block">Needs {step.blockedBy.map(skillName).join(", ")} first.</span>
            )}
          </>
        ),
        action: step.status !== "locked" ? (
          <Link to="/progress" className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-foreground underline underline-offset-4 hover:bg-muted">
            Mark complete in Progress <ArrowIcon size={14} />
          </Link>
        ) : undefined,
      };
    }),
  ];

  const lockedCount = steps.filter(s => s.status === "locked").length;
  const e = landingGraph.facts.evaluation;
  const openStep = openSkillId ? steps.find(s => s.skillId === openSkillId) : undefined;
  const openStatus: NodeStatus = openStep ? openStep.status : completedIds.has(openSkillId ?? "") ? "completed" : "unlocked";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {failure && (
          <div className="mb-6 flex flex-col justify-between gap-3 rounded-md border border-border border-t-4 border-t-line-design bg-card p-4 sm:flex-row sm:items-center">
            <p className="flex items-start gap-2 text-base text-foreground">
              <WarningIcon size={20} className="mt-0.5 shrink-0" />
              {failure.status === 503 ? "Path service unavailable — showing your last computed path" : `${failure.message} — showing your last computed path`}
            </p>
            <Button size="sm" variant="secondary" onClick={retry} disabled={isComputing}>Retry</Button>
          </div>
        )}
        {isComputing && (
          <div className="mb-4">
            <Badge variant="in-progress">Recalculating…</Badge>
          </div>
        )}
        <div className={isComputing ? "pointer-events-none opacity-50 transition-opacity" : "transition-opacity"} aria-busy={isComputing}>
        {/* Header */}
        <div className="mb-8">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <h1 className="font-display text-3xl font-extrabold leading-tight text-foreground md:text-4xl">Your line to {user.targetRoleId?.title}</h1>
              <p className="mt-2 font-mono text-base text-foreground">
                {currentPath ? pathLabel(currentPath.rank) : "No route"} · {formatHours(currentPath?.totalLearningCost ?? 0)} in all · {formatHours(remainingHours)} to go{weeks > 0 ? ` · about ${pluralize(weeks, "week")} at 10h a week` : ""}
              </p>
              <p className="mt-1 font-mono text-sm text-muted-foreground">
                {pathDoc.algorithm === "a_star" ? "A*" : pathDoc.algorithm} · {pathDoc.stats.statesExpanded} states · {pathDoc.stats.elapsedMs.toFixed(1)} ms · generated {formatDate(pathDoc.generatedAt)}
              </p>
              {pathDoc.stats.capped && (
                <p className="mt-1 text-sm font-bold text-foreground">Search limit reached — best routes found so far</p>
              )}
              {pathDoc.algorithm === "greedy_fallback" && (
                <p className="mt-1 text-sm font-bold text-foreground">Approximate route (search limit reached)</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => navigate("/dashboard/alternatives")}>Compare paths</Button>
              <Button variant="secondary" size="sm" onClick={() => navigate("/graph")}>View graph</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/onboarding/role")}>Change role</Button>
            </div>
          </div>

          <SignPanel rule="var(--line-route)" className="p-5">
            <JourneyClock
              value={progressFraction(completed.length, remaining.length)}
              end={roleTitle}
              caption={`${completed.length} of ${completed.length + remaining.length} stops done`}
            />
          </SignPanel>
        </div>

        {alreadyQualified ? (
          <EmptyState
            icon={<CheckIcon size={28} />}
            title={`You already meet every requirement for ${roleTitle}`}
            description="There is nothing left to learn for this role. Pick another role to keep growing."
            action={<Button onClick={() => navigate("/onboarding/role")}>Change role</Button>}
          />
        ) : (
        <>
        <div className="grid gap-10 lg:grid-cols-3">
          {/* The line */}
          <section className="lg:col-span-2" aria-labelledby="line-h">
            <h2 id="line-h" className="mb-5 font-display text-xl font-extrabold text-foreground">Your stops</h2>
            <LineDiagram stops={stops} label={`Learning path to ${roleTitle}`} />
          </section>

          {/* Other routes */}
          <section aria-labelledby="alt-h">
            <h2 id="alt-h" className="mb-5 font-display text-xl font-extrabold text-foreground">Other routes</h2>
            <div className="flex flex-col gap-3">
              {pathDoc.paths.length === 1 && (
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">Only one route exists for your profile.</p>
                </Card>
              )}
              {otherPaths.map(path => {
                const diff = currentPath ? orChoiceDiff(path, currentPath) : { added: [], removed: [] };
                return (
                  <SignPanel key={path.rank} rule="var(--line-alt)" className="p-4">
                    <p className="font-display text-base font-extrabold text-foreground">{pathLabel(path.rank)}</p>
                    <p className="mb-3 font-mono text-sm text-muted-foreground">
                      {formatHours(path.totalLearningCost)} · {pluralize(path.steps.length, "skill")}
                    </p>
                    <dl className="mb-3 flex flex-col gap-1 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted-foreground">Demand</dt>
                        <dd className="text-foreground"><span className="font-bold">{demandWord(path.marketDemandAvg)}</span> <span className="font-mono text-muted-foreground">{formatPercent(path.marketDemandAvg)}</span></dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted-foreground">Score (lower is better)</dt>
                        <dd className="font-mono text-foreground">{path.compositeScore.toFixed(3)}</dd>
                      </div>
                    </dl>
                    {(diff.added.length > 0 || diff.removed.length > 0) && (
                      <p className="flex flex-col gap-0.5 text-sm text-foreground">
                        {diff.added.length > 0 && <span><span className="font-bold">Adds</span> {diff.added.map(skillName).join(", ")}</span>}
                        {diff.removed.length > 0 && <span><span className="font-bold">Drops</span> {diff.removed.map(skillName).join(", ")}</span>}
                      </p>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-3 w-full justify-center"
                      disabled={selectPath.isPending}
                      onClick={() => handleSelectPath(path.rank)}
                    >
                      Select this path
                    </Button>
                  </SignPanel>
                );
              })}

              <Card className="border-dashed p-4">
                <p className="mb-2 text-center text-sm text-muted-foreground">Want to see them side by side?</p>
                <Button size="sm" variant="ghost" className="w-full" onClick={() => navigate("/dashboard/alternatives")}>
                  Compare all paths <ArrowIcon size={14} />
                </Button>
              </Card>
            </div>
          </section>
        </div>

        <section className="mt-14" aria-labelledby="service-h">
          <h2 id="service-h" className="font-display text-xl font-extrabold text-foreground">Service status</h2>
          <ServiceList className="mt-4">
            <ServiceRow tag="Time" color="var(--line-route)">
              {formatHours(remainingHours)} still to go on your line. Across {e.profiles} test journeys, plans were {e.meanSavedPct.toFixed(1)}% shorter on average than a generic roadmap.
            </ServiceRow>
            <ServiceRow tag="Order" color="var(--line-web)">
              Good service: no stop comes before what it needs.{lockedCount > 0 ? ` ${pluralize(lockedCount, "stop")} ${lockedCount === 1 ? "is" : "are"} waiting for an earlier one.` : " Everything left is ready to start."}
            </ServiceRow>
            <ServiceRow tag="Plan" color="var(--line-data)">
              {isComputing || pathDoc.status === "stale"
                ? "Recomputing your plan now."
                : `Your plan is up to date, built ${formatDate(pathDoc.generatedAt)}.`}
            </ServiceRow>
          </ServiceList>
        </section>
        </>
        )}
        </div>
      </div>

      {openSkillId && (
        <div className="fixed inset-0 z-[60]">
          <SkillDetailPanel
            key={openSkillId}
            overlay
            skillId={openSkillId}
            status={{ label: STATUS_WORD[openStatus], color: STATUS_COLOR[openStatus] }}
            step={openStep}
            nameOf={skillName}
            onSelect={setOpenSkillId}
            onClose={closeSkill}
          />
        </div>
      )}
    </div>
  );
}
