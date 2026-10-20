import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Modal, PageLoader, ErrorState, EmptyState } from "@/components/ui";
import { WarningIcon, RouteIcon } from "@/components/transit";
import { qk, useCompleteSkill, useGraph, usePathHistory, useRoles, useSkillDetail, useSkillsCatalog, useUncompleteSkill } from "@/api/queries";
import { toApiError } from "@/api/client";
import { useCurrentUser } from "@/auth/AuthContext";
import { useEnsureFreshPath } from "@/hooks/useEnsureFreshPath";
import { categoryLabel, formatHours } from "@/lib/format";
import { completedForRole, progressFraction, remainingSteps, selectedRankedPath, totalHours } from "@/lib/pathMetrics";
import { computeStepStatuses, prerequisiteGroups } from "@/lib/pathStatus";
import { heldRankMap, refId } from "@/lib/requirements";
import { useToast } from "@/context/ToastContext";
import CategoryBadge from "@/components/progress/CategoryBadge";
import CompletionHistory from "@/components/progress/CompletionHistory";
import DomainBreakdown from "@/components/progress/DomainBreakdown";
import JourneyClock from "@/components/progress/JourneyClock";
import NextDepartures from "@/components/progress/NextDepartures";
import PathHistory from "@/components/progress/PathHistory";
import SkillChecklist from "@/components/progress/SkillChecklist";
import SkillDetail from "@/components/progress/SkillDetail";

