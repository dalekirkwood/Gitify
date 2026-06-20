import { useEffect, useState, type ReactNode } from "react";
import { Box } from "ink";

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(n, hi));
}

// Windowed list: renders only `height` rows, scrolling to keep `selected` in view.
export function ScrollList<T>({
  items,
  selected,
  height,
  renderRow,
}: {
  items: T[];
  selected: number;
  height: number;
  renderRow: (item: T, isSelected: boolean, index: number) => ReactNode;
}) {
  const h = Math.max(1, height);
  const [start, setStart] = useState(0);

  useEffect(() => {
    setStart((s) => {
      const max = Math.max(0, items.length - h);
      let ns = s;
      if (selected < s) ns = selected;
      else if (selected >= s + h) ns = selected - h + 1;
      return clamp(ns, 0, max);
    });
  }, [selected, h, items.length]);

  const max = Math.max(0, items.length - h);
  const s = clamp(start, 0, max);
  const window = items.slice(s, s + h);

  return (
    <Box flexDirection="column">
      {window.map((item, i) => {
        const index = s + i;
        return <Box key={index}>{renderRow(item, index === selected, index)}</Box>;
      })}
    </Box>
  );
}

// Compact "n of N" position label for headers.
export function rangeLabel(selected: number, total: number): string {
  return `${total === 0 ? 0 : selected + 1} of ${total}`;
}
