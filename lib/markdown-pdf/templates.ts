import type { PdfTemplate, PdfTemplateId } from "./types";
import baseCss from "./templates/_base";
import standardCss from "./templates/standard";
import businessCss from "./templates/business";
import technicalCss from "./templates/technical";

const TEMPLATES: PdfTemplate[] = [
  {
    id: "standard",
    name: "標準",
    description: "汎用ドキュメント (README / 議事録 / 一般配布物)",
    mermaidTheme: "default",
    css: standardCss,
  },
  {
    id: "business",
    name: "ビジネス文書",
    description: "社内報告書・配布物向け (明朝/ゴシック混在、余白広め)",
    mermaidTheme: "neutral",
    css: businessCss,
  },
  {
    id: "technical",
    name: "技術文書",
    description: "開発者向け仕様書 (全文ゴシック、コードブロック幅広)",
    mermaidTheme: "forest",
    css: technicalCss,
  },
];

export function getBaseCss(): string {
  return baseCss;
}

export function listTemplates(): PdfTemplate[] {
  return TEMPLATES.slice();
}

export function getDefaultTemplate(): PdfTemplate {
  return TEMPLATES[0];
}

export function getTemplate(id: string): PdfTemplate {
  const found = TEMPLATES.find((t) => t.id === id);
  if (found) return found;
  console.warn(`unknown template id: ${id}; falling back to "standard"`);
  return TEMPLATES[0];
}

export function isPdfTemplateId(value: unknown): value is PdfTemplateId {
  return (
    typeof value === "string" && TEMPLATES.some((t) => t.id === value)
  );
}

export function assertValidTemplates(input: PdfTemplate[] = TEMPLATES): void {
  if (input.length === 0) {
    throw new Error("PdfTemplate registry is empty");
  }
  const ids = new Set<string>();
  for (const t of input) {
    if (!t.id || !t.name || !t.description || !t.css) {
      throw new Error(`PdfTemplate has empty required field: id=${t.id}`);
    }
    if (ids.has(t.id)) {
      throw new Error(`PdfTemplate has duplicate id: ${t.id}`);
    }
    ids.add(t.id);
  }
}

// Self-check at module load so a misconfiguration fails fast at startup.
assertValidTemplates();
