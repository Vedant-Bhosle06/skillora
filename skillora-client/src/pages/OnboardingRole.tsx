import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Badge, PageLoader, ErrorState, EmptyState } from "@/components/ui";
import { useRoleDetail, useRoles, useSetTargetRole } from "@/api/queries";
import type { Role, RoleDetail } from "@/api/types";
import { useAuth } from "@/auth/AuthContext";
import { useToast } from "@/context/ToastContext";
import { categoryLabel, demandWord, rankLabel } from "@/lib/format";
import { RANK, heldRankMap, requirementStatus, roleMatch } from "@/lib/requirements";
import Logo from "@/components/Logo";
import OnboardingProgress from "@/components/OnboardingProgress";
import { ExpandMark } from "@/components/landing/Destinations";
import { ArrowIcon, CheckIcon, CloseIcon, SearchIcon } from "@/components/transit/icons";

type SortKey = "demand" | "az";

type DetailRequirement = RoleDetail["requiredSkills"][number];

function optionName(opt: DetailRequirement["anyOfSkills"][number]): string {
  return opt.name ?? opt.slug ?? "Unknown skill";
}

// Role categories shown as groups, in this order; anything else falls under "Other".
const GROUPS: [string, string][] = [["data", "Data"], ["engineering", "Engineering"], ["design", "Design"]];
const groupOf = (r: Role) => (GROUPS.some(([c]) => c === r.category) ? (r.category as string) : "other");

function RequirementRow({ req, held }: { req: DetailRequirement; held: Map<string, number> }) {
  const status = requirementStatus(req, held);
  const isGroup = req.anyOfSkills.length > 1;
  const title = req.label || (req.anyOfSkills[0] ? optionName(req.anyOfSkills[0]) : "Unknown skill");
  const bestOption = req.anyOfSkills.find(o => o._id === status.bestOptionId);

  let badge: React.ReactNode;
  if (status.met) {
    badge = <Badge variant="completed"><CheckIcon size={12} /> Have it{isGroup && bestOption ? ` (${optionName(bestOption)})` : ""}</Badge>;
  } else if (status.bestRank > 0) {
    badge = <Badge variant="in-progress">Have {rankLabel(status.bestRank)} — need {rankLabel(RANK[req.minProficiency])}</Badge>;
  } else {
    badge = <Badge variant="locked">Need it</Badge>;
  }

  return (
    <li className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 border-b border-border py-2.5 last:border-0">
      <div className="min-w-0">
        <p className={`text-[15px] font-700 ${status.met ? "text-foreground" : "text-muted-foreground"}`}>
          {isGroup ? req.anyOfSkills.map(optionName).join(" or ") : title}
          <span className="ml-2 font-400 text-muted-foreground">· min {rankLabel(RANK[req.minProficiency])}{isGroup && req.label ? ` · ${req.label}` : ""}</span>
        </p>
        {isGroup && <p className="text-sm text-muted-foreground">Any one of these will do.</p>}
      </div>
      <div className="shrink-0">{badge}</div>
    </li>
  );
}

