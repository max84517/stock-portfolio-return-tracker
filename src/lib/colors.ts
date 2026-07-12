// Validated categorical palette (dark mode), fixed slot order — see the
// dataviz skill's palette.md. Never cycle hues; overflow series share the
// muted fallback instead of repeating a slot.
export const CATEGORICAL_COLORS = [
  "#3987e5", // blue
  "#199e70", // aqua
  "#c98500", // yellow
  "#008300", // green
  "#9085e9", // violet
  "#e66767", // red
  "#d55181", // magenta
  "#d95926", // orange
] as const;

const OVERFLOW_COLOR = "#62666f"; // text-faint, muted fallback for 9th+ series

export function colorForIndex(index: number): string {
  return CATEGORICAL_COLORS[index] ?? OVERFLOW_COLOR;
}

export const TOTAL_LINE_COLOR = "#e8e9ec"; // primary ink — the aggregate line reads as "not a stock"
