import React, { ReactNode, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Card, EmptyState, ErrorState, Input, Modal, PageLoader, StatTile } from "@/components/ui";
import { useAdminEdges, useAdminMetrics, useDeleteSkill, useRoles, useSkillsCatalog } from "@/api/queries";
import { ApiError } from "@/api/client";
import type { GraphMetrics, Role, Skill, SkillEdge } from "@/api/types";
import { categoryLabel, formatHours, formatPercent } from "@/lib/format";
import { useToast } from "@/context/ToastContext";
import SkillForm from "@/pages/admin/SkillForm";

type Tab = "health" | "skills" | "edges" | "roles";

const isForbidden = (err: unknown) => err instanceof ApiError && err.status === 403;

export default function Admin() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("health");

  const catalog = useSkillsCatalog();
  const edgesQuery = useAdminEdges();
  const rolesQuery = useRoles();
  const metricsQuery = useAdminMetrics();

  // The guard already hides this page from learners; a 403 here means the role changed server-side.
  if (isForbidden(edgesQuery.error) || isForbidden(metricsQuery.error)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <EmptyState
          icon="🔒"
          title="Access Restricted"
          description="Your account no longer has administrator access."
          action={<Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>}
        />
      </div>
    );
  }

  if (catalog.isPending || edgesQuery.isPending || rolesQuery.isPending) {
    return <PageLoader label="Loading admin data…" />;
  }

  const loadError = catalog.error ?? edgesQuery.error ?? rolesQuery.error;
  if (loadError) {
    return (
      <ErrorState
        title="Couldn't load admin data"
        message={loadError.message}
        onRetry={() => {
          catalog.refetch();
          edgesQuery.refetch();
          rolesQuery.refetch();
        }}
      />
    );
  }

  const skills = catalog.data ?? [];
  const edges = edgesQuery.data ?? [];
  const roles = rolesQuery.data ?? [];

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "health", label: `Graph Health${metricsQuery.data && !metricsQuery.data.isDAG ? " ⚠" : ""}` },
    { id: "skills", label: `Skills (${skills.length})` },
    { id: "edges",  label: `Edges (${edges.length})` },
    { id: "roles",  label: `Roles (${roles.length})` },
  ];

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
          <HealthPanel
            metrics={metricsQuery.data}
            isPending={metricsQuery.isPending}
            error={metricsQuery.error}
            onRetry={() => metricsQuery.refetch()}
            edges={edges}
            byId={catalog.byId}
          />
        )}

        {tab === "skills" && <SkillsTab skills={skills} />}
        {tab === "edges" && <EdgesList edges={edges} byId={catalog.byId} />}
        {tab === "roles" && <RolesList roles={roles} byId={catalog.byId} />}
      </div>
    </div>
  );
}

