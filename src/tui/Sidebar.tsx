import { useEffect, useRef, useState } from "react";
import { Box, Text, useInput, measureElement, type DOMElement } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import type { ForgeClient, ForgeUser } from "../lib/forge";
import type { View } from "../lib/view";
import { useAsync } from "./useAsync";
import { useTerminalSize } from "./useTerminalSize";
import { ScrollList, rangeLabel } from "./ScrollList";

type Entry =
  | { kind: "header"; label: string }
  | { kind: "item"; label: string; section: string; view: View };

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(n, hi));
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
  const [mode, setMode] = useState<"browse" | "filter">("browse");
  const [filter, setFilter] = useState("");

  const smart: { label: string; view: View }[] = [
    { label: "All Issues", view: { kind: "search", label: "All Issues", params: { state: "open" } } },
    { label: "Assigned to me", view: { kind: "search", label: "Assigned to me", params: { state: "open", assigned: true } } },
    { label: "Created by me", view: { kind: "search", label: "Created by me", params: { state: "open", created: true } } },
  ];
  const orgViews: { label: string; view: View }[] = (orgs.data ?? []).map((o) => ({
    label: o.username,
    view: { kind: "search", label: o.username, params: { owner: o.username, state: "open" } },
  }));
  const repoViews: { label: string; view: View }[] = (repos.data ?? []).map((r) => ({
    label: r.full_name,
    view: { kind: "repo", repo: r },
  }));

  const f = filter.trim().toLowerCase();
  const match = (label: string) => !f || label.toLowerCase().includes(f);

  const entries: Entry[] = [];
  const pushSection = (section: string, rows_: { label: string; view: View }[]) => {
    const kept = rows_.filter((r) => match(r.label));
    if (kept.length === 0) return;
    entries.push({ kind: "header", label: section });
    for (const r of kept) entries.push({ kind: "item", label: r.label, section, view: r.view });
  };
  pushSection("Smart views", smart);
  pushSection("Organizations", orgViews);
  pushSection("Projects", repoViews);

  const selectable = entries.reduce<number[]>((acc, e, i) => {
    if (e.kind === "item") acc.push(i);
    return acc;
  }, []);

  // Keep cursor on a real (selectable) row as the list/filter changes.
  useEffect(() => {
    if (selectable.length === 0) return;
    if (!selectable.includes(cursor)) setCursor(selectable[0]);
  }, [entries.length, filter]);

  function step(delta: number) {
    setCursor((cur) => {
      if (selectable.length === 0) return cur;
      const pos = selectable.indexOf(cur);
      const np = clamp((pos < 0 ? 0 : pos) + delta, 0, selectable.length - 1);
      return selectable[np];
    });
  }

  useInput(
    (input, key) => {
      if (input === "q") return onQuit();
      if (input === "/") { setMode("filter"); return; }
      if (key.downArrow || input === "j") return step(1);
      if (key.upArrow || input === "k") return step(-1);
      if (key.pageDown || input === "f") return step(10);
      if (key.pageUp || input === "b") return step(-10);
      if (input === "g") return setCursor(selectable[0] ?? 0);
      if (input === "G") return setCursor(selectable[selectable.length - 1] ?? 0);
      if (key.return) {
        const e = entries[cursor];
        if (e && e.kind === "item") onSelect(e.view);
      }
    },
    { isActive: mode === "browse" },
  );

  useInput(
    (_input, key) => {
      if (key.escape) { setFilter(""); setMode("browse"); }
    },
    { isActive: mode === "filter" },
  );

  const sel = selectable.includes(cursor) ? cursor : (selectable[0] ?? 0);
  const pos = selectable.indexOf(sel);
  const section = entries[sel]?.kind === "item" ? (entries[sel] as Entry & { section: string }).section : "";
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
          {section ? `${section} · ` : ""}{rangeLabel(pos, selectable.length)}
        </Text>
      </Box>

      {mode === "filter" && (
        <Box paddingX={1}>
          <Text>Filter: </Text>
          <TextInput value={filter} onChange={setFilter} onSubmit={() => setMode("browse")} />
        </Box>
      )}

      <Box ref={bodyRef} flexGrow={1} flexDirection="column" paddingX={1}>
        {loading ? (
          <Text>
            <Spinner type="dots" /> loading…
          </Text>
        ) : selectable.length === 0 ? (
          <Text dimColor>{f ? "No matches." : "Nothing here."}</Text>
        ) : (
          <ScrollList
            items={entries}
            selected={sel}
            height={bodyH}
            renderRow={(e, isSel) =>
              e.kind === "header" ? (
                <Text bold dimColor>
                  {`── ${e.label} ${"─".repeat(Math.max(0, columns - e.label.length - 7))}`}
                </Text>
              ) : (
                <Text
                  wrap="truncate"
                  color={isSel ? "black" : undefined}
                  backgroundColor={isSel ? "cyan" : undefined}
                >
                  {isSel ? "▶ " : "  "}
                  {e.label}
                </Text>
              )
            }
          />
        )}
        {repos.error ? <Text color="red">{repos.error}</Text> : null}
      </Box>

      <Box paddingX={1}>
        <Text dimColor wrap="truncate">
          {mode === "filter"
            ? "type to filter · enter apply · esc clear"
            : "↑/↓ j/k move · g/G top/bottom · / filter · enter open · q quit"}
        </Text>
      </Box>
    </Box>
  );
}
