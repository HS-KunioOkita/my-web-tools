import type {
  MarkdownDocument,
  PdfTemplate,
  RenderError,
} from "./types";
import { getTemplate, isPdfTemplateId } from "./templates";

const MAX_CHARS = 50_000;
const MAX_BYTES = 1 * 1024 * 1024; // 1 MiB
const MAX_FILENAME = 100;
const FILENAME_FORBIDDEN = /[\\/:*?"<>|\r\n]/;

export interface ParsedRenderRequest {
  document: MarkdownDocument;
  template: PdfTemplate;
}

export type ParseResult =
  | { ok: true; data: ParsedRenderRequest }
  | { ok: false; error: RenderError };

function utf8ByteLength(s: string): number {
  return Buffer.byteLength(s, "utf8");
}

export function parseRenderRequest(body: unknown): ParseResult {
  if (typeof body !== "object" || body === null) {
    return {
      ok: false,
      error: { error: "リクエストボディが不正です", code: "BAD_REQUEST_JSON" },
    };
  }
  const obj = body as Record<string, unknown>;
  const markdown = obj.markdown;
  if (typeof markdown !== "string" || markdown.length === 0) {
    return {
      ok: false,
      error: { error: "Markdown が空です", code: "BAD_REQUEST_MARKDOWN" },
    };
  }
  if (markdown.length > MAX_CHARS) {
    return {
      ok: false,
      error: {
        error: `Markdown が ${MAX_CHARS} 文字を超えています`,
        code: "BAD_REQUEST_MARKDOWN",
      },
    };
  }
  if (utf8ByteLength(markdown) > MAX_BYTES) {
    return {
      ok: false,
      error: {
        error: "Markdown が 1MiB を超えています",
        code: "BAD_REQUEST_MARKDOWN",
      },
    };
  }
  if (!isPdfTemplateId(obj.templateId)) {
    return {
      ok: false,
      error: {
        error: "templateId が不正です",
        code: "BAD_REQUEST_TEMPLATE",
      },
    };
  }
  const template = getTemplate(obj.templateId);

  let filenameBase = "";
  if (obj.filename !== undefined) {
    if (typeof obj.filename !== "string") {
      return {
        ok: false,
        error: { error: "filename が不正です", code: "BAD_REQUEST_FILENAME" },
      };
    }
    if (obj.filename.length > MAX_FILENAME) {
      return {
        ok: false,
        error: {
          error: `filename が ${MAX_FILENAME} 文字を超えています`,
          code: "BAD_REQUEST_FILENAME",
        },
      };
    }
    if (FILENAME_FORBIDDEN.test(obj.filename)) {
      return {
        ok: false,
        error: {
          error: "filename に使用できない文字が含まれています",
          code: "BAD_REQUEST_FILENAME",
        },
      };
    }
    filenameBase = obj.filename;
  }

  return {
    ok: true,
    data: {
      document: { source: markdown, filenameBase },
      template,
    },
  };
}
