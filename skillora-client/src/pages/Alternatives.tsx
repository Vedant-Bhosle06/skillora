import React from "react";
import { useNavigate } from "react-router-dom";
import { Button, Badge, Card, PageLoader, ErrorState, EmptyState } from "@/components/ui";
import { useAlternatives, useSkillsCatalog } from "@/api/queries";
import { useCurrentUser } from "@/auth/AuthContext";
import { useEnsureFreshPath } from "@/hooks/useEnsureFreshPath";
import { formatHours } from "@/lib/format";
import { pathLabel } from "@/lib/pathMetrics";

export default function Alternatives() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const fresh = useEnsureFreshPath();
  const pathDoc = fresh.pathDoc && fresh.pathDoc.targetRoleId === user.targetRoleId?._id ? fresh.pathDoc : null;
  const alternatives = useAlternatives(pathDoc?._id ?? null);
  const catalog = useSkillsCatalog();

  const skillName = (id: string) => catalog.byId.get(id)?.name ?? "Unknown skill";

  function renderBody() {
    if (fresh.isLoading) return <PageLoader label="Loading your paths…" />;
    if (fresh.loadError) {
      return <ErrorState title="Couldn't load your paths" message={fresh.loadError.message} onRetry={fresh.reload} />;
    }
    if (!pathDoc) {
      if (fresh.isComputing) return <PageLoader label="Computing your optimal path…" />;
      return (
        <EmptyState
          icon="🧭"
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
      return <EmptyState icon="🧭" title="No routes found" description="The path service returned no routes for your profile." />;
    }

    return (
      <div className={`grid gap-4 mb-8 ${paths.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        {paths.map(path => {
          const isCurrent = path.rank === user.selectedPathRank;
          return (
            <Card key={path.rank} className={`overflow-hidden transition-all ${isCurrent ? "ring-2 ring-primary" : ""}`}>
              {/* Header */}
              <div className={`px-4 py-3 border-b border-border ${isCurrent ? "bg-primary/8" : "bg-muted/30"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display font-700 text-sm text-foreground">{pathLabel(path.rank)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {path.steps.length} skills · {formatHours(path.totalLearningCost)} total
                    </p>
                  </div>
                  {isCurrent && <Badge variant="in-progress">Active</Badge>}
                </div>
              </div>

              {/* Sequence */}
              <div className="p-4">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Sequence</p>
                <div className="flex flex-col gap-1.5">
                  {[...path.steps].sort((a, b) => a.order - b.order).slice(0, 5).map((step, i) => (
                    <div key={step.skillId} className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center font-mono shrink-0">{i + 1}</span>
                      <span className="text-xs text-foreground flex-1">{skillName(step.skillId)}</span>
                      <span className="text-xs font-mono text-muted-foreground">{formatHours(step.estCost)}</span>
                    </div>
                  ))}
                  {path.steps.length > 5 && (
                    <p className="text-xs text-muted-foreground pl-6">+{path.steps.length - 5} more</p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="font-display font-800 text-2xl text-foreground mb-1">Alternative Paths</h1>
          <p className="text-muted-foreground">Compare learning sequences, total time, and market relevance side by side.</p>
        </div>

        {renderBody()}
      </div>
    </div>
  );
}
