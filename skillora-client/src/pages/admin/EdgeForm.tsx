import React, { FormEvent, useState } from "react";
import { Button, Input, Select } from "@/components/ui";
import { useCreateEdge, useUpdateEdge } from "@/api/queries";
import type { EdgeInput, EdgeType, Skill, SkillEdge } from "@/api/types";

interface EdgeFormProps {
  /** The edge being edited; omit to create a new one. Its two skills can't be changed. */
  edge?: SkillEdge;
  /** All skills, sorted for the pickers. */
  skills: Skill[];
  byId: Map<string, Skill>;
  onDone: (saved: SkillEdge) => void;
  onCancel: () => void;
}

const EDGE_TYPE_LABELS: Record<EdgeType, string> = {
  prerequisite_of: "Prerequisite",
  corequisite_with: "Co-requisite",
};

export default function EdgeForm({ edge, skills, byId, onDone, onCancel }: EdgeFormProps) {
  const createEdge = useCreateEdge();
  const updateEdge = useUpdateEdge();
  const pending = createEdge.isPending || updateEdge.isPending;

  const [sourceSkillId, setSourceSkillId] = useState(edge?.sourceSkillId ?? "");
  const [targetSkillId, setTargetSkillId] = useState(edge?.targetSkillId ?? "");
  const [type, setType] = useState<EdgeType>(edge?.type ?? "prerequisite_of");
  const [group, setGroup] = useState(edge?.group ?? "");
  const [note, setNote] = useState(edge?.source ?? "");
  const [error, setError] = useState("");

  const isPrereq = type === "prerequisite_of";
  const nameOf = (id: string) => byId.get(id)?.name ?? id;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!sourceSkillId || !targetSkillId) { setError("Pick both a source and a target skill."); return; }
    if (sourceSkillId === targetSkillId) { setError("Source and target must be different skills."); return; }

    // `source` in the body is the curation note, not a skill (the prerequisite is sourceSkillId).
    const fields = { type, group: isPrereq && group.trim() ? group.trim() : null, source: note.trim() };
    const callbacks = { onSuccess: onDone, onError: (err: Error) => setError(err.message) };
    if (edge) updateEdge.mutate({ id: edge._id, input: fields }, callbacks);
    else createEdge.mutate({ sourceSkillId, targetSkillId, ...fields } satisfies EdgeInput, callbacks);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {edge ? (
        <div className="flex items-center gap-2 text-sm bg-muted rounded-lg px-3 py-2">
          <span className="font-600 text-foreground">{nameOf(edge.sourceSkillId)}</span>
          <span className="text-muted-foreground">{isPrereq ? "→" : "↔"}</span>
          <span className="font-600 text-foreground">{nameOf(edge.targetSkillId)}</span>
        </div>
      ) : (
        <>
          <Select
            label="Source skill"
            value={sourceSkillId}
            onChange={e => {
              setSourceSkillId(e.target.value);
              if (e.target.value === targetSkillId) setTargetSkillId("");
              setError("");
            }}
          >
            <option value="">Select source…</option>
            {skills.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </Select>
          <Select
            label={isPrereq ? "Target skill (requires the source)" : "Target skill"}
            value={targetSkillId}
            onChange={e => { setTargetSkillId(e.target.value); setError(""); }}
          >
            <option value="">Select target…</option>
            {skills.filter(s => s._id !== sourceSkillId).map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </Select>
        </>
      )}
      <Select label="Type" value={type} onChange={e => setType(e.target.value as EdgeType)}>
        {(Object.keys(EDGE_TYPE_LABELS) as EdgeType[]).map(t => (
          <option key={t} value={t}>{EDGE_TYPE_LABELS[t]} ({t})</option>
        ))}
      </Select>
      <Input
        label="Group"
        value={isPrereq ? group : ""}
        onChange={e => setGroup(e.target.value)}
        disabled={!isPrereq}
        placeholder={isPrereq ? "optional, e.g. bi-tool" : "only for prerequisites"}
        className="font-mono"
        hint="Edges into the same skill with the same group = any one of them is enough. Blank = required on its own."
      />
      <Input
        label="Curation note"
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="e.g. why this prerequisite exists, or where it came from"
        hint="Free text for curators; saved as the edge's source note."
      />
      {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
      <div className="flex gap-2 mt-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={onCancel} disabled={pending}>Cancel</Button>
        <Button type="submit" className="flex-1 justify-center" disabled={pending}>
          {pending ? "Saving…" : edge ? "Save changes" : "Add edge"}
        </Button>
      </div>
    </form>
  );
}
