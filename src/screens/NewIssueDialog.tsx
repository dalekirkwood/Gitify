import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useConnection } from "@/state/connection";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import type { Issue, Repo } from "@/lib/forge";
import type { View } from "@/lib/view";

type Target = { owner: string; name: string; full_name: string };

const toTarget = (r: Repo): Target => ({ owner: r.owner.login, name: r.name, full_name: r.full_name });

export function NewIssueDialog({
  view,
  onClose,
  onCreated,
}: {
  view: View;
  onClose: () => void;
  onCreated: (owner: string, repo: string, issue: Issue) => void;
}) {
  const { client } = useConnection();
  const qc = useQueryClient();

  const lockedRepo = view.kind === "repo" ? toTarget(view.repo) : null;
  const orgOwner = view.kind === "search" ? view.params.owner : undefined;

  // Repo options: locked in a repo view; org repos in an org view; else all repos.
  const repos = useQuery({
    queryKey: orgOwner ? ["orgRepos", orgOwner] : ["repos"],
    queryFn: () => (orgOwner ? client!.listOrgRepos(orgOwner) : client!.listRepos()),
    enabled: !lockedRepo && !!client,
  });
  const options = useMemo<Target[]>(
    () => (lockedRepo ? [lockedRepo] : (repos.data ?? []).map(toTarget)),
    [lockedRepo, repos.data],
  );

  const [target, setTarget] = useState<string>(lockedRepo?.full_name ?? "");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const chosen = options.find((o) => o.full_name === target) ?? options[0];

  const create = useMutation({
    mutationFn: () => client!.createIssue(chosen!.owner, chosen!.name, { title: title.trim(), body }),
    onSuccess: (issue) => {
      qc.invalidateQueries({ queryKey: ["issues"] });
      onCreated(chosen!.owner, chosen!.name, issue);
      onClose();
    },
  });

  const canSubmit = !!chosen && title.trim().length > 0 && !create.isPending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg space-y-4 rounded-lg border border-border bg-card p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">New issue</h2>

        <label className="block space-y-1">
          <span className="text-sm text-muted-foreground">Project</span>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            value={chosen?.full_name ?? ""}
            disabled={!!lockedRepo || repos.isLoading}
            onChange={(e) => setTarget(e.target.value)}
          >
            {repos.isLoading && <option>Loading…</option>}
            {options.map((o) => (
              <option key={o.full_name} value={o.full_name}>
                {o.full_name}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-sm text-muted-foreground">Title</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Issue title" autoFocus />
        </label>

        <label className="block space-y-1">
          <span className="text-sm text-muted-foreground">Description</span>
          <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Optional…" />
        </label>

        {create.error && <p className="text-sm text-red-400">Failed to create — your input is kept, try again.</p>}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!canSubmit} onClick={() => create.mutate()}>
            {create.isPending ? "Creating…" : "Create issue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
