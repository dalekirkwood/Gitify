import { useQuery } from "@tanstack/react-query";
import { useConnection } from "@/state/connection";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FolderGit2, LogOut } from "lucide-react";
import type { Repo } from "@/lib/forge";

// "shadcn components on the side": projects (repos) sidebar
export function Sidebar({
  active,
  onSelect,
}: {
  active: Repo | null;
  onSelect: (r: Repo) => void;
}) {
  const { client, user, disconnect } = useConnection();
  const repos = useQuery({
    queryKey: ["repos"],
    queryFn: () => client!.listRepos(),
    enabled: !!client,
  });

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-card">
      <div className="p-4 text-sm font-semibold">Projects</div>
      <nav className="flex-1 overflow-y-auto px-2">
        {repos.isLoading && <p className="px-2 text-sm text-muted-foreground">Loading…</p>}
        {repos.error && <p className="px-2 text-sm text-red-400">Failed to load repos</p>}
        {repos.data?.map((r) => (
          <button
            key={r.id}
            onClick={() => onSelect(r)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted",
              active?.id === r.id && "bg-muted font-medium",
            )}
          >
            <FolderGit2 className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{r.full_name}</span>
          </button>
        ))}
      </nav>
      <div className="flex items-center justify-between border-t border-border p-3 text-sm">
        <span className="truncate text-muted-foreground">{user?.login}</span>
        <Button variant="ghost" onClick={() => disconnect()} title="Disconnect">
          <LogOut className="size-4" />
        </Button>
      </div>
    </aside>
  );
}
