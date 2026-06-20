import { useState } from "react";
import { useApp } from "ink";
import type { ForgeClient, ForgeUser, Issue } from "../lib/forge";
import type { View } from "../lib/view";
import { Sidebar } from "./Sidebar";
import { IssueList } from "./IssueList";
import { IssueDetail } from "./IssueDetail";

interface Target {
  owner: string;
  repo: string;
  issue: Issue;
}

export function App({ client, user }: { client: ForgeClient; user: ForgeUser }) {
  const { exit } = useApp();
  const [view, setView] = useState<View | null>(null);
  const [target, setTarget] = useState<Target | null>(null);

  if (view && target) {
    return (
      <IssueDetail
        client={client}
        owner={target.owner}
        repo={target.repo}
        issue={target.issue}
        onBack={() => setTarget(null)}
      />
    );
  }
  if (view) {
    return (
      <IssueList
        client={client}
        view={view}
        onOpen={(owner, repo, issue) => setTarget({ owner, repo, issue })}
        onBack={() => setView(null)}
      />
    );
  }
  return <Sidebar client={client} user={user} onSelect={setView} onQuit={exit} />;
}