export default function OnboardingRole() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const rolesQuery = useRoles();
  const setTargetRole = useSetTargetRole();
  const [selected, setSelected] = useState<string | null>(() => user?.targetRoleId?._id ?? null);
  // The role whose requirements are open (one at a time).
  const [drawer, setDrawer] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("demand");

  const held = useMemo(() => heldRankMap(user), [user]);
  const drawerQuery = useRoleDetail(drawer);

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

  const groups = useMemo(() => {
    const list = [...GROUPS, ["other", "Other"] as [string, string]];
    return list.map(([cat, label]) => ({ cat, label, roles: visibleRoles.filter(r => groupOf(r) === cat) })).filter(g => g.roles.length > 0);
  }, [visibleRoles]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-12">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4 pr-14">
          <Link to="/" aria-label="SKILLORA home" className="flex min-h-11 items-center rounded-md">
            <Logo variant="mark" wordmark size={26} wordmarkClassName="text-[17px]" />
          </Link>
          <OnboardingProgress step={2} />
        </div>

        <h1 className="mb-2 text-[clamp(2rem,4vw,3rem)] font-[850] leading-[1.05] tracking-[-0.02em] text-foreground">Choose your destination.</h1>
        <p className="mb-8 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
          Open a role to see what it asks for. Where any one of several tools will do, it says so. Demand is an expert estimate.
        </p>

        {/* Search + sort */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              aria-label="Search roles"
              className="min-h-11 w-full rounded-md border border-line-grey bg-card pl-10 pr-12 text-[15px] text-foreground placeholder:text-muted-foreground"
              placeholder="Search roles…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground">
                <CloseIcon size={16} />
              </button>
            )}
          </div>
          <select
            aria-label="Sort roles"
            className="min-h-11 rounded-md border border-line-grey bg-card px-3 text-[15px] text-foreground"
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
            icon={<SearchIcon size={28} />}
            title={search ? "No roles match" : "No roles yet"}
            description={search ? `Nothing found for “${search.trim()}”.` : "No target roles have been added yet."}
          />
        ) : (
          <div className="mb-10 flex flex-col gap-10">
            {groups.map(group => (
              <section key={group.cat} aria-label={group.label}>
                <h2 className="border-b-4 border-foreground pb-2 text-xl font-800">{group.label}</h2>
                <ul>
                  {group.roles.map(role => {
                    const match = roleMatch(role, held);
                    const isSelected = selected === role._id;
                    const open = drawer === role._id;
                    return (
                      <li key={role._id} className={`border-b border-border ${isSelected ? "border-l-4 border-l-primary bg-card" : ""}`}>
                        <div className="flex items-stretch">
                          <button
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => setSelected(role._id)}
                            className="flex min-h-14 flex-1 flex-col items-start justify-center gap-0.5 rounded-md px-3 py-3 text-left"
                          >
                            <span className="flex items-center gap-2 text-base font-800 text-foreground">
                              {role.title}
                              {isSelected && <span className="inline-flex items-center gap-1 text-sm font-700 text-primary"><CheckIcon size={14} /> Selected</span>}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {demandWord(role.demandScore)} · <span className="font-mono">{match.met}/{match.total}</span> requirements met
                            </span>
                          </button>
                          <button
                            type="button"
                            aria-expanded={open}
                            aria-label={`${open ? "Hide" : "Show"} requirements for ${role.title}`}
                            onClick={() => setDrawer(open ? null : role._id)}
                            className={`group flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-700 text-foreground hover:bg-muted ${open ? "[&>svg]:rotate-45" : ""}`}
                          >
                            <span className="hidden sm:inline">Requirements</span>
                            <ExpandMark />
                          </button>
                        </div>
                        {open && (
                          <div className="px-3 pb-4">
                            {role.description && <p className="mb-2 max-w-xl text-[15px] text-muted-foreground">{role.description}</p>}
                            {drawerQuery.isPending ? (
                              <PageLoader label="Loading role…" />
                            ) : drawerQuery.isError ? (
                              <ErrorState title="Couldn't load this role" message={drawerQuery.error.message} onRetry={() => drawerQuery.refetch()} />
                            ) : drawerQuery.data.requiredSkills.length === 0 ? (
                              <p className="text-[15px] text-muted-foreground">This role has no required skills yet.</p>
                            ) : (
                              <ul>
                                {drawerQuery.data.requiredSkills.map((req, i) => (
                                  <RequirementRow key={req._id ?? i} req={req} held={held} />
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <button onClick={() => navigate("/onboarding/skills")} className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-[15px] font-700 text-foreground hover:bg-muted">
            <ArrowIcon size={16} className="rotate-180" /> Back
          </button>
          <Button size="lg" onClick={handleSelect} disabled={!selected || setTargetRole.isPending}>
            {setTargetRole.isPending ? "Saving…" : "Generate my path"}
            {!setTargetRole.isPending && <ArrowIcon size={16} />}
          </Button>
        </div>
      </div>
    </div>
  );
}
