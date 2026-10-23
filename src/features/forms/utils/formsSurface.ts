/** Layout contracts for the forms page, builder, and submissions dialog. */

export function builderPaneMode(width: number): "stack" | "columns" {
  return width < 768 ? "stack" : "columns";
}

export const formsTableScroller = "min-w-0 overflow-x-auto";

export const paneScroller = "min-h-0 flex-1 overflow-y-auto";
