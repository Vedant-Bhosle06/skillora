import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button, Badge, StatusBadge, Card, StatTile, ProgressBar } from "@/components/ui";
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

  const role = roles.find(r => r.id === currentRole);
  const primaryPath = paths.find(p => p.id === selectedPath) ?? paths[0];
  const altPaths = paths.filter(p => p.id !== primaryPath.id && p.roleId === currentRole);

  const completed = primaryPath.nodes.filter(n => n.status === "completed").length;
  const total = primaryPath.nodes.length;
  const remainingHours = primaryPath.nodes.filter(n => n.status !== "completed").reduce((a, n) => a + n.estimatedHours, 0);

  function getSkill(id: string) {
    return skills.find(s => s.id === id);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-1">Active Path</p>
              <h1 className="font-display font-800 text-2xl text-foreground">{role?.title ?? "Machine Learning Engineer"}</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => navigate("/alternatives")}>Compare paths</Button>
              <Button variant="secondary" size="sm" onClick={() => navigate("/graph")}>View graph</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <StatTile label="Path" value={primaryPath.name.split("—")[1]?.trim() ?? "Core"} />
            <StatTile label="Total hours" value={`${remainingHours}h`} sub="remaining" />
            <StatTile label="Progress" value={`${completed}/${total}`} sub="skills done" accent />
            <StatTile label="Est. finish" value="~4 months" sub="at 15h/week" />
          </div>

          <ProgressBar value={completed} max={total} />
          <p className="text-xs font-mono text-muted-foreground mt-1.5">{Math.round((completed / total) * 100)}% complete</p>
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