// The journey log. State, queries and the mark-complete mutation live here; the sections are in
// src/components/progress/*.

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
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [historyScope, setHistoryScope] = useState<"all" | "role">("all");
  const [detailEntryId, setDetailEntryId] = useState<string | null>(null);

  // Completion history across every role (or just this one), newest first.
  const history = useMemo(() => {
    const roleId = user.targetRoleId?._id;
    return user.completedSkills
      .filter(c => historyScope === "all" || c.targetRoleId === roleId)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  }, [user, historyScope]);
  const detailEntry = user.completedSkills.find(c => c._id === detailEntryId) ?? null;
  const skillDetail = useSkillDetail(refId(detailEntry?.skillId));
  const closeDetail = useCallback(() => setDetailEntryId(null), []);

  const pathHistory = usePathHistory();
  const roles = useRoles();
  const roleTitles = useMemo(() => new Map((roles.data ?? []).map(r => [r._id, r.title])), [roles.data]);
  const [historyLimit, setHistoryLimit] = useState(10);

  function toggleRow(key: string) {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const prerequisiteNames = (id: string) =>
    prerequisiteGroups(id, graph.data?.edges).map(options => options.map(skillName).join(" or "));

  const qc = useQueryClient();
  const complete = useCompleteSkill();
  const uncomplete = useUncompleteSkill();
  // Set synchronously so a rapid double click can never send a second request.
  const inFlight = useRef(false);
  const busy = complete.isPending || uncomplete.isPending || isComputing;

  // Both directions end the same way: 200 carries the recomputed document, 202 means it is pending.
  function applyResult(res: Awaited<ReturnType<typeof complete.mutateAsync>>, onPath: () => void, pendingMessage: string) {
    if ("path" in res) {
      // 200: the server already recomputed; show the new document straight away.
      qc.setQueryData(qk.activePath, res.path);
      void qc.invalidateQueries({ queryKey: qk.me });
      void qc.invalidateQueries({ queryKey: ["paths", "history"] });
      void qc.invalidateQueries({ queryKey: ["paths", "alternatives"] });
      void qc.invalidateQueries({ queryKey: qk.graph("path") });
      onPath();
    } else {
      // 202: saved, but the path service is down. The path is now stale, so
      // useEnsureFreshPath tries compute and shows the 503 banner with Retry.
      showToast(pendingMessage, "warning");
      void qc.invalidateQueries({ queryKey: qk.me });
      void qc.invalidateQueries({ queryKey: qk.activePath });
    }
  }

  function handleComplete(skillId: string) {
    if (inFlight.current || busy) return;
    inFlight.current = true;
    const name = skillName(skillId);
    complete.mutate(skillId, {
      onSuccess: (res) => {
        applyResult(
          res,
          () => showToast(`${name} marked complete, path updated`, "success", {
            action: { label: "Undo", onClick: () => handleUncomplete(skillId) },
          }),
          "Saved. Your path will update when the path service is back."
        );
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

  // Undo a completion (from the toast or the checklist). Shares the in-flight guard with completing.
  function handleUncomplete(skillId: string) {
    if (inFlight.current) return;
    inFlight.current = true;
    const name = skillName(skillId);
    uncomplete.mutate(skillId, {
      onSuccess: (res) => {
        applyResult(res, () => showToast(`${name} is back on your path`, "success"), "Undone. Your path will update when the path service is back.");
      },
      onError: (err) => {
        const e = toApiError(err);
        showToast(e.status === 404 ? "That skill is no longer marked complete" : e.message, e.status === 404 ? "info" : "error");
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
        icon={<RouteIcon size={28} />}
        title="No target role yet"
        description="Pick a role to get a learning path you can track here."
        action={<Button onClick={() => navigate("/onboarding/role")}>Choose a role</Button>}
      />
    );
  }
  if (!pathDoc) {
    if (isComputing || !failure) return <PageLoader label="Computing your optimal path…" waking />;
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
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-extrabold text-foreground">Journey log</h1>
            <p className="mt-1 text-base text-muted-foreground">Your line to {user.targetRoleId.title}</p>
          </div>
          {busy && <Badge variant="in-progress">Recalculating…</Badge>}
        </div>

        {failure && (
          <div className="mb-6 flex flex-col justify-between gap-3 rounded-md border border-border border-t-4 border-t-line-design bg-card p-4 sm:flex-row sm:items-center">
            <p className="flex items-start gap-2 text-base text-foreground">
              <WarningIcon size={20} className="mt-0.5 shrink-0" />
              {failure.status === 503 ? "Path service unavailable — showing your last computed path" : `${failure.message} — showing your last computed path`}
            </p>
            <Button size="sm" variant="secondary" onClick={retry} disabled={isComputing}>Retry</Button>
          </div>
        )}

        {/* ── Journey clock ───────────────────────────────────────────────── */}
        <div className="mb-10 rounded-md border border-border bg-card p-5">
          <JourneyClock
            value={progressFraction(done, steps.length)}
            end={user.targetRoleId.title}
            caption={`${done} of ${total} stops · ${steps.length === 0 ? "arrived" : `${formatHours(remainingHours)} to go`}`}
          />
        </div>

        <NextDepartures steps={steps} skillName={skillName} stepCategory={stepCategory} />

        <DomainBreakdown domainStats={domainStats} domainFilter={domainFilter} setDomainFilter={setDomainFilter} />

        <SkillChecklist
          domainFilter={domainFilter}
          visibleCompleted={visibleCompleted}
          visibleSteps={visibleSteps}
          expandedRows={expandedRows}
          toggleRow={toggleRow}
          completedCategory={completedCategory}
          stepCategory={stepCategory}
          skillName={skillName}
          skillById={(id) => catalog.byId.get(id)}
          prerequisiteNames={prerequisiteNames}
          handleComplete={handleComplete}
          handleUncomplete={handleUncomplete}
          busy={busy}
          roleTitle={user.targetRoleId.title}
        />

        <CompletionHistory
          history={history}
          historyScope={historyScope}
          setHistoryScope={setHistoryScope}
          completedCategory={completedCategory}
          onViewDetails={setDetailEntryId}
        />

        <PathHistory
          pathHistory={pathHistory}
          historyLimit={historyLimit}
          setHistoryLimit={setHistoryLimit}
          roleTitles={roleTitles}
          expandedRows={expandedRows}
          toggleRow={toggleRow}
          skillName={skillName}
        />
      </div>

      {/* ── Skill detail modal ──────────────────────────────────────────────── */}
      <Modal open={!!detailEntry} onClose={closeDetail} title={detailEntry?.skillId?.name ?? "Skill details"}>
        {detailEntry && (
          skillDetail.isPending ? (
            <PageLoader label="Loading skill…" />
          ) : skillDetail.error ? (
            <ErrorState title="Couldn't load this skill" message={toApiError(skillDetail.error).message} onRetry={() => void skillDetail.refetch()} />
          ) : skillDetail.data ? (
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CategoryBadge category={skillDetail.data.category} />
              </div>
              <SkillDetail
                description={skillDetail.data.description}
                hours={skillDetail.data.estHours}
                prerequisites={prerequisiteGroups(
                  skillDetail.data._id,
                  skillDetail.data.edges.map(e => ({ source: e.sourceSkillId, target: e.targetSkillId, type: e.type, group: e.group }))
                ).map(options => options.map(skillName).join(" or "))}
                completedAt={detailEntry.completedAt}
                proficiency={detailEntry.proficiency}
              />
            </div>
          ) : null
        )}
      </Modal>
    </div>
  );
}
