import { useState } from "react";
import { useConnection } from "@/state/connection";
import { Sidebar } from "@/components/Sidebar";
import { Connect } from "@/screens/Connect";
import { IssueList } from "@/screens/IssueList";
import { IssueDetail } from "@/screens/IssueDetail";
import type { Issue, Repo } from "@/lib/forge";

export default function App() {
  const { client, ready } = useConnection();
  const [repo, setRepo] = useState<Repo | null>(null);
  const [issue, setIssue] = useState<Issue | null>(null);

  if (!ready) return <div className="flex h-full items-center justify-center">Loading…</div>;
  if (!client) return <Connect />;

  return (
    <div className="flex h-full">
      <Sidebar
        active={repo}
        onSelect={(r) => {
          setRepo(r);
          setIssue(null);
        }}
      />
      <main className="flex-1 overflow-hidden">
        {!repo ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Select a project.
          </div>
        ) : issue ? (
          <IssueDetail repo={repo} issue={issue} onBack={() => setIssue(null)} />
        ) : (
          <IssueList repo={repo} onOpen={setIssue} />
        )}
      </main>
    </div>
  );
}
