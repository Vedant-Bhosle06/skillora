// The P5 load flow and the only place compute runs automatically: when the user
// has a target role but no path, or the path is stale, call POST /paths/compute
// once per (document, status). Nothing on the server recomputes by itself.
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, toApiError } from '@/api/client';
import { computePath } from '@/api/paths';
import { qk, useActivePath } from '@/api/queries';
import type { ComputedPathDoc } from '@/api/types';
import { useCurrentUser } from '@/auth/AuthContext';

export interface FreshPath {
  pathDoc: ComputedPathDoc | null;
  isLoading: boolean;
  loadError: ApiError | null;
  isComputing: boolean;
  failure: ApiError | null;
  retry: () => void;
  /** Re-reads GET /paths/active after a load error. */
  reload: () => void;
}

export function useEnsureFreshPath(): FreshPath {
  const user = useCurrentUser();
  const qc = useQueryClient();
  const active = useActivePath();

  const compute = useMutation({
    mutationFn: computePath,
    onSuccess: (doc) => {
      qc.setQueryData(qk.activePath, doc);
      qc.invalidateQueries({ queryKey: qk.me });
      qc.invalidateQueries({ queryKey: ['paths', 'history'] });
      qc.invalidateQueries({ queryKey: ['paths', 'alternatives'] });
      qc.invalidateQueries({ queryKey: qk.graph('path') });
    },
  });

  const [failure, setFailure] = useState<ApiError | null>(null);
  // The document key compute was last tried for, so StrictMode and re-renders never repeat it.
  const tried = useRef<string | null>(null);

  const needs = !!user.targetRoleId && active.isSuccess && (active.data === null || active.data.status === 'stale');
  const key = active.data ? `${active.data._id}:${active.data.status}` : 'none';

  function run() {
    setFailure(null);
    compute.mutate(undefined, { onError: (e) => setFailure(toApiError(e)) });
  }

  useEffect(() => {
    if (!needs || compute.isPending || tried.current === key) return;
    tried.current = key;
    run();
  }, [needs, key]); // only a new document or status may trigger another compute

  return {
    pathDoc: active.data ?? null,
    isLoading: active.isPending,
    loadError: active.error ? toApiError(active.error) : null,
    isComputing: compute.isPending,
    failure,
    retry: () => {
      tried.current = null;
      run();
    },
    reload: () => {
      void active.refetch();
    },
  };
}
