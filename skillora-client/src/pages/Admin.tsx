import React, { useState } from "react";
import { Button, Badge, Card, Input, Modal, StatTile } from "@/components/ui";
import { skills as initialSkills, roles as initialRoles, graphEdges as initialEdges } from "@/data/mock";
import type { Skill, Role } from "@/data/mock";
import { useToast } from "@/context/ToastContext";

export default function Admin() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<"skills" | "edges" | "roles" | "health">("health");
  const [skills, setSkills] = useState(initialSkills);
  const [edges, setEdges] = useState(initialEdges);
  const [deleteModal, setDeleteModal] = useState<{ type: string; id: string } | null>(null);
  const [addSkillModal, setAddSkillModal] = useState(false);
  const [addEdgeModal, setAddEdgeModal] = useState(false);

  const [newSkill, setNewSkill] = useState({ name: "", category: "", description: "", estimatedHours: 30, learningOutcomes: "" });
  const [newEdge, setNewEdge] = useState({ source: "", target: "" });
  const [edgeError, setEdgeError] = useState("");

  // Graph health metrics
  const allSkillIds = new Set(skills.map(s => s.id));
  const referencedIds = new Set([...edges.map(e => e.source), ...edges.map(e => e.target)]);
  const orphans = skills.filter(s => !referencedIds.has(s.id));
  const avgDegree = skills.length > 0 ? (edges.length * 2 / skills.length).toFixed(1) : "0";

  function detectCycles(): boolean {
    const visited = new Set<string>();
    const stack = new Set<string>();
    const adj: Record<string, string[]> = {};
    skills.forEach(s => { adj[s.id] = []; });
    edges.forEach(e => { if (adj[e.source]) adj[e.source].push(e.target); });

    function dfs(node: string): boolean {
      visited.add(node);
      stack.add(node);
      for (const neighbor of (adj[node] ?? [])) {
        if (!visited.has(neighbor) && dfs(neighbor)) return true;
        if (stack.has(neighbor)) return true;
      }
      stack.delete(node);
      return false;
    }
    return skills.some(s => !visited.has(s.id) && dfs(s.id));
  }

  const hasCycles = detectCycles();

  function handleAddSkill() {
    if (!newSkill.name.trim()) { showToast("Skill name is required", "error"); return; }
    const id = newSkill.name.toLowerCase().replace(/\s+/g, "_").slice(0, 10);
    const outcomes = newSkill.learningOutcomes
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean);
    setSkills(prev => [...prev, {
      ...newSkill,
      id,
      prerequisites: [],
      estimatedHours: Number(newSkill.estimatedHours),
      hoursLogged: 0,
      learningOutcomes: outcomes,
    }]);
    setNewSkill({ name: "", category: "", description: "", estimatedHours: 30, learningOutcomes: "" });
    setAddSkillModal(false);
    showToast(`Skill "${newSkill.name}" added`, "success");
  }

  function handleAddEdge() {
    setEdgeError("");
    if (!newEdge.source || !newEdge.target) { setEdgeError("Both source and target are required"); return; }
    if (newEdge.source === newEdge.target) { setEdgeError("Source and target must be different"); return; }
    if (edges.find(e => e.source === newEdge.source && e.target === newEdge.target)) {
      setEdgeError("This edge already exists"); return;
    }
    const testEdges = [...edges, newEdge];
    const adj: Record<string, string[]> = {};
    skills.forEach(s => { adj[s.id] = []; });
    testEdges.forEach(e => { if (adj[e.source]) adj[e.source].push(e.target); });
    const visited = new Set<string>();
    const stack = new Set<string>();
    function dfs(node: string): boolean {
      visited.add(node); stack.add(node);
      for (const n of (adj[node] ?? [])) {
        if (!visited.has(n) && dfs(n)) return true;
        if (stack.has(n)) return true;
      }
      stack.delete(node); return false;
    }
    if (skills.some(s => !visited.has(s.id) && dfs(s.id))) {
      setEdgeError("⚠ This edge would create a cycle"); return;
    }
    setEdges(prev => [...prev, newEdge]);
    setNewEdge({ source: "", target: "" });
    setAddEdgeModal(false);
    showToast("Edge added successfully", "success");
  }

  function handleDelete() {
    if (!deleteModal) return;
    if (deleteModal.type === "skill") {
      setSkills(prev => prev.filter(s => s.id !== deleteModal.id));
      setEdges(prev => prev.filter(e => e.source !== deleteModal.id && e.target !== deleteModal.id));
      showToast("Skill and its edges removed", "success");
    } else if (deleteModal.type === "edge") {
      const [src, tgt] = deleteModal.id.split("→");
      setEdges(prev => prev.filter(e => !(e.source === src && e.target === tgt)));
      showToast("Edge removed", "success");
    }
    setDeleteModal(null);
  }

  const tabs = [
    { id: "health", label: "Graph Health" },
    { id: "skills", label: `Skills (${skills.length})` },
    { id: "edges",  label: `Edges (${edges.length})` },
    { id: "roles",  label: `Roles (${initialRoles.length})` },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-display font-800 text-2xl text-foreground">Admin Panel</h1>
              <Badge variant="demand">Admin</Badge>
            </div>
            <p className="text-muted-foreground text-sm">Manage skills, graph edges, and roles</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border mb-6 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-500 border-b-2 -mb-px whitespace-nowrap transition-colors ${
                tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "health" && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatTile label="Total Skills" value={String(skills.length)} />
              <StatTile label="Orphan Nodes" value={String(orphans.length)} sub={orphans.length > 0 ? "need edges" : "all connected"} />
              <StatTile label="Avg Degree" value={avgDegree} sub="edges per node" />
              <StatTile label="Cycles" value={hasCycles ? "⚠ Detected" : "✓ None"} accent={!hasCycles} />
            </div>

            {hasCycles && (
              <Card className="p-4 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10 mb-4">
                <p className="text-sm font-600 text-amber-700 dark:text-amber-400 mb-1">⚠ Cycle Warning</p>
                <p className="text-xs text-amber-600 dark:text-amber-300">A circular dependency exists in the skill graph. This may prevent proper path generation. Review edges below.</p>
              </Card>
            )}

            {orphans.length > 0 && (
              <Card className="p-4 mb-4">
                <p className="font-display font-700 text-sm text-foreground mb-3">Orphan Nodes ({orphans.length})</p>
                <div className="flex flex-wrap gap-2">
                  {orphans.map(s => (
                    <span key={s.id} className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full font-mono">{s.name}</span>
                  ))}
                </div>
              </Card>
            )}

            <Card className="p-4">
              <p className="font-display font-700 text-sm text-foreground mb-3">Degree Distribution</p>
              <div className="flex flex-col gap-2">
                {skills.slice(0, 8).map(skill => {
                  const degree = edges.filter(e => e.source === skill.id || e.target === skill.id).length;
                  return (
                    <div key={skill.id} className="flex items-center gap-3">
                      <span className="text-xs text-foreground w-32 truncate">{skill.name}</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${(degree / 6) * 100}%` }} />
                      </div>
                      <span className="font-mono text-xs text-muted-foreground w-4">{degree}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {tab === "skills" && (
          <div>
            <div className="flex justify-end mb-4">
              <Button size="sm" onClick={() => setAddSkillModal(true)}>+ Add skill</Button>
            </div>
            <Card className="divide-y divide-border">
              {skills.map(skill => (
                <div key={skill.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-600 text-sm text-foreground">{skill.name}</span>
                      <Badge variant="outline">{skill.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{skill.description}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <span className="font-mono text-xs text-muted-foreground">{skill.estimatedHours}h</span>
                    <button onClick={() => setDeleteModal({ type: "skill", id: skill.id })} className="text-xs text-muted-foreground hover:text-red-500 transition-colors">Delete</button>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        )}

        {tab === "edges" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">{hasCycles ? <span className="text-amber-500">⚠ Cycle detected</span> : <span className="text-emerald-500">✓ No cycles</span>}</p>
              <Button size="sm" onClick={() => setAddEdgeModal(true)}>+ Add edge</Button>
            </div>
            <Card className="divide-y divide-border">
              {edges.map((edge, i) => {
                const src = skills.find(s => s.id === edge.source);
                const tgt = skills.find(s => s.id === edge.target);
                return (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-500 text-foreground">{src?.name ?? edge.source}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-500 text-foreground">{tgt?.name ?? edge.target}</span>
                    </div>
                    <button onClick={() => setDeleteModal({ type: "edge", id: `${edge.source}→${edge.target}` })} className="text-xs text-muted-foreground hover:text-red-500">Remove</button>
                  </div>
                );
              })}
            </Card>
          </div>
        )}

        {tab === "roles" && (
          <Card className="divide-y divide-border">
            {initialRoles.map(role => (
              <div key={role.id} className="px-4 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-600 text-sm text-foreground">{role.title}</p>
                    <p className="text-xs text-muted-foreground">{role.openings.toLocaleString()} openings · {role.avgSalary}</p>
                  </div>
                  <Badge variant={role.demandScore >= 90 ? "demand" : "default"}>Demand: {role.demandScore}</Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {role.requiredSkills.map(rs => {
                    const skill = skills.find(s => s.id === rs.skillId);
                    return skill ? (
                      <span key={rs.skillId} className={`text-xs px-2 py-0.5 rounded-full font-mono ${rs.required ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {skill.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>

      {/* Confirm delete modal */}
      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title={`Delete ${deleteModal?.type}`}>
        <p className="text-sm text-muted-foreground mb-5">
          Are you sure you want to delete this {deleteModal?.type}? This action cannot be undone.
          {deleteModal?.type === "skill" && " All edges connected to this skill will also be removed."}
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setDeleteModal(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>

      {/* Add skill modal */}
      <Modal open={addSkillModal} onClose={() => setAddSkillModal(false)} title="Add New Skill">
        <div className="flex flex-col gap-4">
          <Input label="Skill name" value={newSkill.name} onChange={e => setNewSkill(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Kubernetes" />
          <Input label="Category" value={newSkill.category} onChange={e => setNewSkill(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Engineering" />
          <Input label="Description" value={newSkill.description} onChange={e => setNewSkill(p => ({ ...p, description: e.target.value }))} placeholder="Brief description…" />
          <Input label="Estimated hours" type="number" value={String(newSkill.estimatedHours)} onChange={e => setNewSkill(p => ({ ...p, estimatedHours: Number(e.target.value) }))} />
          <div>
            <label className="text-sm font-500 text-foreground mb-1 block">Learning outcomes</label>
            <textarea
              rows={4}
              placeholder={"One outcome per line, e.g.:\nVariables, control flow, functions\nLists and dicts\nOOP basics"}
              value={newSkill.learningOutcomes}
              onChange={e => setNewSkill(p => ({ ...p, learningOutcomes: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">One outcome per line. Saved as an array in <span className="font-mono">learningOutcomes[]</span>.</p>
          </div>
          <div className="flex gap-2 mt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setAddSkillModal(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleAddSkill}>Add skill</Button>
          </div>
        </div>
      </Modal>

      {/* Add edge modal */}
      <Modal open={addEdgeModal} onClose={() => setAddEdgeModal(false)} title="Add Graph Edge">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-500 text-foreground mb-1 block">Source skill</label>
            <select
              value={newEdge.source}
              onChange={e => { setNewEdge(p => ({ ...p, source: e.target.value })); setEdgeError(""); }}
              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select source…</option>
              {skills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-500 text-foreground mb-1 block">Target skill (requires source)</label>
            <select
              value={newEdge.target}
              onChange={e => { setNewEdge(p => ({ ...p, target: e.target.value })); setEdgeError(""); }}
              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select target…</option>
              {skills.filter(s => s.id !== newEdge.source).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {edgeError && <p className="text-sm text-amber-500">{edgeError}</p>}
          <div className="flex gap-2 mt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setAddEdgeModal(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleAddEdge}>Add edge</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
