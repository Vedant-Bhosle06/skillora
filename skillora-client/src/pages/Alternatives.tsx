import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Badge, Card, StatTile, StatusBadge } from "@/components/ui";
import { paths, skills } from "@/data/mock";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/context/ToastContext";

function ScoreChart({ speed, relevance }: { speed: number; relevance: number }) {
  const w = 160; const h = 80;
  const midX = w / 2; const midY = h / 2;
  const r = 30;
  const sx = midX - r + (speed / 100) * r * 2;
  const sy = midY - ((speed - 50) / 100) * r;
  const rx = midX - r + (relevance / 100) * r * 2;
  const ry = midY - ((relevance - 50) / 100) * r;
  return (
    <svg width={w} height={h} className="w-full">
      <line x1={midX - r} y1={midY} x2={midX + r} y2={midY} stroke="var(--border)" strokeWidth="1" />
      <line x1={midX} y1={h - 10} x2={midX} y2={10} stroke="var(--border)" strokeWidth="1" />
      <text x={midX - r - 2} y={midY + 3} textAnchor="end" fill="var(--muted-foreground)" fontSize="8">Slow</text>
      <text x={midX + r + 2} y={midY + 3} fill="var(--muted-foreground)" fontSize="8">Fast</text>
      <text x={midX} y={8} textAnchor="middle" fill="var(--muted-foreground)" fontSize="8">High</text>
      <circle cx={sx} cy={sy} r="5" fill="var(--primary)" opacity="0.8" />
      <text x={sx} y={sy - 8} textAnchor="middle" fill="var(--primary)" fontSize="7" fontWeight="bold">Spd</text>
      <circle cx={rx} cy={ry} r="5" fill="var(--accent)" opacity="0.8" />
      <text x={rx} y={ry + 14} textAnchor="middle" fill="var(--accent)" fontSize="7" fontWeight="bold">Rel</text>
    </svg>
  );
}

export default function Alternatives() {
  const { selectedPath, setSelectedPath, currentRole } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const rolePaths = paths.filter(p => p.roleId === currentRole);
  const [selected, setSelected] = useState(selectedPath);

  function composite(path: typeof paths[0]) {
    return Math.round((path.demandScore * 0.4 + path.speedScore * 0.3 + path.relevanceScore * 0.3));
  }

  function handleSelect(pathId: string) {
    setSelectedPath(pathId);
    setSelected(pathId);
    showToast("Path selected! Your roadmap has been updated.", "success");
    navigate("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="font-display font-800 text-2xl text-foreground mb-1">Alternative Paths</h1>
          <p className="text-muted-foreground">Compare learning sequences, total time, and market relevance side by side.</p>
        </div>

        {/* Comparison grid */}
        <div className={`grid gap-4 mb-8 ${rolePaths.length === 3 ? "md:grid-cols-3" : rolePaths.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2"}`}>
          {rolePaths.map(path => {
            const isCurrent = path.id === selected;
            const comp = composite(path);

            return (
              <Card key={path.id} className={`overflow-hidden transition-all ${isCurrent ? "ring-2 ring-primary" : ""}`}>
                {/* Header */}
                <div className={`px-4 py-3 border-b border-border ${isCurrent ? "bg-primary/8" : "bg-muted/30"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-display font-700 text-sm text-foreground">{path.name.split("—")[1]?.trim() ?? path.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{path.nodes.length} skills · {path.totalHours}h total</p>
                    </div>
                    {isCurrent && <Badge variant="in-progress">Active</Badge>}
                  </div>
                </div>

                {/* Stats */}
                <div className="p-4 grid grid-cols-3 gap-2 border-b border-border">
                  {[
                    { label: "Speed",     value: path.speedScore,     color: "text-primary" },
                    { label: "Demand",    value: path.demandScore,     color: "text-rose-500" },
                    { label: "Relevance", value: path.relevanceScore,  color: "text-accent" },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <p className={`font-display font-800 text-xl ${s.color}`}>{s.value}</p>
                      <p className="text-xs font-mono text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Composite */}
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-mono text-muted-foreground">Composite score</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${comp}%` }} />
                    </div>
                    <span className="font-display font-700 text-sm text-foreground">{comp}</span>
                  </div>
                </div>

                {/* Chart */}
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-xs font-mono text-muted-foreground mb-2">Speed vs Relevance</p>
                  <ScoreChart speed={path.speedScore} relevance={path.relevanceScore} />
                </div>

                {/* Sequence */}
                <div className="p-4 border-b border-border">
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Sequence</p>
                  <div className="flex flex-col gap-1.5">
                    {path.nodes.slice(0, 5).map((node, i) => {
                      const skill = skills.find(s => s.id === node.skillId);
                      return skill ? (
                        <div key={node.skillId} className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center font-mono shrink-0">{i + 1}</span>
                          <span className="text-xs text-foreground flex-1">{skill.name}</span>
                          <StatusBadge status={node.status} />
                        </div>
                      ) : null;
                    })}
                    {path.nodes.length > 5 && (
                      <p className="text-xs text-muted-foreground pl-6">+{path.nodes.length - 5} more skills</p>
                    )}
                  </div>
                </div>

                {/* CTA */}
                <div className="p-4">
                  <Button
                    size="sm"
                    variant={isCurrent ? "secondary" : "primary"}
                    className="w-full"
                    disabled={isCurrent}
                    onClick={() => handleSelect(path.id)}
                  >
                    {isCurrent ? "✓ Currently selected" : "Select this path →"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Scores are calculated from market data updated weekly. Demand reflects live job postings.
        </p>
      </div>
    </div>
  );
}
