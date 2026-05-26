export type CSSString = string;

export type PdfTemplateId = "standard" | "business" | "technical";

export type MermaidTheme = "default" | "neutral" | "forest" | "dark";

export interface PdfTemplate {
  id: PdfTemplateId;
  name: string;
  description: string;
  mermaidTheme: MermaidTheme;
  css: CSSString;
}

export interface MarkdownDocument {
  source: string;
  filenameBase: string;
}

export interface RenderRequest {
  markdown: string;
  templateId: PdfTemplateId;
  filename?: string;
  /** 0.5〜2.0 倍率 (PDF/プレビュー共通)。未指定なら 1.0。 */
  scale?: number;
}

/** PDF/プレビュー共通の許容倍率レンジ。 */
export const MIN_SCALE = 0.5;
export const MAX_SCALE = 2.0;
export const DEFAULT_SCALE = 1.0;

export type RenderErrorCode =
  | "BAD_REQUEST_JSON"
  | "BAD_REQUEST_MARKDOWN"
  | "BAD_REQUEST_TEMPLATE"
  | "BAD_REQUEST_FILENAME"
  | "BAD_REQUEST_SCALE"
  | "METHOD_NOT_ALLOWED"
  | "CHROMIUM_LAUNCH_FAILED"
  | "MERMAID_TIMEOUT"
  | "PDF_GENERATION_FAILED"
  | "INTERNAL_ERROR";

export interface RenderError {
  error: string;
  code: RenderErrorCode;
}
