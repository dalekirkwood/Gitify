import { useQuery } from "@tanstack/react-query";
import { useConnection } from "@/state/connection";
import { cn } from "@/lib/utils";
import type { Activity, Issue } from "@/lib/forge";

type Source = { type: "user"; login: string } | { type: "repo"; owner: string; repo: string };

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
  ["second", 1],
];
function relativeTime(iso: string): string {
  const diff = (Date.parse(iso) - Date.now()) / 1000;
  const abs = Math.abs(diff);
  for (const [unit, secs] of UNITS) {
    if (abs >= secs || unit === "second") return rtf.format(Math.round(diff / secs), unit);
  }
  return "";
}

const VERBS: Record<string, string> = {
  create_issue: "opened issue",
  close_issue: "closed issue",
  reopen_issue: "reopened issue",
  comment_issue: "commented on issue",
  create_pull_request: "opened pull request",
  merge_pull_request: "merged pull request",
  comment_pull: "commented on pull request",
  close_pull_request: "closed pull request",
  reopen_pull_request: "reopened pull request",
  commit_repo: "pushed to",
  create_repo: "created repository",
  transfer_repo: "transferred repository",
  create_branch: "created branch",
  push_tag: "pushed tag",
  publish_release: "published a release",
};
const verb = (op: string) => VERBS[op] ?? op.replace(/_/g, " ");

const ISSUE_OPS = new Set([
  "create_issue",
  "close_issue",
  "reopen_issue",
  "comment_issue",
  "create_pull_request",
  "merge_pull_request",
  "comment_pull",
  "close_pull_request",
  "reopen_pull_request",
]);

function issueNumber(a: Activity): number | null {
  try {
    const n = Number(JSON.parse(a.content)[0]);
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function ActivityFeed({
  source,
  onOpen,
}: {
  source: Source;
  onOpen: (owner: string, repo: string, issue: Issue) => void;
}) {
  const { client } = useConnection();
  const feed = useQuery({
    queryKey: ["activity", source],
    enabled: !!client,
    queryFn: () =>
      source.type === "user"
        ? client!.userActivity(source.login)
        : client!.repoActivity(source.owner, source.repo),
  });

  async function openIssue(a: Activity) {
    const n = issueNumber(a);
    if (!n) return;
    const [owner, repo] = a.repo.full_name.split("/");
    const issue = await client!.getIssue(owner, repo, n);
    onOpen(owner, repo, issue);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-3">
        <h2 className="font-semibold">Activity</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {feed.isLoading && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}
        {feed.error && <p className="p-4 text-sm text-red-400">Failed to load activity.</p>}
        {feed.data?.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No recent activity.</p>
        )}
        {feed.data?.map((a) => {
          const n = issueNumber(a);
          const clickable = ISSUE_OPS.has(a.op_type) && !!n;
          return (
            <button
              key={a.id}
              disabled={!clickable}
              onClick={() => clickable && openIssue(a)}
              className={cn(
                "flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left",
                clickable ? "hover:bg-muted" : "cursor-default",
              )}
            >
              <img
                src={a.act_user.avatar_url}
                alt=""
                className="mt-0.5 size-6 shrink-0 rounded-full"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium">{a.act_user.login}</span> {verb(a.op_type)}{" "}
                  {n ? <span className="text-muted-foreground">#{n}</span> : null}{" "}
                  <span className="text-muted-foreground">in {a.repo.full_name}</span>
                </p>
                <p className="text-xs text-muted-foreground">{relativeTime(a.created)}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
