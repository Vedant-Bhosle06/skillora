import React, { FormEvent, useState } from "react";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { useCreateRole, useUpdateRole } from "@/api/queries";
import type { Proficiency, Role, RoleCategory, RoleInput, Skill } from "@/api/types";
import { isValidSlug, slugify } from "@/lib/slug";

interface RoleFormProps {
  /** The role being edited; omit to create a new one. */
  role?: Role;
  /** All skills, sorted for the option pickers. */
  skills: Skill[];
  byId: Map<string, Skill>;
  onDone: (saved: Role) => void;
  onCancel: () => void;
}

const ROLE_CATEGORIES: RoleCategory[] = ["data", "engineering", "design", "product", "management"];
const PROFICIENCIES: Proficiency[] = ["beginner", "intermediate", "advanced"];

/** One requirement row; `key` is local only, for React lists. */
interface RequirementRow { key: number; label: string; minProficiency: Proficiency; anyOf: string[] }

type Errors = Partial<Record<"title" | "slug" | "category" | "demandScore" | "requirements", string>>;

let nextRowKey = 1;
const newRow = (init?: Partial<RequirementRow>): RequirementRow => ({
  key: nextRowKey++, label: "", minProficiency: "beginner", anyOf: [], ...init,
});

export default function RoleForm({ role, skills, byId, onDone, onCancel }: RoleFormProps) {
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const pending = createRole.isPending || updateRole.isPending;

  const [title, setTitle] = useState(role?.title ?? "");
  const [slug, setSlug] = useState(role?.slug ?? "");
  // A new role's slug follows the title until the admin edits the slug by hand.
  const [slugTouched, setSlugTouched] = useState(!!role);
  const [category, setCategory] = useState<RoleCategory | "">(role?.category ?? "");
  const [demandScore, setDemandScore] = useState(String(role?.demandScore ?? 0.5));
  const [description, setDescription] = useState(role?.description ?? "");
  const [rows, setRows] = useState<RequirementRow[]>(() =>
    role
      ? role.requiredSkills.map(r => newRow({ label: r.label, minProficiency: r.minProficiency, anyOf: [...r.anyOf] }))
      : [newRow()],
  );
  const [errors, setErrors] = useState<Errors>({});
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [serverError, setServerError] = useState("");

  const nameOf = (id: string) => byId.get(id)?.name ?? id;

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function updateRow(key: number, patch: Partial<RequirementRow>) {
    setRows(prev => prev.map(r => (r.key === key ? { ...r, ...patch } : r)));
    setRowErrors(prev => {
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError("");
    const errs: Errors = {};
    const rowErrs: Record<number, string> = {};
    const demand = Number(demandScore);

    if (!title.trim()) errs.title = "Title is required";
    if (!isValidSlug(slug)) errs.slug = "Use lowercase letters, digits and single hyphens, e.g. data-analyst";
    if (!category) errs.category = "Pick a category";
    if (demandScore.trim() === "" || !Number.isFinite(demand) || demand < 0 || demand > 1) errs.demandScore = "Number from 0 to 1";
    if (rows.length === 0) errs.requirements = "Add at least one requirement";
    for (const r of rows) if (r.anyOf.length === 0) rowErrs[r.key] = "Add at least one skill option";

    setErrors(errs);
    setRowErrors(rowErrs);
    if (Object.keys(errs).length > 0 || Object.keys(rowErrs).length > 0 || !category) return;

    const input: RoleInput = {
      slug,
      title: title.trim(),
      description: description.trim(),
      category,
      demandScore: demand,
      requiredSkills: rows.map(r => ({ anyOf: r.anyOf, label: r.label.trim(), minProficiency: r.minProficiency })),
    };
    const callbacks = { onSuccess: onDone, onError: (err: Error) => setServerError(err.message) };
    if (role) updateRole.mutate({ id: role._id, input }, callbacks);
    else createRole.mutate(input, callbacks);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Input label="Title" value={title} onChange={e => handleTitleChange(e.target.value)} placeholder="e.g. Data Analyst" error={errors.title} autoFocus />
      <Input
        label="Slug"
        value={slug}
        onChange={e => { setSlug(e.target.value); setSlugTouched(true); }}
        placeholder="e.g. data-analyst"
        className="font-mono"
        error={errors.slug}
        hint="Unique id. Test records must start with zz-test-."
      />
      <div className="grid grid-cols-2 gap-3">
        <Select label="Category" value={category} onChange={e => setCategory(e.target.value as RoleCategory | "")} error={errors.category}>
          <option value="">Select…</option>
          {ROLE_CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </Select>
        <Input label="Demand score (0–1)" type="number" min={0} max={1} step={0.01} value={demandScore} onChange={e => setDemandScore(e.target.value)} error={errors.demandScore} />
      </div>
      <Textarea label="Description" rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="What this role does…" className="resize-none" />

      <div>
        <p className="text-sm font-500 text-foreground mb-1">Requirements</p>
        <p className="text-xs text-muted-foreground mb-3">
          Each requirement is met by <span className="font-600">any one</span> of its skill options (an OR-group), at the minimum proficiency.
        </p>
        <div className="flex flex-col gap-3">
          {rows.map((row, i) => (
            <div key={row.key} className={`rounded-lg border p-3 flex flex-col gap-3 ${rowErrors[row.key] ? "border-red-500" : "border-border"}`}>
              <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                <Input
                  label={`Requirement ${i + 1} label`}
                  value={row.label}
                  onChange={e => updateRow(row.key, { label: e.target.value })}
                  placeholder="optional, e.g. BI tool"
                />
                <Select
                  label="Min. proficiency"
                  value={row.minProficiency}
                  onChange={e => updateRow(row.key, { minProficiency: e.target.value as Proficiency })}
                >
                  {PROFICIENCIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {row.anyOf.map((id, j) => (
                  <React.Fragment key={id}>
                    {j > 0 && <span className="text-xs text-muted-foreground">or</span>}
                    <span className="inline-flex items-center gap-1 text-xs pl-2.5 pr-1 py-0.5 rounded-full font-mono bg-primary/10 text-primary">
                      {nameOf(id)}
                      <button
                        type="button"
                        onClick={() => updateRow(row.key, { anyOf: row.anyOf.filter(x => x !== id) })}
                        className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-primary/20"
                        aria-label={`Remove option ${nameOf(id)}`}
                      >
                        ✕
                      </button>
                    </span>
                  </React.Fragment>
                ))}
                <select
                  value=""
                  onChange={e => { if (e.target.value) updateRow(row.key, { anyOf: [...row.anyOf, e.target.value] }); }}
                  className="px-2 py-1 rounded-lg border border-border bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label={`Add option to requirement ${i + 1}`}
                >
                  <option value="">Add option…</option>
                  {skills.filter(s => !row.anyOf.includes(s._id)).map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-between">
                {rowErrors[row.key] ? <p className="text-xs text-red-500">{rowErrors[row.key]}</p> : <span />}
                <button
                  type="button"
                  onClick={() => setRows(prev => prev.filter(r => r.key !== row.key))}
                  className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                >
                  Remove requirement
                </button>
              </div>
            </div>
          ))}
        </div>
        {errors.requirements && <p className="text-xs text-red-500 mt-2">{errors.requirements}</p>}
        <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={() => { setRows(prev => [...prev, newRow()]); setErrors(p => ({ ...p, requirements: undefined })); }}>
          + Add requirement
        </Button>
      </div>

      {serverError && <p className="text-sm text-red-500" role="alert">{serverError}</p>}
      <div className="flex gap-2 mt-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={onCancel} disabled={pending}>Cancel</Button>
        <Button type="submit" className="flex-1 justify-center" disabled={pending}>
          {pending ? "Saving…" : role ? "Save changes" : "Add role"}
        </Button>
      </div>
    </form>
  );
}
