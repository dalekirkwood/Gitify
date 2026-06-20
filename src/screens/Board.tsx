import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useConnection } from "@/state/connection";
import { useSettings } from "@/lib/settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Issue, Label } from "@/lib/forge";

const NONE = "none";

function Card({ issue, onOpen }: { issue: Issue; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: issue.number,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onOpen}
      className={cn(
        "cursor-grab rounded-md border border-border bg-card p-3 text-left active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{issue.title}</span>
        <span className="ml-auto text-xs text-muted-foreground">#{issue.number}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {issue.labels.map((l) => (
          <Badge key={l.id} color={l.color}>
            {l.name}
          </Badge>
        ))}
      </div>
      {issue.assignees?.length ? (
        <div className="mt-1 text-xs text-muted-foreground">
          {issue.assignees.map((a) => `@${a.login}`).join(" ")}
        </div>
      ) : null}
    </div>
  );
}

function Column({
  id,
  title,
  issues,
  onOpen,
}: {
  id: string;
  title: string;
  issues: Issue[];
  onOpen: (i: Issue) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-lg border border-border bg-muted/30 p-2",
        isOver && "ring-2 ring-ring",
      )}
    >
      <div className="px-1 py-2 text-sm font-semibold">
        {title} <span className="text-muted-foreground">{issues.length}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {issues.map((i) => (
          <Card key={i.id} issue={i} onOpen={() => onOpen(i)} />
        ))}
      </div>
    </div>
  );
}

export function Board({
  owner,
  repo,
  onOpen,
}: {
  owner: string;
  repo: string;
  onOpen: (owner: string, repo: string, issue: Issue) => void;
}) {
  const { client } = useConnection();
  const { config } = useSettings();
  const qc = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const labelsQ = useQuery({
    queryKey: ["labels", owner, repo],
    queryFn: () => client!.listLabels(owner, repo),
    enabled: !!client,
  });
  const issuesKey = ["board-issues", owner, repo];
  const issuesQ = useQuery({
    queryKey: issuesKey,
    queryFn: () => client!.listIssues(owner, repo, { state: "open" }),
    enabled: !!client,
  });

  // Auto-detect status columns: repo labels under the configured prefix, in config order.
  const statusLabels = useMemo<Label[]>(() => {
    const all = (labelsQ.data ?? []).filter((l) => l.name.startsWith(config.prefix));
    const order = config.statuses.map((s) => config.prefix + s.name);
    return [...all].sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
  }, [labelsQ.data, config]);

  const statusIds = useMemo(() => new Set(statusLabels.map((l) => l.id)), [statusLabels]);

  const columns = useMemo(() => {
    const cols = [{ id: NONE, title: "No status", label: null as Label | null }];
    for (const l of statusLabels) {
      cols.push({ id: String(l.id), title: l.name.slice(config.prefix.length) || l.name, label: l });
    }
    return cols;
  }, [statusLabels, config.prefix]);

  const columnOf = (i: Issue) =>
    String(i.labels.find((l) => statusIds.has(l.id))?.id ?? NONE);

  const setup = useMutation({
    mutationFn: async () => {
      for (const s of config.statuses) {
        await client!.createLabel(owner, repo, { name: config.prefix + s.name, color: s.color });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["labels", owner, repo] }),
  });

  const moveCard = useMutation({
    mutationFn: ({ issue, targetId }: { issue: Issue; targetId: string }) => {
      const kept = issue.labels.filter((l) => !statusIds.has(l.id)).map((l) => l.id);
      const next = targetId === NONE ? kept : [...kept, Number(targetId)];
      return client!.setIssueLabels(owner, repo, issue.number, next);
    },
    onMutate: async ({ issue, targetId }) => {
      await qc.cancelQueries({ queryKey: issuesKey });
      const prev = qc.getQueryData<Issue[]>(issuesKey);
      const target = statusLabels.find((l) => String(l.id) === targetId) ?? null;
      qc.setQueryData<Issue[]>(issuesKey, (old) =>
        (old ?? []).map((i) =>
          i.id === issue.id
            ? { ...i, labels: [...i.labels.filter((l) => !statusIds.has(l.id)), ...(target ? [target] : [])] }
            : i,
        ),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(issuesKey, ctx.prev); // rollback — don't lose the card
    },
    onSettled: () => qc.invalidateQueries({ queryKey: issuesKey }),
  });

  function onDragEnd(e: DragEndEvent) {
    if (!e.over) return;
    const issue = issuesQ.data?.find((i) => i.number === e.active.id);
    const targetId = String(e.over.id);
    if (!issue || columnOf(issue) === targetId) return;
    moveCard.mutate({ issue, targetId });
  }

  if (labelsQ.isLoading || issuesQ.isLoading)
    return <p className="p-4 text-sm text-muted-foreground">Loading…</p>;

  if (statusLabels.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          This project has no <code>{config.prefix}*</code> status labels yet.
        </p>
        <Button onClick={() => setup.mutate()} disabled={setup.isPending}>
          {setup.isPending ? "Creating…" : "Set up board"}
        </Button>
        {setup.error && <p className="text-sm text-red-400">Failed to create labels.</p>}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="flex h-full gap-3 overflow-x-auto p-3">
        {columns.map((c) => (
          <Column
            key={c.id}
            id={c.id}
            title={c.title}
            issues={(issuesQ.data ?? []).filter((i) => columnOf(i) === c.id)}
            onOpen={(i) => onOpen(owner, repo, i)}
          />
        ))}
      </div>
    </DndContext>
  );
}
