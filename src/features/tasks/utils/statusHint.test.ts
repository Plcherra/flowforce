import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TaskStatusTabs } from "../components/TaskStatusTabs";
import { statusDefinition } from "./statusTabLayout";

export function runStatusHintTests() {
  const sentence = statusDefinition("all");
  assert.equal(sentence, "Every task on this page.");

  const html = renderToStaticMarkup(
    createElement(TaskStatusTabs, {
      statusFilter: "all",
      onStatusChange: () => undefined,
      statusTabs: [
        { value: "all", label: "All", count: 2 },
        { value: "todo", label: "To Do", count: 2 },
        { value: "cancelled", label: "Cancelled", count: 0 },
      ],
    }),
  );

  assert.equal(html.split(sentence).length - 1, 1);
  assert.match(html, new RegExp(`title="${sentence}"`));
  assert.equal(html.includes(`>${sentence}<`), false);
  assert.equal(html.includes(`${sentence}${sentence}`), false);
  assert.match(html, />All</);
}
