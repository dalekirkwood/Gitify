import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useConnection } from "@/state/connection";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Issue, IssueFilters, Repo } from "@/lib/forge";

export function IssueList({
  repo,
  onOpen,
}: {
  repo: Repo;
  onOpen: (issue: Issue) => void;
}) {
  const { client } = useConnection();
  const [state, setState] = useState<IssueFilters["state"]>("open");
  const [q, setQ] = useState("");

  const issues = useQuery({
    queryKey: ["issues", repo.full_name, state, q],
    queryFn: () =>
      client!.listIssues(repo.owner.login, repo.name, { state, q: q || undefined }),
    enabled: !!client,
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border p-3">
        <Input
          placeholder="Search issues…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        {(["open", "closed", "all"] as const).map((s) => (
          <Button
            key={s}
            variant={state === s ? "default" : "outline"}
            onClick={() => setState(s)}
          >
            {s}
          </Button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {issues.isLoading && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}
        {issues.data?.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No issues.</p>
        )}
        {issues.data?.map((i) => (
          <button
            key={i.id}
            onClick={() => onOpen(i)}
            className="flex w-full flex-col gap-1 border-b border-border px-4 py-3 text-left hover:bg-muted"
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  i.state === "open" ? "bg-green-500" : "bg-purple-500",
                )}
              />
              <span className="font-medium">{i.title}</span>
              <span className="text-xs text-muted-foreground">#{i.number}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1 pl-4">
              {i.labels.map((l) => (
                <Badge key={l.id} color={l.color}>
                  {l.name}
                </Badge>
              ))}
              {i.assignees?.map((a) => (
                <span key={a.id} className="text-xs text-muted-foreground">
                  @{a.login}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
