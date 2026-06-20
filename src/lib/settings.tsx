import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { load, type Store } from "@tauri-apps/plugin-store";

export interface StatusDef {
  name: string;
  color: string; // hex without '#'
}
export interface BoardConfig {
  prefix: string;
  statuses: StatusDef[];
}

export const DEFAULT_BOARD: BoardConfig = {
  prefix: "status/",
  statuses: [
    { name: "To Do", color: "ededed" },
    { name: "In Progress", color: "1f6feb" },
    { name: "Done", color: "2da44e" },
  ],
};

const FILE = "gitify.json";
const KEY = "board";

let store: Store | null = null;
async function get(): Promise<Store> {
  if (!store) store = await load(FILE);
  return store;
}

async function loadBoardConfig(): Promise<BoardConfig> {
  const s = await get();
  const saved = await s.get<BoardConfig>(KEY);
  if (!saved || !saved.statuses?.length) return DEFAULT_BOARD;
  return { prefix: saved.prefix || DEFAULT_BOARD.prefix, statuses: saved.statuses };
}

interface SettingsState {
  config: BoardConfig;
  save: (c: BoardConfig) => Promise<void>;
}
const Ctx = createContext<SettingsState | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<BoardConfig>(DEFAULT_BOARD);

  useEffect(() => {
    loadBoardConfig().then(setConfig).catch(() => setConfig(DEFAULT_BOARD));
  }, []);

  async function save(c: BoardConfig) {
    setConfig(c);
    const s = await get();
    await s.set(KEY, c);
    await s.save();
  }

  const value = useMemo(() => ({ config, save }), [config]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSettings must be used within SettingsProvider");
  return v;
}
