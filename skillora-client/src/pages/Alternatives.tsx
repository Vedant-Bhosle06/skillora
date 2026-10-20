import React from "react";
import { useNavigate } from "react-router-dom";
import { Button, Badge, PageLoader, ErrorState, EmptyState } from "@/components/ui";
import { ArrowIcon, CheckIcon, RouteIcon, SignPanel } from "@/components/transit";
import { useAlternatives, useSelectPath, useSkillsCatalog } from "@/api/queries";
import { useCurrentUser } from "@/auth/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useEnsureFreshPath } from "@/hooks/useEnsureFreshPath";
import RouteMap from "@/components/RouteMap";
import TradeoffChart from "@/components/TradeoffChart";
import { demandWord, formatHours, formatPercent, pluralize } from "@/lib/format";
import { orChoiceDiff, pathLabel } from "@/lib/pathMetrics";

export default function Alternatives() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const fresh = useEnsureFreshPath();
  const pathDoc = fresh.pathDoc && fresh.pathDoc.targetRoleId === user.targetRoleId?._id ? fresh.pathDoc : null;
  const alternatives = useAlternatives(pathDoc?._id ?? null);
  const catalog = useSkillsCatalog();
  const selectPath = useSelectPath();
  const { showToast } = useToast();

  const skillName = (id: string) => catalog.byId.get(id)?.name ?? "Unknown skill";

  function handleSelect(rank: number) {
    selectPath.mutate(rank, {
      onSuccess: () => {
        showToast(`Switched to ${pathLabel(rank)} — your roadmap has been updated.`, "success");
        navigate("/dashboard");
      },
      onError: (err) => showToast(err.message, "error"),
    });
  }

  function renderBody() {
    if (fresh.isLoading) return <PageLoader label="Loading your paths…" />;
    if (fresh.loadError) {
      return <ErrorState title="Couldn't load your paths" message={fresh.loadError.message} onRetry={fresh.reload} />;
    }
    if (!pathDoc) {
      if (fresh.isComputing) return <PageLoader label="Computing your optimal path…" waking />;
      return (
        <EmptyState
          icon={<RouteIcon size={28} />}
          title="No path yet"
          description={fresh.failure?.message ?? "Open the Dashboard to compute your learning path first."}
          action={<Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>}
        />
      );
    }
    if (alternatives.isPending) return <PageLoader label="Loading alternatives…" />;
    if (alternatives.isError) {
      return <ErrorState title="Couldn't load alternatives" message={alternatives.error.message} onRetry={() => alternatives.refetch()} />;
    }

    const paths = alternatives.data.paths;
    if (paths.length === 0) {
      return <EmptyState icon={<RouteIcon size={28} />} title="No routes found" description="The path service returned no routes for your profile." />;
    }

    const primary = paths.find(p => p.rank === 1) ?? paths[0];

    return (
      <>
      {paths.length === 1 && (
        <SignPanel className="mb-6 p-4">
          <p className="text-base text-muted-foreground">Only one route exists for your profile.</p>
        </SignPanel>
      )}

      <section className="mb-10" aria-labelledby="map-h">
        <h2 id="map-h" className="mb-5 font-display text-xl font-extrabold text-foreground">The routes on one map</h2>
        <SignPanel className="p-5">
          <RouteMap paths={paths} skillName={skillName} currentRank={user.selectedPathRank} />
        </SignPanel>
      </section>

      <section className="mb-10" aria-labelledby="compare-h">
        <h2 id="compare-h" className="mb-5 font-display text-xl font-extrabold text-foreground">Compare the routes</h2>
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <div className="flex items-center justify-between bg-foreground px-5 py-3 text-background">
            <span className="text-[15px] font-extrabold">Routes to your role</span>
            <span className="font-mono text-[13px]">{pluralize(paths.length, "route")}</span>
          </div>
          <ul className="divide-y divide-border">
            {paths.map(path => {
              const isCurrent = path.rank === user.selectedPathRank;
              const diff = path.rank === primary.rank ? null : orChoiceDiff(path, primary);
              return (
                <li key={path.rank} className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="font-display text-lg font-extrabold text-foreground">
                        {path.rank === 1 ? "Primary (recommended)" : pathLabel(path.rank)}
                      </p>
                      {isCurrent && <Badge variant="in-progress">Active</Badge>}
                    </div>
                    <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-base">
                      <div className="flex gap-2"><dt className="text-muted-foreground">Time</dt><dd className="font-mono font-bold text-foreground">{formatHours(path.totalLearningCost)}</dd></div>
                      <div className="flex gap-2"><dt className="text-muted-foreground">Demand</dt><dd className="text-foreground"><span className="font-bold">{demandWord(path.marketDemandAvg)}</span> <span className="font-mono text-sm text-muted-foreground">{formatPercent(path.marketDemandAvg)}</span></dd></div>
                      <div className="flex gap-2"><dt className="text-muted-foreground">Stops</dt><dd className="font-mono font-bold text-foreground">{path.steps.length}</dd></div>
                      <div className="flex gap-2" title="Composite score: lower is better"><dt className="text-muted-foreground">Score (lower is better)</dt><dd className="font-mono font-bold text-foreground">{path.compositeScore.toFixed(3)}</dd></div>
                    </dl>
                    {/* OR-choices vs the primary route */}
                    {diff && (diff.added.length > 0 || diff.removed.length > 0) && (
                      <p className="mt-2 text-base text-foreground">
                        {diff.added.length > 0 && <span><span className="text-muted-foreground">Chooses </span><span className="font-bold">{diff.added.map(skillName).join(", ")}</span></span>}
                        {diff.added.length > 0 && diff.removed.length > 0 && " "}
                        {diff.removed.length > 0 && <span><span className="text-muted-foreground">instead of </span><span className="font-bold">{diff.removed.map(skillName).join(", ")}</span></span>}
                      </p>
                    )}
                    {!diff && <p className="mt-2 text-base text-muted-foreground">The route the planner scored best.</p>}
                  </div>
                  <Button
                    size="sm"
                    variant={isCurrent ? "secondary" : "primary"}
                    className="w-full justify-center md:w-auto"
                    disabled={isCurrent || selectPath.isPending}
                    onClick={() => handleSelect(path.rank)}
                  >
                    {isCurrent ? <><CheckIcon size={14} strokeWidth={2.2} /> Currently selected</> : <>Select this path <ArrowIcon size={14} /></>}
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {paths.length > 1 && (
        <section className="mb-8" aria-labelledby="tradeoff-h">
          <h2 id="tradeoff-h" className="mb-5 font-display text-xl font-extrabold text-foreground">Hours against demand</h2>
          <SignPanel className="p-5">
            <div className="mx-auto max-w-lg"><TradeoffChart paths={paths} selectedRank={user.selectedPathRank} /></div>
          </SignPanel>
        </section>
      )}

      <p className="text-center text-sm text-muted-foreground">
        Ranked by α·(hours/maxHours) + β·(1 − demand), α={pathDoc.alpha}, β={pathDoc.beta}. Lower scores rank higher.
      </p>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="mb-1 font-display text-3xl font-extrabold text-foreground md:text-4xl">Compare routes</h1>
          <p className="text-lg text-muted-foreground">Same destination, different roads: total time, demand, and where each route differs.</p>
        </div>

        {renderBody()}
      </div>
    </div>
  );
}
