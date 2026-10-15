import React, { useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button, StatusBadge, Card, StatTile, PageLoader, ErrorState, ProgressRing } from "@/components/ui";
import { useCurrentUser } from "@/auth/AuthContext";
import { useEnsureFreshPath } from "@/hooks/useEnsureFreshPath";
import { formatDate, formatHours } from "@/lib/format";
import { completedForRole, estWeeks, pathLabel, progressFraction, remainingSteps, selectedRankedPath, totalHours } from "@/lib/pathMetrics";
import { refId } from "@/lib/requirements";
import { paths, skills, roles } from "@/data/mock";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/context/ToastContext";
import type { NodeStatus } from "@/data/mock";

function statusIcon(status: NodeStatus) {
  if (status === "completed")   return <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm">✓</div>;
  if (status === "in-progress") return <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm animate-pulse">◉</div>;
  if (status === "unlocked")    return <div className="w-8 h-8 rounded-full border-2 border-primary bg-card flex items-center justify-center text-primary text-sm">◎</div>;
  return <div className="w-8 h-8 rounded-full border-2 border-border bg-card flex items-center justify-center text-muted-foreground text-sm">🔒</div>;
}

function connectorColor(status: NodeStatus) {
  if (status === "completed") return "bg-emerald-300 dark:bg-emerald-700";
  if (status === "in-progress" || status === "unlocked") return "bg-primary/40";
  return "bg-border";
}

