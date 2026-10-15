import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Card, Badge, ProficiencyBadge, Modal, Divider } from "@/components/ui";
import { skills, userSkills as defaultUserSkills, roles } from "@/data/mock";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/context/ToastContext";
import type { Proficiency, UserSkill } from "@/data/mock";

const proficiencyLevels: Proficiency[] = ["beginner", "intermediate", "advanced"];

export default function Settings() {
  const { currentRole, setCurrentRole, setLoggedIn, darkMode, toggleDark } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState("Alex Thornton");
  const [email, setEmail] = useState("alex@example.com");
  const [userSkills, setUserSkills] = useState<UserSkill[]>(defaultUserSkills);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [tab, setTab] = useState<"account" | "skills" | "role">("account");

  const role = roles.find(r => r.id === currentRole);

  function handleSave() {
    showToast("Settings saved successfully", "success");
  }

  function handleDeleteAccount() {
    if (deleteConfirm !== "DELETE") {
      showToast("Type DELETE to confirm", "error");
      return;
    }
    setLoggedIn(false);
    navigate("/");
    showToast("Account deleted. We're sorry to see you go.", "info");
  }

  function setProficiency(skillId: string, level: Proficiency) {
    setUserSkills(prev => prev.map(s => s.skillId === skillId ? { ...s, proficiency: level } : s));
  }

  function removeSkill(skillId: string) {
    setUserSkills(prev => prev.filter(s => s.skillId !== skillId));
  }

  const tabs = [
    { id: "account", label: "Account" },
    { id: "skills",  label: "My Skills" },
    { id: "role",    label: "Target Role" },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="font-display font-800 text-2xl text-foreground mb-6">Settings</h1>

        {/* Tabs */}
        <div className="flex border-b border-border mb-8">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-500 border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "account" && (
          <div className="flex flex-col gap-5">
            <Card className="p-5">
              <h2 className="font-display font-700 text-base text-foreground mb-4">Account Details</h2>
              <div className="flex flex-col gap-4">
                <Input label="Full name" value={name} onChange={e => setName(e.target.value)} />
                <Input label="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                <Input label="New password" type="password" placeholder="Leave blank to keep current" />
                <Button onClick={handleSave} className="self-start">Save changes</Button>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="font-display font-700 text-base text-foreground mb-4">Preferences</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-600 text-foreground">Dark mode</p>
                  <p className="text-xs text-muted-foreground">Switch between light and dark themes</p>
                </div>
                <button
                  onClick={toggleDark}
                  className={`w-12 h-6 rounded-full border-2 transition-all relative ${darkMode ? "bg-primary border-primary" : "bg-muted border-border"}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${darkMode ? "left-6" : "left-0.5"}`} />
                </button>
              </div>
            </Card>

            {/* Danger zone */}
            <Card className="p-5 border-red-200 dark:border-red-900/40">
              <h2 className="font-display font-700 text-base text-red-600 dark:text-red-400 mb-2">Danger Zone</h2>
              <p className="text-sm text-muted-foreground mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
              <Button variant="danger" onClick={() => setDeleteModal(true)}>Delete account</Button>
            </Card>
          </div>
        )}

        {tab === "skills" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{userSkills.length} skills in your profile</p>
              <Button size="sm" variant="secondary" onClick={() => navigate("/onboarding/skills")}>Edit in wizard →</Button>
            </div>

            <Card className="divide-y divide-border">
              {userSkills.map(us => {
                const skill = skills.find(s => s.id === us.skillId);
                if (!skill) return null;
                return (
                  <div key={us.skillId} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-600 text-sm text-foreground">{skill.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{skill.category}</span>
                      </div>
                      <button onClick={() => removeSkill(us.skillId)} className="text-xs text-muted-foreground hover:text-red-500">Remove</button>
                    </div>
                    <div className="flex gap-1.5">
                      {proficiencyLevels.map(level => (
                        <button
                          key={level}
                          onClick={() => setProficiency(us.skillId, level)}
                          className={`px-2.5 py-1 rounded-full text-xs font-mono transition-all ${
                            us.proficiency === level
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
                  </div>
                );
              })}
            </Card>

            <Button onClick={handleSave} className="self-start">Save skill changes</Button>
          </div>
        )}

        {tab === "role" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">Current target role: <strong className="text-foreground">{role?.title}</strong></p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {roles.map(r => (
                <Card
                  key={r.id}
                  hover
                  onClick={() => setCurrentRole(r.id)}
                  className={`p-3 transition-all ${currentRole === r.id ? "ring-2 ring-primary border-primary" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-600 text-sm text-foreground">{r.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.avgSalary} avg · {r.openings.toLocaleString()} jobs</p>
                    </div>
                    {currentRole === r.id && <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-xs">✓</div>}
                  </div>
                </Card>
              ))}
            </div>
            <Button onClick={() => { showToast("Target role updated!", "success"); }} className="self-start">Save role</Button>
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      <Modal open={deleteModal} onClose={() => { setDeleteModal(false); setDeleteConfirm(""); }} title="Delete Account">
        <p className="text-sm text-muted-foreground mb-4">
          This will permanently delete your account, all skill data, and your learning history. This cannot be reversed.
        </p>
        <Input
          label='Type "DELETE" to confirm'
          placeholder="DELETE"
          value={deleteConfirm}
          onChange={e => setDeleteConfirm(e.target.value)}
        />
        <div className="flex gap-2 mt-5">
          <Button variant="ghost" className="flex-1" onClick={() => setDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" className="flex-1" onClick={handleDeleteAccount}>Delete permanently</Button>
        </div>
      </Modal>
    </div>
  );
}
