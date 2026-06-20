import { useEffect, useRef, useState } from "react";
import { Box, Text, useInput, measureElement, type DOMElement } from "ink";
import Spinner from "ink-spinner";
import type { ForgeClient, ForgeUser } from "../lib/forge";
import type { View } from "../lib/view";
import { useAsync } from "./useAsync";
import { useTerminalSize } from "./useTerminalSize";
import { ScrollList, rangeLabel } from "./ScrollList";

interface Item {
  section: string;
  label: string;
  view: View;
}

export function Sidebar({
  client,
  user,
  onSelect,
  onQuit,
}: {
  client: ForgeClient;
  user: ForgeUser;
  onSelect: (v: View) => void;
  onQuit: () => void;
}) {
  const { columns, rows } = useTerminalSize();
  const repos = useAsync(() => client.listRepos(), []);
  const orgs = useAsync(() => client.listOrgs(), []);
  const [cursor, setCursor] = useState(0);

  const smart: Item[] = [
    { section: "Smart views", label: "All Issues", view: { kind: "search", label: "All Issues", params: { state: "open" } } },
    { section: "Smart views", label: "Assigned to me", view: { kind: "search", label: "Assigned to me", params: { state: "open", assigned: true } } },
    { section: "Smart views", label: "Created by me", view: { kind: "search", label: "Created by me", params: { state: "open", created: true } } },
  ];
  const orgItems: Item[] = (orgs.data ?? []).map((o) => ({
    section: "Organizations",
    label: o.username,
    view: { kind: "search", label: o.username, params: { owner: o.username, state: "open" } },
  }));
  const repoItems: Item[] = (repos.data ?? []).map((r) => ({
    section: "Projects",
    label: r.full_name,
    view: { kind: "repo", repo: r },
  }));
  const items = [...smart, ...orgItems, ...repoItems];

  useInput((input, key) => {
    if (input === "q") return onQuit();
    if (key.downArrow || input === "j") setCursor((c) => Math.min(c + 1, items.length - 1));
    if (key.upArrow || input === "k") setCursor((c) => Math.max(c - 1, 0));
    if (key.pageDown || input === "f") setCursor((c) => Math.min(c + 10, items.length - 1));
    if (key.pageUp || input === "b") setCursor((c) => Math.max(c - 10, 0));
    if (input === "g") setCursor(0);
    if (input === "G") setCursor(items.length - 1);
    if (key.return && items[cursor]) onSelect(items[cursor].view);
  });

  const sel = Math.min(cursor, Math.max(items.length - 1, 0));
  const section = items[sel]?.section ?? "";
  const loading = repos.loading || orgs.loading;

  const bodyRef = useRef<DOMElement | null>(null);
  const [bodyH, setBodyH] = useState(rows - 4);
  useEffect(() => {
    if (bodyRef.current) {
      const { height } = measureElement(bodyRef.current);
      if (height > 0 && height !== bodyH) setBodyH(height);
    }
  });

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      <Box justifyContent="space-between" paddingX={1} borderStyle="round" borderColor="cyan">
        <Text bold color="cyan">
          Gitify · {user.login}
        </Text>
        <Text dimColor>
          {section} · {rangeLabel(sel, items.length)}
        </Text>
      </Box>

      <Box ref={bodyRef} flexGrow={1} flexDirection="column" paddingX={1}>
        {loading ? (
          <Text>
            <Spinner type="dots" /> loading…
          </Text>
        ) : (
          <ScrollList
            items={items}
            selected={sel}
            height={bodyH}
            renderRow={(it, isSel) => (
              <Text
                wrap="truncate"
                color={isSel ? "black" : undefined}
                backgroundColor={isSel ? "cyan" : undefined}
              >
                {isSel ? "▶ " : "  "}
                {it.label}
              </Text>
            )}
          />
        )}
        {repos.error ? <Text color="red">{repos.error}</Text> : null}
      </Box>

      <Box paddingX={1}>
        <Text dimColor wrap="truncate">
          ↑/↓ j/k move · g/G top/bottom · enter open · q quit
        </Text>
      </Box>
    </Box>
  );
}
