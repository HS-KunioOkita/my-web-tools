import type { Tool, ToolStatus } from "./types";

const SLUG_PATTERN = /^[a-z0-9-]+$/;
const ALLOWED_STATUSES: ReadonlyArray<ToolStatus> = ["available", "coming-soon"];

const RAW_TOOLS: Tool[] = [
  {
    id: "markdown-pdf",
    slug: "markdown-pdf",
    name: "Markdown → PDF",
    description: "日本語と mermaid を含む Markdown を PDF に書き出す",
    category: "text",
    status: "available",
  },
  {
    id: "time-convert",
    slug: "time-convert",
    name: "時刻変換",
    description: "Unixtime ⇄ ISO 8601 など各種時刻表記の相互変換",
    category: "time",
    status: "coming-soon",
  },
  {
    id: "json-format",
    slug: "json-format",
    name: "JSON フォーマッタ",
    description: "JSON の整形・最小化・キー並び替え",
    category: "text",
    status: "coming-soon",
  },
];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isAllowedStatus(value: unknown): value is ToolStatus {
  return ALLOWED_STATUSES.includes(value as ToolStatus);
}

export function assertValidTools(input: Tool[]): Tool[] {
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const valid: Tool[] = [];

  for (const entry of input) {
    if (
      !isNonEmptyString(entry?.id) ||
      !isNonEmptyString(entry?.slug) ||
      !isNonEmptyString(entry?.name) ||
      !isNonEmptyString(entry?.description)
    ) {
      console.warn(
        `Tool entry skipped: missing required field (id=${entry?.id ?? "?"})`,
      );
      continue;
    }

    if (!SLUG_PATTERN.test(entry.slug)) {
      console.warn(`Invalid slug format: ${entry.slug}`);
      continue;
    }

    if (!isAllowedStatus(entry.status)) {
      console.warn(
        `Tool entry skipped: invalid status (id=${entry.id}, status=${String(entry.status)})`,
      );
      continue;
    }

    if (seenIds.has(entry.id) || seenSlugs.has(entry.slug)) {
      console.warn(`Duplicate slug/id skipped: ${entry.slug}`);
      continue;
    }

    const order =
      typeof entry.order === "number" && Number.isFinite(entry.order)
        ? entry.order
        : undefined;

    seenIds.add(entry.id);
    seenSlugs.add(entry.slug);
    valid.push({ ...entry, order });
  }

  return sortTools(valid);
}

function sortTools(input: Tool[]): Tool[] {
  // Stable sort: ordered entries (asc) first, then unordered by name (asc).
  // Each group preserves declaration order on ties.
  const ordered = input
    .map((tool, index) => ({ tool, index }))
    .filter((x) => x.tool.order !== undefined);
  const unordered = input
    .map((tool, index) => ({ tool, index }))
    .filter((x) => x.tool.order === undefined);

  ordered.sort((a, b) => {
    const diff = (a.tool.order ?? 0) - (b.tool.order ?? 0);
    return diff !== 0 ? diff : a.index - b.index;
  });

  unordered.sort((a, b) => {
    const diff = a.tool.name.localeCompare(b.tool.name);
    return diff !== 0 ? diff : a.index - b.index;
  });

  return [...ordered, ...unordered].map((x) => x.tool);
}

export const tools = assertValidTools(RAW_TOOLS);
