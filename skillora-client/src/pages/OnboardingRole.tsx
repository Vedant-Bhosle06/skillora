import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Badge, DemandBar, Card, Modal } from "@/components/ui";
import { roles, skills, userSkills } from "@/data/mock";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/context/ToastContext";

export default function OnboardingRole() {
  const navigate = useNavigate();
  const { setCurrentRole } = useApp();
  const { showToast } = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<string | null>(null);

  const drawerRole = roles.find(r => r.id === drawer);
  const hasSkills = new Set(userSkills.map(s => s.skillId));

  function handleSelect() {
    if (!selected) { showToast("Choose a target role to continue", "warning"); return; }
    setCurrentRole(selected);
    showToast("Path generated — your roadmap is ready!", "success");
    navigate("/dashboard");
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {roles.map(role => {
            const requiredCount = role.requiredSkills.filter(s => s.required).length;
            const hasCount = role.requiredSkills.filter(s => hasSkills.has(s.skillId)).length;
            const isSelected = selected === role.id;

            return (
              <Card
                key={role.id}
                hover
                onClick={() => setSelected(role.id)}
                className={`p-4 transition-all ${isSelected ? "ring-2 ring-primary border-primary" : ""}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-display font-700 text-sm text-foreground mb-1">{role.title}</h3>
                    <p className="text-xs text-muted-foreground">{role.openings.toLocaleString()} openings · {role.avgSalary}</p>
                  </div>
                  {isSelected && <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-xs">✓</div>}
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-muted-foreground">Market demand</span>
                    <Badge variant={role.demandScore >= 90 ? "demand" : "default"}>{role.demandScore >= 90 ? "🔥 Hot" : "Steady"}</Badge>
                  </div>
                  <DemandBar score={role.demandScore} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    <span className="text-emerald-500 font-600">{hasCount}</span>/{role.requiredSkills.length} skills matched
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setDrawer(role.id); }}
                    className="text-xs text-primary hover:underline font-500"
                  >
                    Details →
                  </button>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-between items-center">
          <button onClick={() => navigate("/onboarding/skills")} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
          <Button size="lg" onClick={handleSelect} disabled={!selected}>
            Generate my path →
          </Button>
        </div>
      </div>

      {/* Role detail drawer */}
      <Modal open={!!drawer} onClose={() => setDrawer(null)} title={drawerRole?.title ?? ""} className="max-w-md">
        {drawerRole && (
          <div>
            <div className="flex items-center gap-4 mb-5">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{drawerRole.openings.toLocaleString()} open positions · Avg {drawerRole.avgSalary}</p>
              </div>
              <Badge variant={drawerRole.demandScore >= 90 ? "demand" : "default"}>Score: {drawerRole.demandScore}</Badge>
            </div>
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">Required Skills</p>
            <div className="flex flex-col gap-2">
              {drawerRole.requiredSkills.map(rs => {
                const skill = skills.find(s => s.id === rs.skillId);
                const has = hasSkills.has(rs.skillId);
                return skill ? (
                  <div key={rs.skillId} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${has ? "text-foreground" : "text-muted-foreground"}`}>{skill.name}</span>
                      {rs.required && <Badge variant="outline">Required</Badge>}
                    </div>
                    <Badge variant={has ? "completed" : "locked"}>{has ? "✓ Have it" : "Need it"}</Badge>
                  </div>
                ) : null;
              })}
            </div>
            <Button className="w-full mt-5" onClick={() => { setSelected(drawerRole.id); setDrawer(null); }}>
              Select this role →
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
