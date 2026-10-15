import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Card, EmptyState, ErrorState, PageLoader } from "@/components/ui";
import { useAdminEdges, useAdminMetrics, useRoles, useSkillsCatalog } from "@/api/queries";
import { ApiError } from "@/api/client";
import type { Role, Skill, SkillEdge } from "@/api/types";
import { categoryLabel, formatHours, formatPercent } from "@/lib/format";

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
          metricsQuery.isPending ? <PageLoader label="Loading graph health…" /> : (
            <p className="text-sm text-muted-foreground">
              {metricsQuery.data ? `${metricsQuery.data.nodeCount} skills in the graph.` : metricsQuery.error?.message}
            </p>
          )
        )}

        {tab === "skills" && <SkillsList skills={skills} />}
        {tab === "edges" && <EdgesList edges={edges} byId={catalog.byId} />}
        {tab === "roles" && <RolesList roles={roles} byId={catalog.byId} />}
      </div>
    </div>
  );
}

function SkillsList({ skills }: { skills: Skill[] }) {
  if (skills.length === 0) return <EmptyState icon="🧩" title="No skills yet" description="Add the first skill to start the graph." />;
  const sorted = [...skills].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Card className="divide-y divide-border">
      {sorted.map(skill => (
        <div key={skill._id} className="flex items-center justify-between px-4 py-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-600 text-sm text-foreground">{skill.name}</span>
              <Badge variant="outline">{categoryLabel(skill.category)}</Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">{skill.description}</p>
          </div>
          <span className="font-mono text-xs text-muted-foreground ml-4">{formatHours(skill.estHours)}</span>
        </div>
      ))}
    </Card>
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
