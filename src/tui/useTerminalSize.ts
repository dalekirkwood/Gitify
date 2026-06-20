import { useEffect, useState } from "react";
import { useStdout } from "ink";

export interface Size {
  columns: number;
  rows: number;
}

// Live terminal size; re-renders on resize so the whole UI reflows.
export function useTerminalSize(): Size {
  const { stdout } = useStdout();
  const [size, setSize] = useState<Size>({
    columns: stdout?.columns ?? 80,
    rows: stdout?.rows ?? 24,
  });

  useEffect(() => {
    if (!stdout) return;
    const onResize = () => setSize({ columns: stdout.columns, rows: stdout.rows });
    onResize();
    stdout.on("resize", onResize);
    return () => {
      stdout.off("resize", onResize);
    };
  }, [stdout]);

  return size;
}
