import { useState } from "react";
import { useConnection } from "@/state/connection";
import { Sidebar } from "@/components/Sidebar";
import { Connect } from "@/screens/Connect";
import { IssueList } from "@/screens/IssueList";
import { IssueDetail } from "@/screens/IssueDetail";
import type { Issue } from "@/lib/forge";
import type { View } from "@/lib/view";

const DEFAULT_VIEW: View = { kind: "search", label: "All Issues", params: { state: "open" } };

export default function App() {
  const { client, ready } = useConnection();
  const [view, setView] = useState<View>(DEFAULT_VIEW);
  const [selected, setSelected] = useState<{ owner: string; repo: string; issue: Issue } | null>(null);

  if (!ready) return <div className="flex h-full items-center justify-center">Loading…</div>;
  if (!client) return <Connect />;

  return (
    <div className="flex h-full">
      <Sidebar
        active={view}
        onSelect={(v) => {
          setView(v);
          setSelected(null);
        }}
      />
      <main className="flex-1 overflow-hidden">
        {selected ? (
          <IssueDetail
            owner={selected.owner}
            repo={selected.repo}
            issue={selected.issue}
            onBack={() => setSelected(null)}
          />
        ) : (
          <IssueList
            view={view}
            onOpen={(owner, repo, issue) => setSelected({ owner, repo, issue })}
          />
        )}
      </main>
    </div>
  );
}
