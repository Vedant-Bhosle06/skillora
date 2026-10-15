import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Badge, ProficiencyBadge, Card } from "@/components/ui";
import { skills, userSkills as defaultUserSkills } from "@/data/mock";
import type { Proficiency, UserSkill } from "@/data/mock";
import { useToast } from "@/context/ToastContext";

const proficiencyLevels: Proficiency[] = ["beginner", "intermediate", "advanced"];

export default function OnboardingSkills() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<UserSkill[]>(defaultUserSkills);

  const filtered = skills.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  );

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

  const categories = [...new Set(skills.map(s => s.category))];

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
            placeholder="Search skills or categories…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs">✕</button>
          )}
        </div>

        {/* Skills by category */}
        {categories.filter(cat => filtered.some(s => s.category === cat)).map(cat => (
          <div key={cat} className="mb-6">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3">{cat}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filtered.filter(s => s.category === cat).map(skill => {
                const sel = selected.find(s => s.skillId === skill.id);
                return (
                  <div
                    key={skill.id}
                    className={`rounded-lg border transition-all cursor-pointer p-3 ${
                      sel ? "border-primary bg-secondary/50" : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1" onClick={() => toggle(skill.id)}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center text-xs transition-all ${
                          sel ? "bg-primary border-primary text-white" : "border-border"
                        }`}>
                          {sel && "✓"}
                        </div>
                        <span className="text-sm font-600 text-foreground">{skill.name}</span>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">{skill.estimatedHours}h</span>
                    </div>

                    {sel && (
                      <div className="mt-2 flex items-center gap-1 pl-6">
                        {proficiencyLevels.map(level => (
                          <button
                            key={level}
                            onClick={() => setProficiency(skill.id, level)}
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
              })}
            </div>
          </div>
        ))}

        {/* Selected summary */}
        {selected.length > 0 && (
          <Card className="p-4 mb-6 bg-muted/50">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3">Selected ({selected.length})</p>
            <div className="flex flex-wrap gap-2">
              {selected.map(s => {
                const skill = skills.find(sk => sk.id === s.skillId);
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
