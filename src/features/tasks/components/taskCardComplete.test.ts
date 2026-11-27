import "@/i18n/config";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TaskCard } from "./TaskCard";

export function runTaskCardCompleteTests() {
  const html = renderToStaticMarkup(
    createElement(TaskCard, {
      task: {
        id: "task-1",
        title: "Wipe counters",
        status: "todo",
        priority: "medium",
        created_at: new Date().toISOString(),
        links: null,
      },
      dueBadge: null,
      highlighted: false,
      selectionHandlers: { onClick: () => undefined, onKeyDown: () => undefined },
      onComplete: () => undefined,
    }),
  );
  assert.match(html, /data-testid="task-complete-task-1"/);
  assert.match(html, />Complete</);
}