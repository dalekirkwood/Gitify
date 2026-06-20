import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useConnection } from "@/state/connection";
import { Button } from "@/components/ui/button";
import { MentionsInput, Mention } from "react-mentions";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Issue } from "@/lib/forge";

// Dark-theme styling for react-mentions (it uses an inline style object).
const mentionStyle = {
  control: { fontSize: 14, minHeight: 76 },
  highlighter: { padding: "8px 12px" },
  input: {
    padding: "8px 12px",
    border: "1px solid hsl(var(--input))",
    borderRadius: 6,
    color: "hsl(var(--foreground))",
    outline: "none",
  },
  suggestions: {
    list: {
      background: "hsl(var(--card))",
      border: "1px solid hsl(var(--border))",
      borderRadius: 6,
      fontSize: 14,
      overflow: "hidden",
    },
    item: {
      padding: "6px 10px",
      "&focused": { background: "hsl(var(--muted))" },
    },
  },
} as const;

export function IssueDetail({
  owner,
  repo,
  issue,
  onBack,
}: {
  owner: string;
  repo: string;
  issue: Issue;
  onBack: () => void;
}) {
  const { client } = useConnection();
  const qc = useQueryClient();
  const full = `${owner}/${repo}`;
  const key = ["issue", full, issue.number];

  const detail = useQuery({
    queryKey: key,
    queryFn: () => client!.getIssue(owner, repo, issue.number),
    initialData: issue,
  });
  const comments = useQuery({
    queryKey: [...key, "comments"],
    queryFn: () => client!.listComments(owner, repo, issue.number),
  });
  const assignees = useQuery({
    queryKey: ["assignees", full],
    queryFn: () => client!.listAssignees(owner, repo),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["issues"] });
  };

  const toggleState = useMutation({
    mutationFn: () =>
      client!.patchIssue(owner, repo, issue.number, {
        state: detail.data!.state === "open" ? "closed" : "open",
      }),
    onSuccess: invalidate,
  });

  const setAssignee = useMutation({
    mutationFn: (logins: string[]) => client!.patchIssue(owner, repo, issue.number, { assignees: logins }),
    onSuccess: invalidate,
  });

  const [comment, setComment] = useState("");
  const addComment = useMutation({
    mutationFn: (body: string) => client!.addComment(owner, repo, issue.number, body),
    onSuccess: () => {
      setComment(""); // only cleared after a confirmed write — never drop unsent text
      qc.invalidateQueries({ queryKey: [...key, "comments"] });
    },
  });

  const cur = detail.data!;
  const currentLogins = new Set((cur.assignees ?? []).map((a) => a.login));
  const mentionData = (assignees.data ?? []).map((u) => ({ id: u.login, display: u.login }));

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto p-6">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          ← Back
        </Button>
        <div className="text-xs text-muted-foreground">{full}</div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{cur.title}</h2>
          <span className="text-sm text-muted-foreground">#{cur.number}</span>
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {cur.labels.map((l) => (
            <Badge key={l.id} color={l.color}>
              {l.name}
            </Badge>
          ))}
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm">{cur.body || "No description."}</p>

        <h3 className="mt-8 text-sm font-semibold">Comments</h3>
        <div className="mt-2 space-y-3">
          {comments.data?.map((c) => (
            <div key={c.id} className="rounded-md border border-border p-3">
              <div className="text-xs text-muted-foreground">@{c.user.login}</div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          <MentionsInput
            value={comment}
            onChange={(_, newValue) => setComment(newValue)}
            placeholder="Add a note… use @ to mention"
            style={mentionStyle}
            allowSuggestionsAboveCursor
          >
            <Mention
              trigger="@"
              markup="@__display__"
              displayTransform={(_, display) => `@${display}`}
              data={mentionData}
              appendSpaceOnAdd
            />
          </MentionsInput>
          {addComment.error && (
            <p className="text-sm text-red-400">Failed — your text is kept, try again.</p>
          )}
          <Button
            onClick={() => comment.trim() && addComment.mutate(comment.trim())}
            disabled={addComment.isPending || !comment.trim()}
          >
            {addComment.isPending ? "Posting…" : "Comment"}
          </Button>
        </div>
      </div>

      <aside className="w-60 shrink-0 space-y-6 border-l border-border p-4">
        <div>
          <div className="text-xs font-semibold text-muted-foreground">Status</div>
          <Button variant="outline" className="mt-2 w-full" onClick={() => toggleState.mutate()}>
            {cur.state === "open" ? "Close issue" : "Reopen issue"}
          </Button>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted-foreground">Assignees</div>
          <div className="mt-2 space-y-1">
            {assignees.data?.map((u) => {
              const on = currentLogins.has(u.login);
              return (
                <button
                  key={u.id}
                  onClick={() => {
                    const next = new Set(currentLogins);
                    on ? next.delete(u.login) : next.add(u.login);
                    setAssignee.mutate([...next]);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-muted",
                    on && "bg-muted font-medium",
                  )}
                >
                  <span className={cn("size-2 rounded-full", on ? "bg-primary" : "bg-border")} />
                  @{u.login}
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}
