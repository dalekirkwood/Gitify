import { useState } from "react";
import { useConnection } from "@/state/connection";
import { Sidebar } from "@/components/Sidebar";
import { Connect } from "@/screens/Connect";
import { IssueList } from "@/screens/IssueList";
import { IssueDetail } from "@/screens/IssueDetail";
import { Board } from "@/screens/Board";
import { Settings } from "@/screens/Settings";
import { Button } from "@/components/ui/button";
import { Menu, List, KanbanSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Issue } from "@/lib/forge";
import type { View } from "@/lib/view";

const DEFAULT_VIEW: View = { kind: "search", label: "All Issues", params: { state: "open" } };

export default function App() {
  const { client, ready } = useConnection();
  const [view, setView] = useState<View>(DEFAULT_VIEW);
  const [selected, setSelected] = useState<{ owner: string; repo: string; issue: Issue } | null>(null);
  const [open, setOpen] = useState(true);
  const [mode, setMode] = useState<"list" | "board">("list");
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!ready) return <div className="flex h-full items-center justify-center">Loading…</div>;
  if (!client) return <Connect />;

  const isRepo = view.kind === "repo";

  return (
    <div className="relative flex h-full">
      {open && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setOpen(false)} />
      )}
      <Sidebar
        className={open ? "fixed inset-y-0 left-0 z-40 md:static" : "hidden"}
        active={view}
        onClose={() => setOpen(false)}
        onOpenSettings={() => setSettingsOpen(true)}
        onSelect={(v) => {
          setView(v);
          setSelected(null);
          setOpen(false);
        }}
      />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 px-2 pt-2">
          {!open && (
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              title="Menu"
            >
              <Menu className="size-5" />
            </button>
          )}
          {/* List/Kanban toggle — single-project views, desktop only */}
          {isRepo && !selected && (
            <div className="ml-auto hidden md:flex gap-1">
              <Button variant={mode === "list" ? "default" : "outline"} onClick={() => setMode("list")}>
                <List className="size-4" /> List
              </Button>
              <Button variant={mode === "board" ? "default" : "outline"} onClick={() => setMode("board")}>
                <KanbanSquare className="size-4" /> Kanban
              </Button>
            </div>
          )}
        </div>
        <div className={cn("min-h-0 flex-1 overflow-hidden")}>
          {selected ? (
            <IssueDetail
              owner={selected.owner}
              repo={selected.repo}
              issue={selected.issue}
              onBack={() => setSelected(null)}
            />
          ) : isRepo && mode === "board" ? (
            <Board
              owner={view.repo.owner.login}
              repo={view.repo.name}
              onOpen={(owner, repo, issue) => setSelected({ owner, repo, issue })}
            />
          ) : (
            <IssueList view={view} onOpen={(owner, repo, issue) => setSelected({ owner, repo, issue })} />
          )}
        </div>
      </main>

      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
