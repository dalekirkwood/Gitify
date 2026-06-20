import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useConnection } from "@/state/connection";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  FolderGit2,
  Building2,
  ListTodo,
  UserCheck,
  PenLine,
  Activity as ActivityIcon,
  PanelLeftClose,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";
import type { View } from "@/lib/view";

function keyOf(v: View): string {
  return v.kind === "repo" ? `repo:${v.repo.full_name}` : `${v.kind}:${v.label}`;
}

function Collapsible({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className={cn("size-3 transition", open && "rotate-90")} />
        {icon}
        {title}
      </button>
      {open && <div className="pb-1">{children}</div>}
    </div>
  );
}

function NavItem({
  active,
  onClick,
  icon,
  label,
  indent = false,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
  indent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
        indent ? "ml-4 pl-2" : "",
        active && "bg-muted font-medium",
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

function OrgItem({
  org,
  activeKey,
  onSelect,
}: {
  org: string;
  activeKey: string;
  onSelect: (v: View) => void;
}) {
  const { client } = useConnection();
  const [open, setOpen] = useState(false);
  const repos = useQuery({
    queryKey: ["orgRepos", org],
    queryFn: () => client!.listOrgRepos(org),
    enabled: open && !!client,
  });
  const orgView: View = { kind: "search", label: org, params: { owner: org, state: "open" } };

  return (
    <div>
      <div className="flex items-center">
        <button
          onClick={() => setOpen((o) => !o)}
          className="px-1 text-muted-foreground hover:text-foreground"
          aria-label="expand"
        >
          <ChevronRight className={cn("size-3 transition", open && "rotate-90")} />
        </button>
        <NavItem
          active={activeKey === keyOf(orgView)}
          onClick={() => onSelect(orgView)}
          label={org}
        />
      </div>
      {open && (
        <div className="ml-5">
          {repos.isLoading && <p className="px-2 py-1 text-xs text-muted-foreground">Loading…</p>}
          {repos.data?.map((r) => {
            const v: View = { kind: "repo", repo: r };
            return (
              <NavItem
                key={r.id}
                active={activeKey === keyOf(v)}
                onClick={() => onSelect(v)}
                icon={<FolderGit2 className="size-3.5 text-muted-foreground" />}
                label={r.name}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar({
  active,
  onSelect,
  onClose,
  onOpenSettings,
  className,
}: {
  active: View | null;
  onSelect: (v: View) => void;
  onClose: () => void;
  onOpenSettings: () => void;
  className?: string;
}) {
  const { client, user, disconnect } = useConnection();
  const repos = useQuery({ queryKey: ["repos"], queryFn: () => client!.listRepos(), enabled: !!client });
  const orgs = useQuery({ queryKey: ["orgs"], queryFn: () => client!.listOrgs(), enabled: !!client });
  const activeKey = active ? keyOf(active) : "";

  const smart: { label: string; icon: React.ReactNode; v: View }[] = [
    { label: "All Issues", icon: <ListTodo className="size-4" />, v: { kind: "search", label: "All Issues", params: { state: "open" } } },
    { label: "Assigned to me", icon: <UserCheck className="size-4" />, v: { kind: "search", label: "Assigned to me", params: { state: "open", assigned: true } } },
    { label: "Created by me", icon: <PenLine className="size-4" />, v: { kind: "search", label: "Created by me", params: { state: "open", created: true } } },
    { label: "Activity", icon: <ActivityIcon className="size-4" />, v: { kind: "activity", label: "Activity" } },
  ];

  return (
    <aside
      className={cn(
        "flex w-72 max-w-[85vw] shrink-0 flex-col border-r border-border bg-card",
        className,
      )}
    >
      <div className="flex items-center justify-between px-4 pb-4 pt-[max(env(safe-area-inset-top),1.75rem)] md:pt-4">
        <span className="flex items-center gap-2 text-base font-semibold">
          <img src="/icon.svg" alt="" className="size-5" />
          Gitify
        </span>
        <Button variant="ghost" onClick={onClose} title="Collapse" className="px-2">
          <PanelLeftClose className="size-4" />
        </Button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-2">
        <div className="space-y-0.5">
          {smart.map((s) => (
            <NavItem
              key={s.label}
              active={activeKey === keyOf(s.v)}
              onClick={() => onSelect(s.v)}
              icon={s.icon}
              label={s.label}
            />
          ))}
        </div>

        <Collapsible title="Organizations" icon={<Building2 className="size-3.5" />} defaultOpen>
          {orgs.isLoading && <p className="px-3 py-1 text-xs text-muted-foreground">Loading…</p>}
          {orgs.data?.map((o) => (
            <OrgItem key={o.id} org={o.username} activeKey={activeKey} onSelect={onSelect} />
          ))}
        </Collapsible>

        <Collapsible title="Projects" icon={<FolderGit2 className="size-3.5" />}>
          {repos.isLoading && <p className="px-3 py-1 text-xs text-muted-foreground">Loading…</p>}
          {repos.data?.map((r) => {
            const v: View = { kind: "repo", repo: r };
            return (
              <NavItem
                key={r.id}
                active={activeKey === keyOf(v)}
                onClick={() => onSelect(v)}
                icon={<FolderGit2 className="size-3.5 text-muted-foreground" />}
                label={r.full_name}
              />
            );
          })}
        </Collapsible>
      </nav>

      <div className="flex items-center justify-between border-t border-border p-3 text-sm">
        <span className="truncate text-muted-foreground">{user?.login}</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" onClick={onOpenSettings} title="Settings" className="px-2">
            <SettingsIcon className="size-4" />
          </Button>
          <Button variant="ghost" onClick={() => disconnect()} title="Disconnect" className="px-2">
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
