import type { Repo, SearchFilters } from "@/lib/forge";

// What the main pane is showing. Search views are cross-repo (rows show their
// repo); repo views are a single project's issues.
export type View =
  | { kind: "search"; label: string; params: SearchFilters }
  | { kind: "repo"; repo: Repo };

export function viewLabel(v: View): string {
  return v.kind === "search" ? v.label : v.repo.full_name;
}
