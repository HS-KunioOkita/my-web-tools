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
}

export type RenderErrorCode =
  | "BAD_REQUEST_JSON"
  | "BAD_REQUEST_MARKDOWN"
  | "BAD_REQUEST_TEMPLATE"
  | "BAD_REQUEST_FILENAME"
  | "METHOD_NOT_ALLOWED"
  | "CHROMIUM_LAUNCH_FAILED"
  | "MERMAID_TIMEOUT"
  | "PDF_GENERATION_FAILED"
  | "INTERNAL_ERROR";

export interface RenderError {
  error: string;
  code: RenderErrorCode;
}