export default function Dashboard() {
  const { currentRole, selectedPath, setSelectedPath } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const { pathDoc, isLoading, loadError, isComputing, failure, retry, reload } = useEnsureFreshPath();

  // 400 (no role) or 404 (role deleted) from compute: the user has to pick a role again.
  const needsRole = !!failure && (failure.status === 400 || failure.status === 404);
  useEffect(() => {
    if (!needsRole || !failure) return;
    showToast(failure.message, "error");
    navigate("/onboarding/role", { replace: true });
  }, [needsRole, failure, navigate, showToast]);

  const role = roles.find(r => r.id === currentRole);
  const primaryPath = paths.find(p => p.id === selectedPath) ?? paths[0];
  const altPaths = paths.filter(p => p.id !== primaryPath.id && p.roleId === currentRole);

  // Steps completed for this role are filtered out even if a stale path still lists them.
  const completed = useMemo(() => completedForRole(user), [user]);
  const completedIds = useMemo(
    () => new Set(completed.map(c => refId(c.skillId)).filter((id): id is string => !!id)),
    [completed]
  );
  const currentPath = selectedRankedPath(pathDoc, user.selectedPathRank);
  const remaining = useMemo(() => remainingSteps(currentPath, completedIds), [currentPath, completedIds]);
  const remainingHours = totalHours(remaining);
  const weeks = estWeeks(remainingHours);

  function getSkill(id: string) {
    return skills.find(s => s.id === id);
  }

  if (isLoading) return <PageLoader label="Loading your roadmap…" />;
  if (loadError) return <ErrorState title="Couldn't load your roadmap" message={loadError.message} onRetry={reload} />;
  if (needsRole) return <PageLoader label="Taking you to role selection…" />;
  if (isComputing || (!pathDoc && !failure)) return <PageLoader label="Computing your optimal path…" />;
  if (!pathDoc) {
    return <ErrorState title="Couldn't compute your path" message={failure?.message ?? "Something went wrong."} onRetry={retry} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-1">Active Path</p>
              <h1 className="font-display font-800 text-2xl text-foreground">{user.targetRoleId?.title}</h1>
              <p className="text-xs font-mono text-muted-foreground mt-1">
                {pathDoc.algorithm === "a_star" ? "A*" : pathDoc.algorithm} · {pathDoc.stats.statesExpanded} states · {pathDoc.stats.elapsedMs.toFixed(1)} ms · generated {formatDate(pathDoc.generatedAt)}
              </p>
              {pathDoc.stats.capped && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Search limit reached — best routes found so far</p>
              )}
              {pathDoc.algorithm === "greedy_fallback" && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Approximate route (search limit reached)</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => navigate("/dashboard/alternatives")}>Compare paths</Button>
              <Button variant="secondary" size="sm" onClick={() => navigate("/graph")}>View graph</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/onboarding/role")}>Change role</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile label="Path" value={currentPath ? pathLabel(currentPath.rank) : "—"} sub={`${pathDoc.paths.length} route${pathDoc.paths.length === 1 ? "" : "s"} found`} />
            <StatTile label="Remaining" value={formatHours(remainingHours)} sub={`${remaining.length} skill${remaining.length === 1 ? "" : "s"} to go`} />
            <div className="rounded-xl border border-border p-4 bg-card flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider mb-1 text-muted-foreground">Progress</p>
                <p className="font-display font-800 text-2xl text-foreground">{completed.length}/{completed.length + remaining.length}</p>
                <p className="text-xs mt-0.5 text-muted-foreground">skills done</p>
              </div>
              <ProgressRing value={progressFraction(completed.length, remaining.length)} size={64} stroke={6} />
            </div>
            <StatTile label="Est. finish" value={weeks === 0 ? "Done" : `~${weeks} week${weeks === 1 ? "" : "s"}`} sub="at 10h/week" />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main path timeline */}
          <div className="lg:col-span-2">
            <h2 className="font-display font-700 text-base text-foreground mb-4">Learning Roadmap</h2>
            <div className="flex flex-col">
              {primaryPath.nodes.map((node, i) => {
                const skill = getSkill(node.skillId);
                if (!skill) return null;
                const isLast = i === primaryPath.nodes.length - 1;

                return (
                  <div key={node.skillId} className="flex gap-4">
                    {/* Timeline column */}
                    <div className="flex flex-col items-center">
                      {statusIcon(node.status)}
                      {!isLast && <div className={`w-0.5 flex-1 min-h-8 my-1 ${connectorColor(node.status)}`} />}
                    </div>

                    {/* Content */}
                    <div className={`flex-1 pb-6 ${node.status === "locked" ? "opacity-50" : ""}`}>
                      <div className={`rounded-xl border p-4 ${
                        node.status === "in-progress" ? "border-primary bg-primary/5 shadow-sm" :
                        node.status === "completed"   ? "border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-900/10" :
                        "border-border bg-card"
                      }`}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">#{node.order}</span>
                            <h3 className="font-display font-700 text-sm text-foreground">{skill.name}</h3>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-xs text-muted-foreground">{node.estimatedHours}h</span>
                            <StatusBadge status={node.status} />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{skill.description}</p>
                        <p className="text-xs text-muted-foreground italic mb-1.5">"{node.rationale}"</p>
                        <Link
                          to="/progress"
                          className="text-xs text-primary hover:underline font-500"
                        >
                          See what's covered →
                        </Link>
                        {(node.status === "unlocked" || node.status === "in-progress") && (
                          <div className="mt-3">
                            <Button size="sm" onClick={() => showToast(`Started: ${skill.name}`, "info")}>
                              {node.status === "in-progress" ? "Continue →" : "Start now →"}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alt paths sidebar */}
          <div>
            <h2 className="font-display font-700 text-base text-foreground mb-4">Alternative Paths</h2>
            <div className="flex flex-col gap-3">
              {altPaths.map(path => (
                <Card key={path.id} hover className="p-4" onClick={() => { setSelectedPath(path.id); showToast("Path switched!", "success"); }}>
                  <p className="font-display font-600 text-sm text-foreground mb-1">{path.name.split("—")[1]?.trim()}</p>
                  <p className="text-xs text-muted-foreground mb-3">{path.totalHours}h · {path.nodes.length} skills</p>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-mono">Speed</span>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(i => <div key={i} className={`w-3 h-1.5 rounded-full ${i <= Math.round(path.speedScore / 20) ? "bg-primary" : "bg-muted"}`} />)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-mono">Relevance</span>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(i => <div key={i} className={`w-3 h-1.5 rounded-full ${i <= Math.round(path.relevanceScore / 20) ? "bg-accent" : "bg-muted"}`} />)}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="secondary" className="w-full mt-3">Select this path</Button>
                </Card>
              ))}

              <Card className="p-4 border-dashed">
                <p className="text-xs text-muted-foreground text-center mb-2">Want a custom path?</p>
                <Button size="sm" variant="ghost" className="w-full" onClick={() => navigate("/alternatives")}>
                  Compare all paths →
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
