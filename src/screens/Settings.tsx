import { useState } from "react";
import { useSettings, type BoardConfig } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, ArrowUp, ArrowDown, Plus } from "lucide-react";

export function Settings({ onClose }: { onClose: () => void }) {
  const { config, save } = useSettings();
  const [draft, setDraft] = useState<BoardConfig>(() => structuredClone(config));

  const update = (i: number, patch: Partial<{ name: string; color: string }>) =>
    setDraft((d) => ({ ...d, statuses: d.statuses.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const remove = (i: number) =>
    setDraft((d) => ({ ...d, statuses: d.statuses.filter((_, j) => j !== i) }));
  const move = (i: number, dir: -1 | 1) =>
    setDraft((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.statuses.length) return d;
      const s = [...d.statuses];
      [s[i], s[j]] = [s[j], s[i]];
      return { ...d, statuses: s };
    });
  const add = () =>
    setDraft((d) => ({ ...d, statuses: [...d.statuses, { name: "New", color: "8b949e" }] }));

  async function onSave() {
    await save({
      prefix: draft.prefix.trim() || "status/",
      statuses: draft.statuses.filter((s) => s.name.trim()),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg space-y-4 rounded-lg border border-border bg-card p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Board settings</h2>

        <label className="block space-y-1">
          <span className="text-sm text-muted-foreground">Status label prefix</span>
          <Input
            value={draft.prefix}
            onChange={(e) => setDraft((d) => ({ ...d, prefix: e.target.value }))}
            placeholder="status/"
          />
          <span className="text-xs text-muted-foreground">
            Columns are repo labels under this prefix (e.g. <code>{draft.prefix || "status/"}To Do</code>).
          </span>
        </label>

        <div className="space-y-2">
          <span className="text-sm text-muted-foreground">Default statuses</span>
          {draft.statuses.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="color"
                value={`#${s.color}`}
                onChange={(e) => update(i, { color: e.target.value.replace("#", "") })}
                className="h-8 w-8 shrink-0 cursor-pointer rounded border border-border bg-transparent"
              />
              <Input value={s.name} onChange={(e) => update(i, { name: e.target.value })} />
              <Button variant="ghost" className="px-2" onClick={() => move(i, -1)} title="Up">
                <ArrowUp className="size-4" />
              </Button>
              <Button variant="ghost" className="px-2" onClick={() => move(i, 1)} title="Down">
                <ArrowDown className="size-4" />
              </Button>
              <Button variant="ghost" className="px-2" onClick={() => remove(i)} title="Remove">
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={add}>
            <Plus className="size-4" /> Add status
          </Button>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave}>Save</Button>
        </div>
      </div>
    </div>
  );
}
