// Forgejo / Gitea REST client (/api/v1). One client, base-URL swap covers both.
// HTTP goes through Tauri's http plugin when available so cross-origin calls to
// self-hosted instances aren't blocked by the webview's CORS policy.

// Resolve Tauri's fetch on first use; fall back to browser fetch in `vite dev`
// (browser is same-origin only — the real cross-origin path runs in the app).
let fetchPromise: Promise<typeof fetch> | null = null;
function getFetch(): Promise<typeof fetch> {
  if (!fetchPromise) {
    if (typeof window === "undefined") {
      // Node (terminal app): no webview CORS, so the global fetch hits the
      // instance directly — no Tauri plugin needed.
      fetchPromise = Promise.resolve(fetch);
    } else {
      fetchPromise = import("@tauri-apps/plugin-http")
        .then((m) => m.fetch as unknown as typeof fetch)
        .catch(() => fetch);
    }
  }
  return fetchPromise;
}

export interface ForgeUser {
  id: number;
  login: string;
  full_name: string;
  avatar_url: string;
}
export interface Repo {
  id: number;
  name: string;
  full_name: string;
  owner: ForgeUser;
  description: string;
  open_issues_count: number;
}
export interface Label {
  id: number;
  name: string;
  color: string;
}
export interface Milestone {
  id: number;
  title: string;
  state: string;
}
// /repos/issues/search returns a nested repository ref (owner is a login string)
export interface RepoRef {
  id: number;
  name: string;
  owner: string;
  full_name: string;
}
export interface Issue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  user: ForgeUser;
  assignees: ForgeUser[] | null;
  labels: Label[];
  milestone: Milestone | null;
  comments: number;
  updated_at: string;
  repository?: RepoRef;
}
export interface Comment {
  id: number;
  body: string;
  user: ForgeUser;
  created_at: string;
}
export interface Org {
  id: number;
  username: string;
}

// Activity feed event (/users|repos/.../activities/feeds). content for issue ops
// is a JSON string ["<issueNumber>","<extra>"]; ref_name carries branch/tag ops.
export interface Activity {
  id: number;
  op_type: string;
  act_user: ForgeUser;
  repo: { full_name: string };
  created: string;
  content: string;
  ref_name: string;
}

export interface IssueFilters {
  state?: "open" | "closed" | "all";
  labels?: string;
  milestones?: string;
  q?: string;
  page?: number;
}

// ponytail: pure + stdlib URLSearchParams = edge-correct querystring, no hand-escaping
export function buildIssueQuery(f: IssueFilters): string {
  const p = new URLSearchParams();
  if (f.state) p.set("state", f.state);
  if (f.labels) p.set("labels", f.labels);
  if (f.milestones) p.set("milestones", f.milestones);
  if (f.q) p.set("q", f.q);
  p.set("page", String(f.page ?? 1));
  p.set("limit", "50");
  return p.toString();
}

// Global cross-repo issue search (/repos/issues/search)
export interface SearchFilters {
  state?: "open" | "closed" | "all";
  owner?: string; // restrict to an org/user
  assigned?: boolean; // assigned to me
  created?: boolean; // created by me
  q?: string;
  labels?: string;
  page?: number;
}

export function buildSearchQuery(f: SearchFilters): string {
  const p = new URLSearchParams();
  p.set("type", "issues");
  if (f.state) p.set("state", f.state);
  if (f.owner) p.set("owner", f.owner);
  if (f.assigned) p.set("assigned", "true");
  if (f.created) p.set("created", "true");
  if (f.q) p.set("q", f.q);
  if (f.labels) p.set("labels", f.labels);
  p.set("page", String(f.page ?? 1));
  p.set("limit", "50");
  return p.toString();
}

export class ForgeClient {
  private api: string;
  constructor(
    public baseUrl: string,
    private token: string,
  ) {
    this.api = baseUrl.replace(/\/+$/, "") + "/api/v1";
  }

  private async req<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    const doFetch = await getFetch();
    const res = await doFetch(`${this.api}${path}`, {
      method,
      headers: {
        Authorization: `token ${this.token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 200)}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  whoami = () => this.req<ForgeUser>("/user");
  listRepos = () => this.req<Repo[]>("/user/repos?limit=50");
  listOrgs = () => this.req<Org[]>("/user/orgs?limit=50");
  listOrgRepos = (org: string) => this.req<Repo[]>(`/orgs/${org}/repos?limit=50`);

  // Cross-repo issue search powers the "All / Assigned / Created / by-org" views.
  searchIssues = (f: SearchFilters = {}) =>
    this.req<Issue[]>(`/repos/issues/search?${buildSearchQuery(f)}`);

  listIssues = (owner: string, repo: string, f: IssueFilters = {}) =>
    this.req<Issue[]>(`/repos/${owner}/${repo}/issues?${buildIssueQuery(f)}`);
  getIssue = (owner: string, repo: string, n: number) =>
    this.req<Issue>(`/repos/${owner}/${repo}/issues/${n}`);
  createIssue = (owner: string, repo: string, body: { title: string; body?: string }) =>
    this.req<Issue>(`/repos/${owner}/${repo}/issues`, "POST", body);
  patchIssue = (
    owner: string,
    repo: string,
    n: number,
    body: Partial<{ title: string; body: string; state: "open" | "closed"; assignees: string[] }>,
  ) => this.req<Issue>(`/repos/${owner}/${repo}/issues/${n}`, "PATCH", body);

  listComments = (owner: string, repo: string, n: number) =>
    this.req<Comment[]>(`/repos/${owner}/${repo}/issues/${n}/comments`);
  addComment = (owner: string, repo: string, n: number, body: string) =>
    this.req<Comment>(`/repos/${owner}/${repo}/issues/${n}/comments`, "POST", { body });

  listLabels = (owner: string, repo: string) =>
    this.req<Label[]>(`/repos/${owner}/${repo}/labels`);
  createLabel = (owner: string, repo: string, body: { name: string; color: string }) =>
    this.req<Label>(`/repos/${owner}/${repo}/labels`, "POST", body);
  // Replace the full label set on an issue (used to move a card between status columns).
  setIssueLabels = (owner: string, repo: string, n: number, labels: number[]) =>
    this.req<Label[]>(`/repos/${owner}/${repo}/issues/${n}/labels`, "PUT", { labels });
  listMilestones = (owner: string, repo: string) =>
    this.req<Milestone[]>(`/repos/${owner}/${repo}/milestones`);
  listAssignees = (owner: string, repo: string) =>
    this.req<ForgeUser[]>(`/repos/${owner}/${repo}/assignees`);

  // Recent activity timelines: a user's actions, or everyone's in one repo.
  userActivity = (login: string, limit = 10) =>
    this.req<Activity[]>(`/users/${login}/activities/feeds?limit=${limit}`);
  repoActivity = (owner: string, repo: string, limit = 10) =>
    this.req<Activity[]>(`/repos/${owner}/${repo}/activities/feeds?limit=${limit}`);
}
