import React, { FormEvent, useState } from "react";
import { Button, Input, Textarea } from "@/components/ui";
import { useCreateSkill, useUpdateSkill } from "@/api/queries";
import type { Skill, SkillInput } from "@/api/types";
import { isValidSlug, parseAliases, slugify } from "@/lib/slug";

interface SkillFormProps {
  /** The skill being edited; omit to create a new one. */
  skill?: Skill;
  /** Existing categories, offered as suggestions. */
  categories: string[];
  onDone: (saved: Skill) => void;
  onCancel: () => void;
}

type Errors = Partial<Record<"name" | "slug" | "category" | "baseDifficulty" | "estHours" | "marketDemand", string>>;

export default function SkillForm({ skill, categories, onDone, onCancel }: SkillFormProps) {
  const createSkill = useCreateSkill();
  const updateSkill = useUpdateSkill();
  const pending = createSkill.isPending || updateSkill.isPending;

  const [name, setName] = useState(skill?.name ?? "");
  const [slug, setSlug] = useState(skill?.slug ?? "");
  // A new skill's slug follows the name until the admin edits the slug by hand.
  const [slugTouched, setSlugTouched] = useState(!!skill);
  const [category, setCategory] = useState(skill?.category ?? "");
  const [description, setDescription] = useState(skill?.description ?? "");
  const [aliases, setAliases] = useState((skill?.aliases ?? []).join(", "));
  const [baseDifficulty, setBaseDifficulty] = useState(String(skill?.baseDifficulty ?? 3));
  const [estHours, setEstHours] = useState(skill ? String(skill.estHours) : "");
  const [marketDemand, setMarketDemand] = useState(String(skill?.marketDemand ?? 0.5));
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState("");

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function validate(): { input: SkillInput } | { errors: Errors } {
    const errs: Errors = {};
    const difficulty = Number(baseDifficulty);
    const demand = Number(marketDemand);
    const hours = estHours.trim() === "" ? undefined : Number(estHours);

    if (!name.trim()) errs.name = "Name is required";
    if (!isValidSlug(slug)) errs.slug = "Use lowercase letters, digits and single hyphens, e.g. power-bi";
    if (!category.trim()) errs.category = "Category is required";
    if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) errs.baseDifficulty = "Whole number from 1 to 5";
    if (hours !== undefined && (!Number.isFinite(hours) || hours <= 0)) errs.estHours = "Positive number, or leave blank";
    if (marketDemand.trim() === "" || !Number.isFinite(demand) || demand < 0 || demand > 1) errs.marketDemand = "Number from 0 to 1";
    if (Object.keys(errs).length > 0) return { errors: errs };

    const input: SkillInput = {
      slug,
      name: name.trim(),
      category: category.trim().toLowerCase(),
      description: description.trim(),
      aliases: parseAliases(aliases),
      baseDifficulty: difficulty,
      marketDemand: demand,
    };
    // Blank hours: leave the key out so the server default (difficulty × 8) applies.
    if (hours !== undefined) input.estHours = hours;
    return { input };
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError("");
    const result = validate();
    if ("errors" in result) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    const callbacks = { onSuccess: onDone, onError: (err: Error) => setServerError(err.message) };
    if (skill) updateSkill.mutate({ id: skill._id, input: result.input }, callbacks);
    else createSkill.mutate(result.input, callbacks);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Input label="Skill name" value={name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. Kubernetes" error={errors.name} autoFocus />
      <Input
        label="Slug"
        value={slug}
        onChange={e => { setSlug(e.target.value); setSlugTouched(true); }}
        placeholder="e.g. kubernetes"
        className="font-mono"
        error={errors.slug}
        hint="Unique id in URLs and the dataset. Test records must start with zz-test-."
      />
      <div>
        <Input
          label="Category"
          value={category}
          onChange={e => setCategory(e.target.value)}
          list="skill-categories"
          placeholder="e.g. tool"
          error={errors.category}
          hint="Pick an existing category or type a new one (stored in lowercase)."
        />
        <datalist id="skill-categories">
          {categories.map(c => <option key={c} value={c} />)}
        </datalist>
      </div>
      <Textarea label="Description" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description…" className="resize-none" />
      <Input label="Aliases" value={aliases} onChange={e => setAliases(e.target.value)} placeholder="e.g. k8s, kube" hint="Comma-separated; used by skill search." />
      <div className="grid grid-cols-3 gap-3">
        <Input label="Difficulty (1–5)" type="number" min={1} max={5} step={1} value={baseDifficulty} onChange={e => setBaseDifficulty(e.target.value)} error={errors.baseDifficulty} />
        <Input
          label="Est. hours"
          type="number"
          min={0}
          step="any"
          value={estHours}
          onChange={e => setEstHours(e.target.value)}
          placeholder={skill ? "" : "auto"}
          error={errors.estHours}
          hint={skill ? undefined : "Blank = difficulty × 8"}
        />
        <Input label="Market demand (0–1)" type="number" min={0} max={1} step={0.01} value={marketDemand} onChange={e => setMarketDemand(e.target.value)} error={errors.marketDemand} />
      </div>
      {serverError && <p className="text-sm text-red-500" role="alert">{serverError}</p>}
      <div className="flex gap-2 mt-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={onCancel} disabled={pending}>Cancel</Button>
        <Button type="submit" className="flex-1 justify-center" disabled={pending}>
          {pending ? "Saving…" : skill ? "Save changes" : "Add skill"}
        </Button>
      </div>
    </form>
  );
}
