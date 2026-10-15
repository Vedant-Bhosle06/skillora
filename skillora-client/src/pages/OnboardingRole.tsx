import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Badge, DemandBar, Card, Modal, PageLoader, ErrorState, EmptyState } from "@/components/ui";
import { useRoleDetail, useRoles, useSetTargetRole } from "@/api/queries";
import type { Role, RoleDetail } from "@/api/types";
import { useAuth } from "@/auth/AuthContext";
import { useToast } from "@/context/ToastContext";
import { categoryLabel, rankLabel } from "@/lib/format";
import { RANK, heldRankMap, requirementStatus, roleMatch } from "@/lib/requirements";

type SortKey = "demand" | "az";

type DetailRequirement = RoleDetail["requiredSkills"][number];

const demandPct = (role: Pick<Role, "demandScore">) => Math.round(role.demandScore * 100);

function optionName(opt: DetailRequirement["anyOfSkills"][number]): string {
  return opt.name ?? opt.slug ?? "Unknown skill";
}

function RequirementRow({ req, held }: { req: DetailRequirement; held: Map<string, number> }) {
  const status = requirementStatus(req, held);
  const isGroup = req.anyOfSkills.length > 1;
  const title = req.label || (req.anyOfSkills[0] ? optionName(req.anyOfSkills[0]) : "Unknown skill");
  const bestOption = req.anyOfSkills.find(o => o._id === status.bestOptionId);

  let badge: React.ReactNode;
  if (status.met) {
    badge = <Badge variant="completed">✓ Have it{isGroup && bestOption ? ` (${optionName(bestOption)})` : ""}</Badge>;
  } else if (status.bestRank > 0) {
    badge = <Badge variant="in-progress">Have {rankLabel(status.bestRank)} — need {rankLabel(RANK[req.minProficiency])}</Badge>;
  } else {
    badge = <Badge variant="locked">Need it</Badge>;
  }

  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-border last:border-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm ${status.met ? "text-foreground" : "text-muted-foreground"}`}>{title}</span>
          <Badge variant="outline">min {rankLabel(RANK[req.minProficiency])}</Badge>
        </div>
        {isGroup && (
          <p className="text-xs text-muted-foreground mt-0.5">Any one of: {req.anyOfSkills.map(optionName).join(" / ")}</p>
        )}
      </div>
      <div className="shrink-0">{badge}</div>
    </div>
  );
}

export default function OnboardingRole() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const rolesQuery = useRoles();
  const setTargetRole = useSetTargetRole();
  const [selected, setSelected] = useState<string | null>(() => user?.targetRoleId?._id ?? null);
  const [drawer, setDrawer] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("demand");

  const held = useMemo(() => heldRankMap(user), [user]);
  const drawerQuery = useRoleDetail(drawer);
  const drawerTitle = drawerQuery.data?.title ?? rolesQuery.data?.find(r => r._id === drawer)?.title ?? "";

  const visibleRoles = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = (rolesQuery.data ?? []).filter(r =>
      !term || r.title.toLowerCase().includes(term) || r.description.toLowerCase().includes(term)
    );
    return list.sort((a, b) =>
      sort === "az" ? a.title.localeCompare(b.title) : b.demandScore - a.demandScore || a.title.localeCompare(b.title)
    );
  }, [rolesQuery.data, search, sort]);

  function handleSelect() {
    if (!selected) { showToast("Choose a target role to continue", "warning"); return; }
    setTargetRole.mutate(selected, {
      onSuccess: () => {
        showToast("Target role set — computing your roadmap…", "success");
        navigate("/dashboard");
      },
      onError: (err) => showToast(err.message, "error"),
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-mono">✓</div>
            <span className="text-sm text-muted-foreground">Your Skills</span>
          </div>
          <div className="flex-1 h-0.5 bg-primary max-w-12" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-mono font-700">2</div>
            <span className="text-sm font-600 text-foreground">Target Role</span>
          </div>
        </div>

        <h1 className="font-display font-800 text-3xl text-foreground mb-2">Where do you want to go?</h1>
        <p className="text-muted-foreground mb-8">Each role shows live market demand. Click any card for a detailed skill breakdown.</p>

        {/* Search + sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">⌕</span>
            <input
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              placeholder="Search roles…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs">✕</button>
            )}
          </div>
          <select
            aria-label="Sort roles"
            className="px-3 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
          >
            <option value="demand">Highest demand</option>
            <option value="az">A–Z</option>
          </select>
        </div>

        {rolesQuery.isPending ? (
          <PageLoader label="Loading roles…" />
        ) : rolesQuery.isError ? (
          <ErrorState title="Couldn't load roles" message={rolesQuery.error.message} onRetry={() => rolesQuery.refetch()} />
        ) : visibleRoles.length === 0 ? (
          <EmptyState
            icon="◎"
            title={search ? "No roles match" : "No roles yet"}
            description={search ? `Nothing found for “${search.trim()}”.` : "No target roles have been added yet."}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {visibleRoles.map(role => {
              const match = roleMatch(role, held);
              const score = demandPct(role);
              const isSelected = selected === role._id;

              return (
                <Card
                  key={role._id}
                  hover
                  onClick={() => setSelected(role._id)}
                  className={`p-4 transition-all flex flex-col ${isSelected ? "ring-2 ring-primary border-primary" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <h3 className="font-display font-700 text-sm text-foreground mb-1">{role.title}</h3>
                      {role.category && <Badge variant="outline">{categoryLabel(role.category)}</Badge>}
                    </div>
                    {isSelected && <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-xs">✓</div>}
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2" title={role.description}>{role.description}</p>

                  <div className="mb-3 mt-auto">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-muted-foreground">Market demand</span>
                      {score >= 90 && <Badge variant="demand">🔥 Hot</Badge>}
                    </div>
                    <DemandBar score={score} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      <span className={`font-600 ${match.met === match.total ? "text-emerald-500" : "text-foreground"}`}>{match.met}/{match.total}</span> requirements met
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setDrawer(role._id); }}
                      className="text-xs text-primary hover:underline font-500"
                    >
                      Details →
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <div className="flex justify-between items-center">
          <button onClick={() => navigate("/onboarding/skills")} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
          <Button size="lg" onClick={handleSelect} disabled={!selected || setTargetRole.isPending}>
            {setTargetRole.isPending ? "Saving…" : "Generate my path →"}
          </Button>
        </div>
      </div>

      {/* Role detail drawer */}
      <Modal open={!!drawer} onClose={() => setDrawer(null)} title={drawerTitle} className="max-w-md">
        {drawerQuery.isPending ? (
          <PageLoader label="Loading role…" />
        ) : drawerQuery.isError ? (
          <ErrorState title="Couldn't load this role" message={drawerQuery.error.message} onRetry={() => drawerQuery.refetch()} />
        ) : (
          <div>
            <div className="flex items-start gap-4 mb-5">
              <p className="flex-1 text-sm text-muted-foreground">{drawerQuery.data.description}</p>
              <Badge variant={demandPct(drawerQuery.data) >= 90 ? "demand" : "default"}>Demand {demandPct(drawerQuery.data)}%</Badge>
            </div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Required Skills</p>
              <p className="text-xs text-muted-foreground">
                {roleMatch(drawerQuery.data, held).met}/{drawerQuery.data.requiredSkills.length} met
              </p>
            </div>
            {drawerQuery.data.requiredSkills.length === 0 ? (
              <EmptyState icon="✓" title="No requirements" description="This role has no required skills yet." />
            ) : (
              <div className="flex flex-col gap-2">
                {drawerQuery.data.requiredSkills.map((req, i) => (
                  <RequirementRow key={req._id ?? i} req={req} held={held} />
                ))}
              </div>
            )}
            <Button className="w-full mt-5" onClick={() => { setSelected(drawerQuery.data._id); setDrawer(null); }}>
              Select this role →
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
