import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Card, Badge, ProficiencyBadge, Modal, EmptyState, PageLoader, ErrorState } from "@/components/ui";
import { useAuth, useCurrentUser } from "@/auth/AuthContext";
import { useDeleteAccount, useRemoveSkill, useRoles, useSetTargetRole, useUpdateProficiency } from "@/api/queries";
import { refId } from "@/lib/requirements";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";
import type { Proficiency } from "@/api/types";

const proficiencyLevels: Proficiency[] = ["beginner", "intermediate", "advanced"];

export default function Settings() {
  const { logout, clearSession } = useAuth();
  const deleteAccount = useDeleteAccount();
  const me = useCurrentUser();
  const { darkMode, toggleDark } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const updateProficiency = useUpdateProficiency();
  const removeSkill = useRemoveSkill();
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const currentSkills = me.currentSkills.filter(cs => cs.skillId !== null);
  const learnedSkills = me.completedSkills.filter(cs => cs.skillId !== null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [tab, setTab] = useState<"account" | "skills" | "role">("account");

  const rolesQuery = useRoles();
  const setTargetRole = useSetTargetRole();
  const currentRoleId = refId(me.targetRoleId);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const chosenRoleId = selectedRoleId ?? currentRoleId;

  function handleSaveRole() {
    if (!chosenRoleId) return;
    setTargetRole.mutate(chosenRoleId, {
      onSuccess: () => {
        setSelectedRoleId(null);
        showToast("Target role updated — your roadmap will be recomputed", "success");
      },
      onError: (err) => showToast(err.message, "error"),
    });
  }

  async function handleSignOut() {
    setSigningOut(true);
    await logout();
    navigate("/");
    showToast("Signed out", "info");
  }

  function handleDeleteAccount() {
    if (deleteConfirm !== "DELETE") {
      showToast("Type DELETE to confirm", "error");
      return;
    }
    deleteAccount.mutate(undefined, {
      onSuccess: () => {
        clearSession();
        navigate("/");
        showToast("Your account has been deleted", "success");
      },
      onError: (err) => showToast(err.message, "error"),
    });
  }

  function setProficiency(skillId: string, proficiency: Proficiency) {
    updateProficiency.mutate({ skillId, proficiency }, {
      onSuccess: () => showToast("Updated — your path will be recalculated", "success"),
      onError: (err) => showToast(err.message, "error"),
    });
  }

  function confirmRemoveSkill() {
    if (!removeTarget) return;
    removeSkill.mutate(removeTarget.id, {
      onSuccess: () => {
        showToast(`Removed ${removeTarget.name} — your path will be recalculated`, "success");
        setRemoveTarget(null);
      },
      onError: (err) => showToast(err.message, "error"),
    });
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
              <dl className="flex flex-col gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Full name</dt>
                  <dd className="font-600 text-foreground">{me.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Email address</dt>
                  <dd className="font-600 text-foreground">{me.email}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground mb-1">Account type</dt>
                  <dd><Badge variant={me.role === "admin" ? "in-progress" : "default"}>{me.role}</Badge></dd>
                </div>
              </dl>
              <p className="text-xs text-muted-foreground mt-4">To change account details, contact an administrator.</p>
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

            <Card className="p-5">
              <h2 className="font-display font-700 text-base text-foreground mb-2">Session</h2>
              <p className="text-sm text-muted-foreground mb-4">Sign out of SKILLORA on this device.</p>
              <Button variant="secondary" onClick={handleSignOut} disabled={signingOut}>
                {signingOut ? "Signing out…" : "Sign out"}
              </Button>
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
              <p className="text-sm text-muted-foreground">{currentSkills.length} skills in your profile</p>
              <Button size="sm" variant="secondary" onClick={() => navigate("/onboarding/skills")}>Edit in wizard →</Button>
            </div>

            {currentSkills.length === 0 ? (
              <EmptyState
                icon="🧩"
                title="No skills yet"
                description="Add the skills you already have so SKILLORA can plan your path."
                action={<Button onClick={() => navigate("/onboarding/skills")}>Add skills</Button>}
              />
            ) : (
            <Card className="divide-y divide-border">
              {currentSkills.map(us => {
                const skill = us.skillId!;
                const skillId = refId(skill) as string;
                return (
                  <div key={skillId} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-600 text-sm text-foreground">{skill.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{skill.category}</span>
                      </div>
                      <button onClick={() => setRemoveTarget({ id: skillId, name: skill.name })} className="text-xs text-muted-foreground hover:text-red-500">Remove</button>
                    </div>
                    <div className="flex gap-1.5">
                      {proficiencyLevels.map(level => (
                        <button
                          key={level}
                          disabled={updateProficiency.isPending || us.proficiency === level}
                          onClick={() => setProficiency(skillId, level)}
                          className={`px-2.5 py-1 rounded-full text-xs font-mono transition-all disabled:cursor-default ${
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
            )}

            {learnedSkills.length > 0 && (
              <Card className="p-5">
                <h2 className="font-display font-700 text-base text-foreground mb-3">Learned with SKILLORA</h2>
                <ul className="flex flex-col gap-2">
                  {learnedSkills.map(cs => (
                    <li key={cs._id} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">
                        {cs.skillId!.name}
                        <span className="text-xs text-muted-foreground ml-2">{cs.skillId!.category}</span>
                      </span>
                      <ProficiencyBadge level={cs.proficiency} />
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )}

        {tab === "role" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Current target role: <strong className="text-foreground">{me.targetRoleId?.title ?? "None selected"}</strong>
            </p>
            {rolesQuery.isLoading ? (
              <PageLoader label="Loading roles…" />
            ) : rolesQuery.error ? (
              <ErrorState title="Couldn't load roles" message={rolesQuery.error.message} onRetry={() => rolesQuery.refetch()} />
            ) : !rolesQuery.data?.length ? (
              <EmptyState icon="🎯" title="No roles available" description="An administrator hasn't added any target roles yet." />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {rolesQuery.data.map(r => (
                    <Card
                      key={r._id}
                      hover
                      onClick={() => setSelectedRoleId(r._id)}
                      className={`p-3 transition-all ${chosenRoleId === r._id ? "ring-2 ring-primary border-primary" : ""}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-600 text-sm text-foreground">{r.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {r.category ?? "general"} · {Math.round(r.demandScore * 100)}% demand
                          </p>
                        </div>
                        {currentRoleId === r._id
                          ? <Badge variant="in-progress">current</Badge>
                          : chosenRoleId === r._id && <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-xs">✓</div>}
                      </div>
                    </Card>
                  ))}
                </div>
                <Button
                  onClick={handleSaveRole}
                  disabled={!chosenRoleId || chosenRoleId === currentRoleId || setTargetRole.isPending}
                  className="self-start"
                >
                  {setTargetRole.isPending ? "Saving…" : "Save role"}
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Remove skill confirm modal */}
      <Modal open={removeTarget !== null} onClose={() => setRemoveTarget(null)} title="Remove skill">
        <p className="text-sm text-muted-foreground">
          Remove <strong className="text-foreground">{removeTarget?.name}</strong> from your profile? Your path will be recalculated.
        </p>
        <div className="flex gap-2 mt-5">
          <Button variant="ghost" className="flex-1" onClick={() => setRemoveTarget(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" onClick={confirmRemoveSkill} disabled={removeSkill.isPending}>
            {removeSkill.isPending ? "Removing…" : "Remove"}
          </Button>
        </div>
      </Modal>

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
          <Button variant="danger" className="flex-1" onClick={handleDeleteAccount} disabled={deleteAccount.isPending}>
            {deleteAccount.isPending ? "Deleting…" : "Delete permanently"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
