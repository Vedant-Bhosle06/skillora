import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, ProficiencyBadge, Card, PageLoader, ErrorState, EmptyState } from "@/components/ui";
import type { Proficiency, Skill } from "@/api/types";
import { useSkillsCatalog, useSkillSearch } from "@/api/queries";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { categoryLabel, formatHours } from "@/lib/format";
import { useToast } from "@/context/ToastContext";

const proficiencyLevels: Proficiency[] = ["beginner", "intermediate", "advanced"];

interface SelectedSkill { skillId: string; proficiency: Proficiency }

export default function OnboardingSkills() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SelectedSkill[]>([]);
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

  function handleNext() {
    if (selected.length === 0) { showToast("Select at least one skill to continue", "warning"); return; }
    navigate("/onboarding/role");
  }

  function renderSkillCard(skill: Skill) {
    const sel = selected.find(s => s.skillId === skill._id);
    return (
      <div
        key={skill._id}
        title={skill.description || undefined}
        className={`rounded-lg border transition-all cursor-pointer p-3 ${
          sel ? "border-primary bg-secondary/50" : "border-border bg-card hover:border-primary/40"
        }`}
      >
        <div className="flex items-center justify-between mb-1" onClick={() => toggle(skill._id)}>
          <div className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center text-xs transition-all ${
              sel ? "bg-primary border-primary text-white" : "border-border"
            }`}>
              {sel && "✓"}
            </div>
            <span className="text-sm font-600 text-foreground">{skill.name}</span>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{formatHours(skill.estHours)}</span>
        </div>

        {sel && (
          <div className="mt-2 flex items-center gap-1 pl-6">
            {proficiencyLevels.map(level => (
              <button
                key={level}
                onClick={() => setProficiency(skill._id, level)}
                className={`px-2 py-0.5 rounded-full text-xs font-mono transition-all ${
                  sel.proficiency === level
                    ? level === "beginner"     ? "bg-emerald-500 text-white"
                    : level === "intermediate" ? "bg-amber-500 text-white"
                                               : "bg-purple-500 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        )}
      </div>
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
        return <EmptyState icon="⌕" title="No skills match" description={`Nothing found for “${debounced}”. Try another name or alias.`} />;
      }
      return (
        <div className="mb-6">
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3">
            Results ({searchQuery.data.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {searchQuery.data.map(renderSkillCard)}
          </div>
        </div>
      );
    }

    if (groups.length === 0) {
      return <EmptyState icon="◎" title="No skills yet" description="The skill catalog is empty." />;
    }
    return groups.map(group => (
      <div key={group.label} className="mb-6">
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3">{group.label}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {group.skills.map(renderSkillCard)}
        </div>
      </div>
    ));
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-mono font-700">1</div>
            <span className="text-sm font-600 text-foreground">Your Skills</span>
          </div>
          <div className="flex-1 h-0.5 bg-border max-w-12" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full border border-border text-muted-foreground flex items-center justify-center text-xs font-mono">2</div>
            <span className="text-sm text-muted-foreground">Target Role</span>
          </div>
        </div>

        <h1 className="font-display font-800 text-3xl text-foreground mb-2">What do you already know?</h1>
        <p className="text-muted-foreground mb-8">Select every skill you have experience with and set your proficiency level. Don't undersell yourself.</p>

        {/* Search */}
        <div className="relative mb-6">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">⌕</span>
          <input
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            placeholder="Search skills by name or alias…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs">✕</button>
          )}
        </div>

        {renderSkills()}

        {/* Selected summary */}
        {selected.length > 0 && (
          <Card className="p-4 mb-6 bg-muted/50">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3">Selected ({selected.length})</p>
            <div className="flex flex-wrap gap-2">
              {selected.map(s => {
                const skill = catalog.byId.get(s.skillId);
                return skill ? (
                  <div key={s.skillId} className="flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-1">
                    <span className="text-xs font-500 text-foreground">{skill.name}</span>
                    <ProficiencyBadge level={s.proficiency} />
                    <button onClick={() => toggle(s.skillId)} className="text-muted-foreground hover:text-foreground text-xs ml-0.5">✕</button>
                  </div>
                ) : null;
              })}
            </div>
          </Card>
        )}

        <div className="flex justify-end">
          <Button size="lg" onClick={handleNext}>
            Next: Pick your role →
          </Button>
        </div>
      </div>
    </div>
  );
}