function HealthPanel({ metrics, isPending, error, onRetry, edges, byId }: {
  metrics: GraphMetrics | undefined;
  isPending: boolean;
  error: Error | null;
  onRetry: () => void;
  edges: SkillEdge[];
  byId: Map<string, Skill>;
}) {
  if (isPending) return <PageLoader label="Loading graph health…" />;
  if (error || !metrics) {
    const serviceDown = error instanceof ApiError && error.status === 503;
    return (
      <ErrorState
        title={serviceDown ? "Path service unavailable" : "Couldn't load graph health"}
        message={serviceDown ? "Path service unavailable — start it to see graph health." : error?.message ?? "Something went wrong."}
        onRetry={onRetry}
      />
    );
  }

  const nameOf = (id: string) => byId.get(id)?.name ?? id;
  // The code returns { skillId, name } objects; the OpenAPI spec says plain ids. Handle both.
  const orphans = metrics.orphans.map(o =>
    typeof o === "string" ? { skillId: o, name: nameOf(o) } : { skillId: o.skillId, name: o.name || nameOf(o.skillId) },
  );
  const cycleNames = (metrics.cycle ?? []).map(nameOf);

  // Degree = edges of either type touching the skill.
  const degree = new Map<string, number>();
  for (const e of edges) {
    degree.set(e.sourceSkillId, (degree.get(e.sourceSkillId) ?? 0) + 1);
    degree.set(e.targetSkillId, (degree.get(e.targetSkillId) ?? 0) + 1);
  }
  const topDegree = [...degree.entries()]
    .map(([id, d]) => ({ id, name: nameOf(id), degree: d }))
    .sort((a, b) => b.degree - a.degree || a.name.localeCompare(b.name))
    .slice(0, 8);
  const maxDegree = topDegree[0]?.degree ?? 1;

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <StatTile label="Skills" value={String(metrics.nodeCount)} />
        <StatTile label="Prerequisite edges" value={String(metrics.prerequisiteEdgeCount)} />
        <StatTile label="Co-requisite edges" value={String(metrics.corequisiteEdgeCount)} />
        <StatTile label="OR-groups" value={String(metrics.groupCount)} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatTile label="Cycles" value={metrics.isDAG ? "✓ None" : "⚠ Detected"} accent={metrics.isDAG} />
        <StatTile label="Orphan Nodes" value={String(metrics.orphanCount)} sub={metrics.orphanCount > 0 ? "no prerequisite edges" : "all connected"} />
        <StatTile label="Avg Degree" value={metrics.avgDegree.toFixed(2)} sub="in + out prerequisites per node" />
        <StatTile label="Max Depth" value={metrics.maxDepth === null ? "—" : String(metrics.maxDepth)} sub="longest prerequisite chain" />
      </div>

      {!metrics.isDAG && (
        <Card className="p-4 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10 mb-4">
          <p className="text-sm font-600 text-amber-700 dark:text-amber-400 mb-1">⚠ Cycle Warning</p>
          <p className="text-xs text-amber-600 dark:text-amber-300">
            A circular dependency exists in the skill graph, so path generation may fail.
            {cycleNames.length > 0 && <> Cycle: <span className="font-mono">{cycleNames.join(" → ")}</span></>}
          </p>
        </Card>
      )}

      {orphans.length > 0 && (
        <Card className="p-4 mb-4">
          <p className="font-display font-700 text-sm text-foreground mb-1">Orphan Nodes ({metrics.orphanCount})</p>
          <p className="text-xs text-muted-foreground mb-3">Skills with no prerequisite edge (co-requisites don't count).</p>
          <div className="flex flex-wrap gap-2">
            {orphans.map(o => (
              <span key={o.skillId} className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full font-mono">{o.name}</span>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <p className="font-display font-700 text-sm text-foreground mb-3">Degree Distribution</p>
        {topDegree.length === 0 ? (
          <p className="text-xs text-muted-foreground">No edges yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {topDegree.map(s => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="text-xs text-foreground w-32 truncate">{s.name}</span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${(s.degree / maxDegree) * 100}%` }} />
                </div>
                <span className="font-mono text-xs text-muted-foreground w-6 text-right">{s.degree}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/** Confirmation dialog for every admin delete; shows the server's refusal (e.g. 409) inline. */
function ConfirmDeleteModal({ open, title, children, error, pending, onConfirm, onClose }: {
  open: boolean;
  title: string;
  children: ReactNode;
  error: string;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={() => { if (!pending) onClose(); }} title={title}>
      <div className="text-sm text-muted-foreground mb-5 flex flex-col gap-2">{children}</div>
      {error && <p className="text-sm text-red-500 mb-4" role="alert">{error}</p>}
      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={onClose} disabled={pending}>Cancel</Button>
        <Button variant="danger" className="flex-1 justify-center" onClick={onConfirm} disabled={pending}>
          {pending ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </Modal>
  );
}

function SkillsTab({ skills }: { skills: Skill[] }) {
  const { showToast } = useToast();
  const deleteSkill = useDeleteSkill();
  const [search, setSearch] = useState("");
  const [formSkill, setFormSkill] = useState<Skill | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Skill | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const categories = useMemo(() => [...new Set(skills.map(s => s.category))].sort(), [skills]);
  const term = search.trim().toLowerCase();
  const visible = skills
    .filter(s => !term || s.name.toLowerCase().includes(term) || s.slug.includes(term) || s.category.includes(term))
    .sort((a, b) => a.name.localeCompare(b.name));

  function openDelete(skill: Skill) {
    setDeleteError("");
    setDeleteTarget(skill);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    const { _id, name } = deleteTarget;
    deleteSkill.mutate(_id, {
      onSuccess: () => {
        setDeleteTarget(null);
        showToast(`Skill "${name}" deleted`, "success");
      },
      onError: (err) => setDeleteError(err.message),
    });
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 max-w-sm">
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, slug or category…" aria-label="Search skills" />
        </div>
        <span className="text-xs text-muted-foreground font-mono">{visible.length} / {skills.length}</span>
        <Button size="sm" className="ml-auto" onClick={() => setFormSkill("new")}>+ Add skill</Button>
      </div>

      {skills.length === 0 ? (
        <EmptyState icon="🧩" title="No skills yet" description="Add the first skill to start the graph." />
      ) : visible.length === 0 ? (
        <EmptyState icon="🔍" title="No matching skills" description="Try a different search term." />
      ) : (
        <Card className="divide-y divide-border">
          {visible.map(skill => (
            <div key={skill._id} className="flex items-center justify-between px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="font-600 text-sm text-foreground">{skill.name}</span>
                  <Badge variant="outline">{categoryLabel(skill.category)}</Badge>
                  <span className="font-mono text-xs text-muted-foreground">{skill.slug}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{skill.description}</p>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <span className="font-mono text-xs text-muted-foreground" title="Difficulty · demand">
                  D{skill.baseDifficulty} · {formatPercent(skill.marketDemand)}
                </span>
                <span className="font-mono text-xs text-muted-foreground">{formatHours(skill.estHours)}</span>
                <button onClick={() => setFormSkill(skill)} className="text-xs text-muted-foreground hover:text-primary transition-colors">Edit</button>
                <button onClick={() => openDelete(skill)} className="text-xs text-muted-foreground hover:text-red-500 transition-colors">Delete</button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Modal open={formSkill !== null} onClose={() => setFormSkill(null)} title={formSkill === "new" ? "Add New Skill" : "Edit Skill"}>
        {formSkill !== null && (
          <SkillForm
            key={formSkill === "new" ? "new" : formSkill._id}
            skill={formSkill === "new" ? undefined : formSkill}
            categories={categories}
            onCancel={() => setFormSkill(null)}
            onDone={(saved) => {
              showToast(`Skill "${saved.name}" ${formSkill === "new" ? "added" : "updated"} — learners' paths will be recalculated`, "success");
              setFormSkill(null);
            }}
          />
        )}
      </Modal>

      <ConfirmDeleteModal
        open={deleteTarget !== null}
        title="Delete skill"
        error={deleteError}
        pending={deleteSkill.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      >
        <p>Delete <span className="font-600 text-foreground">{deleteTarget?.name}</span>? This cannot be undone.</p>
        <p>
          Every edge touching this skill is deleted with it, the skill is removed from every learner's current and
          completed skills, and all learners' paths are recalculated. A skill that a role still requires can't be
          deleted — remove it from the role first.
        </p>
      </ConfirmDeleteModal>
    </div>
  );
}

function EdgesList({ edges, byId }: { edges: SkillEdge[]; byId: Map<string, Skill> }) {
  if (edges.length === 0) return <EmptyState icon="🔗" title="No edges yet" description="Connect two skills to add a prerequisite." />;
  return (
    <Card className="divide-y divide-border">
      {edges.map(edge => (
        <div key={edge._id} className="flex items-center gap-2 px-4 py-3 text-sm">
          <span className="font-500 text-foreground">{byId.get(edge.sourceSkillId)?.name ?? edge.sourceSkillId}</span>
          <span className="text-muted-foreground">{edge.type === "prerequisite_of" ? "→" : "↔"}</span>
          <span className="font-500 text-foreground">{byId.get(edge.targetSkillId)?.name ?? edge.targetSkillId}</span>
        </div>
      ))}
    </Card>
  );
}

function RolesList({ roles, byId }: { roles: Role[]; byId: Map<string, Skill> }) {
  if (roles.length === 0) return <EmptyState icon="🎯" title="No roles yet" description="Add a role so learners can pick a target." />;
  return (
    <Card className="divide-y divide-border">
      {roles.map(role => (
        <div key={role._id} className="px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-600 text-sm text-foreground">{role.title}</p>
              <p className="text-xs text-muted-foreground font-mono">{role.slug}</p>
            </div>
            <Badge variant={role.demandScore >= 0.9 ? "demand" : "default"}>Demand: {formatPercent(role.demandScore)}</Badge>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {role.requiredSkills.map((req, i) => (
              <span key={req._id ?? i} className="text-xs px-2 py-0.5 rounded-full font-mono bg-primary/10 text-primary">
                {req.anyOf.map(id => byId.get(id)?.name ?? id).join(" / ")}
              </span>
            ))}
          </div>
        </div>
      ))}
    </Card>
  );
}
