import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, PageLoader, ErrorState, EmptyState } from "@/components/ui";
import type { Proficiency, Skill } from "@/api/types";
import { useSaveSkills, useSkillsCatalog, useSkillSearch } from "@/api/queries";
import { useAuth } from "@/auth/AuthContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { categoryLabel, formatHours } from "@/lib/format";
import { refId } from "@/lib/requirements";
import { unlocks } from "@/lib/unlocks";
import { useToast } from "@/context/ToastContext";
import Logo from "@/components/Logo";
import OnboardingProgress from "@/components/OnboardingProgress";
import { DepartureBoard, SignPanel, StationChip } from "@/components/transit";
import { ArrowIcon, CloseIcon, SearchIcon } from "@/components/transit/icons";
import { lineFor } from "@/components/landing/data";

const proficiencyLevels: Proficiency[] = ["beginner", "intermediate", "advanced"];

interface SelectedSkill { skillId: string; proficiency: Proficiency }

export default function OnboardingSkills() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  // Pre-filled from the saved profile, so the page also works for re-editing from Settings.
  const [selected, setSelected] = useState<SelectedSkill[]>(() =>
    (user?.currentSkills ?? []).flatMap(s => {
      const skillId = refId(s.skillId);
      return skillId ? [{ skillId, proficiency: s.proficiency }] : [];
    })
  );
  const saveSkills = useSaveSkills();
  const debounced = useDebouncedValue(search.trim());

  const catalog = useSkillsCatalog();
  const searchQuery = useSkillSearch(debounced);
  const searching = debounced.length > 0;

  // Empty search: the whole catalog grouped by category label, sorted by category then name.
  const groups = useMemo(() => {
    const byCategory = new Map<string, Skill[]>();
    for (const skill of catalog.data ?? []) {
      const label = categoryLabel(skill.category);
      const list = byCategory.get(label) ?? [];
      list.push(skill);
      byCategory.set(label, list);
    }
    return [...byCategory.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, list]) => ({ label, skills: [...list].sort((a, b) => a.name.localeCompare(b.name)) }));
  }, [catalog.data]);

  // What the chosen skills open next: the same prerequisite rule the planner uses.
  const categoryBySlug = useMemo(() => new Map((catalog.data ?? []).map(s => [s.slug, s.category])), [catalog.data]);
  const board = useMemo(() => {
    const known = new Set<string>();
    for (const s of selected) {
      const slug = catalog.byId.get(s.skillId)?.slug;
      if (slug) known.add(slug);
    }
    return unlocks(known);
  }, [selected, catalog.byId]);

  function toggle(skillId: string) {
    setSelected(prev => {
      const exists = prev.find(s => s.skillId === skillId);
      if (exists) return prev.filter(s => s.skillId !== skillId);
      return [...prev, { skillId, proficiency: "beginner" }];
    });
  }

  function setProficiency(skillId: string, level: Proficiency) {
    setSelected(prev => prev.map(s => s.skillId === skillId ? { ...s, proficiency: level } : s));
  }

  // The endpoint replaces the whole list, so always send every selected skill.
  function save(skills: SelectedSkill[]) {
    saveSkills.mutate(skills, {
      onSuccess: () => navigate("/onboarding/role"),
      onError: (err) => showToast(err.message, "error"),
    });
  }

  function renderChip(skill: Skill) {
    return (
      <StationChip
        key={skill._id}
        pressed={selected.some(s => s.skillId === skill._id)}
        onToggle={() => toggle(skill._id)}
        color={lineFor(skill.category)}
      >
        <span title={skill.description || undefined}>{skill.name}</span>
        <span className="font-mono text-xs opacity-70">{formatHours(skill.estHours)}</span>
      </StationChip>
    );
  }

  function renderSkills() {
    if (catalog.isPending) return <PageLoader label="Loading skills…" />;
    if (catalog.isError) {
      return <ErrorState title="Couldn't load skills" message={catalog.error.message} onRetry={() => catalog.refetch()} />;
    }

    if (searching) {
      if (searchQuery.isError) {
        return <ErrorState title="Search failed" message={searchQuery.error.message} onRetry={() => searchQuery.refetch()} />;
      }
      if (!searchQuery.data) return <PageLoader label="Searching…" />;
      if (searchQuery.data.length === 0) {
        return <EmptyState icon={<SearchIcon size={28} />} title="No skills match" description={`Nothing found for “${debounced}”. Try another name or alias.`} />;
      }
      return (
        <section className="mb-8" aria-label="Search results">
          <h2 className="mb-3 border-b-4 border-foreground pb-2 text-lg font-800">Results ({searchQuery.data.length})</h2>
          <div className="flex flex-wrap gap-2">{searchQuery.data.map(renderChip)}</div>
        </section>
      );
    }

    if (groups.length === 0) {
      return <EmptyState icon={<SearchIcon size={28} />} title="No skills yet" description="The skill catalog is empty." />;
    }
    return groups.map(group => (
      <section key={group.label} className="mb-8" aria-label={group.label}>
        <h2 className="mb-3 flex items-center gap-2 border-b-4 pb-2 text-lg font-800" style={{ borderColor: lineFor(group.skills[0]?.category) }}>
          {group.label}
          <span className="font-mono text-sm font-400 text-muted-foreground">{group.skills.length}</span>
        </h2>
        <div className="flex flex-wrap gap-2">{group.skills.map(renderChip)}</div>
      </section>
    ));
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4 pr-14">
          <Link to="/" aria-label="SKILLORA home" className="flex min-h-11 items-center rounded-md">
            <Logo variant="mark" wordmark size={26} wordmarkClassName="text-[17px]" />
          </Link>
          <OnboardingProgress step={1} />
        </div>

        <h1 className="mb-2 text-[clamp(2rem,4vw,3rem)] font-[850] leading-[1.05] tracking-[-0.02em] text-foreground">Pick the stations you already know.</h1>
        <p className="mb-8 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
          Select every skill you have experience with, then set a level for each. The board shows what they open next. Don't undersell yourself.
        </p>

        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-start">
          <div>
            {/* Search */}
            <div className="relative mb-8">
              <SearchIcon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                aria-label="Search skills by name or alias"
                className="min-h-11 w-full rounded-md border border-line-grey bg-card pl-10 pr-12 text-[15px] text-foreground placeholder:text-muted-foreground"
                placeholder="Search skills by name or alias…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground">
                  <CloseIcon size={16} />
                </button>
              )}
            </div>

            {renderSkills()}
          </div>

          <aside className="flex flex-col gap-6 lg:sticky lg:top-6" aria-label="Your stations">
            <SignPanel rule="var(--line-route)">
              <h2 className="px-5 pt-4 text-lg font-800">
                Your stations <span className="font-mono text-sm font-400 text-muted-foreground">{selected.length}</span>
              </h2>
              {selected.length === 0 ? (
                <p className="px-5 pb-5 pt-2 text-base text-muted-foreground">Nothing yet. Pick a station on the left, or start from scratch.</p>
              ) : (
                <ul className="mt-2 max-h-[22rem] divide-y divide-border overflow-auto">
                  {selected.map(s => {
                    const skill = catalog.byId.get(s.skillId);
                    if (!skill) return null;
                    return (
                      <li key={s.skillId} className="px-5 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-base font-700">{skill.name}</span>
                          <button onClick={() => toggle(s.skillId)} aria-label={`Remove ${skill.name}`} className="-mr-2 flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground">
                            <CloseIcon size={16} />
                          </button>
                        </div>
                        <div role="group" aria-label={`Level for ${skill.name}`} className="mt-1 flex flex-wrap gap-1.5">
                          {proficiencyLevels.map(level => (
                            <button
                              key={level}
                              type="button"
                              aria-pressed={s.proficiency === level}
                              onClick={() => setProficiency(s.skillId, level)}
                              className={`min-h-11 rounded-full border-2 px-3.5 text-sm font-700 ${
                                s.proficiency === level ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground hover:border-foreground"
                              }`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SignPanel>

            <DepartureBoard
              title="Next departures"
              count={`${board.length} ${board.length === 1 ? "stop" : "stops"}`}
              empty="Pick a station to see where it leads."
              maxHeightClass="max-h-72"
              rows={board.map(n => ({
                key: n.slug,
                color: lineFor(categoryBySlug.get(n.slug)),
                label: n.name,
                detail: `from ${n.via.join(" + ")}`,
              }))}
            />

            <div className="flex flex-wrap items-center gap-3">
              {selected.length === 0 && (
                <Button size="lg" variant="secondary" disabled={saveSkills.isPending} onClick={() => save([])}>
                  I'm starting from scratch <ArrowIcon size={16} />
                </Button>
              )}
              <Button size="lg" disabled={selected.length === 0 || saveSkills.isPending} onClick={() => save(selected)}>
                {saveSkills.isPending ? "Saving…" : "Next: choose your destination"}
                {!saveSkills.isPending && <ArrowIcon size={16} />}
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
