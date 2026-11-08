export const HIRING_BLOCK_KINDS = [
  "share_file",
  "share_card",
  "collect_file",
  "collect_text",
  "collect_long_text",
  "collect_yes_no",
  "collect_date",
  "collect_ack",
  "collect_link",
] as const;

export type HiringBlockKind = (typeof HIRING_BLOCK_KINDS)[number];

export type HiringBlock = {
  id: string;
  kind: HiringBlockKind;
  title: string;
  body: string;
  required: boolean;
  sortOrder: number;
  linkUrl: string | null;
  fileName: string | null;
  storagePath: string | null;
};

export type HiringAnswer = {
  blockId: string;
  textValue: string;
  boolValue: boolean | null;
  dateValue: string | null;
  fileName: string | null;
  done: boolean;
  verified: boolean;
};

export function hiringKind(value: string): HiringBlockKind {
  return HIRING_BLOCK_KINDS.includes(value as HiringBlockKind)
    ? (value as HiringBlockKind)
    : "share_card";
}

export function isShareBlock(kind: HiringBlockKind) {
  return kind === "share_file" || kind === "share_card";
}

export function blankHiringBlock(kind: HiringBlockKind, sortOrder: number): HiringBlock {
  return {
    id: "",
    kind,
    title: "",
    body: "",
    required: true,
    sortOrder,
    linkUrl: null,
    fileName: null,
    storagePath: null,
  };
}

export function moveHiringBlock(blocks: HiringBlock[], id: string, direction: -1 | 1) {
  const index = blocks.findIndex((block) => block.id === id);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= blocks.length) return blocks;
  const copy = blocks.slice();
  const [item] = copy.splice(index, 1);
  copy.splice(next, 0, item);
  return copy.map((block, order) => ({ ...block, sortOrder: order }));
}

export function hiringAnswerDone(block: HiringBlock, answer: HiringAnswer | undefined) {
  if (!answer) return false;
  if (block.kind === "collect_ack" || block.kind === "collect_yes_no" || block.kind === "collect_link") {
    return answer.boolValue === true || answer.done;
  }
  if (block.kind === "collect_file" || block.kind === "share_file") return Boolean(answer.fileName);
  if (block.kind === "collect_date") return Boolean(answer.dateValue);
  if (block.kind === "share_card") return answer.done;
  return answer.textValue.trim().length > 0;
}

/** A shared file is already on the block. Every other block waits on the hire. */
export function hiringBlockCountedDone(block: HiringBlock, answer: HiringAnswer | undefined) {
  if (block.kind === "share_file") return Boolean(block.storagePath || block.fileName || answer?.fileName);
  return hiringAnswerDone(block, answer);
}

export function hiringChecklistProgress(
  blocks: readonly HiringBlock[],
  answers: Readonly<Record<string, HiringAnswer | undefined>>,
) {
  const done = blocks.filter((block) => hiringBlockCountedDone(block, answers[block.id])).length;
  return { done, total: blocks.length };
}

export function mergeHiringAnswer(
  block: HiringBlock,
  current: HiringAnswer | undefined,
  patch: Partial<HiringAnswer>,
): HiringAnswer {
  const base: HiringAnswer = current ?? {
    blockId: block.id,
    textValue: "",
    boolValue: null,
    dateValue: null,
    fileName: null,
    done: false,
    verified: false,
  };
  const next: HiringAnswer = { ...base, ...patch, blockId: block.id };
  next.done = hiringAnswerDone(block, next);
  return next;
}

/** A shared file is already on the block. Every other required block waits on the hire. */
export function hiringBlockStillOpen(block: HiringBlock, answer: HiringAnswer | undefined) {
  if (!block.required || block.kind === "share_file") return false;
  return !hiringAnswerDone(block, answer);
}

export function openRequiredHiringBlocks(
  blocks: readonly HiringBlock[],
  answers: Readonly<Record<string, HiringAnswer | undefined>>,
) {
  return blocks.filter((block) => hiringBlockStillOpen(block, answers[block.id]));
}

export function plainHiringText(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
