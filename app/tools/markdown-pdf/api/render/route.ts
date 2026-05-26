import "server-only";
import { NextResponse } from "next/server";
import { getBrowser } from "@/lib/markdown-pdf/chromium";
import { renderMarkdown } from "@/lib/markdown-pdf/markdown";
import { buildHtmlDocument } from "@/lib/markdown-pdf/html";
import { buildContentDisposition } from "@/lib/markdown-pdf/filename";
import { getMermaidBundlePath } from "@/lib/markdown-pdf/mermaid-bundle";
import { MERMAID_RUNNER_SCRIPT } from "@/lib/markdown-pdf/mermaid-runner";
import { parseRenderRequest } from "@/lib/markdown-pdf/validation";
import type { RenderError, RenderErrorCode } from "@/lib/markdown-pdf/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MERMAID_TIMEOUT_MS = 10_000;
const PDF_TIMEOUT_MS = 30_000;

function errorResponse(status: number, code: RenderErrorCode, message: string) {
  return NextResponse.json<RenderError>(
    { error: message, code },
    { status },
  );
}

function logEvent(
  level: "info" | "warn" | "error",
  fields: Record<string, unknown>,
) {
  const entry = { component: "markdown-pdf/render", level, ...fields };
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export async function POST(request: Request): Promise<Response> {
  const startedAt = Date.now();
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    logEvent("warn", { code: "BAD_REQUEST_JSON" });
    return errorResponse(400, "BAD_REQUEST_JSON", "リクエストボディが不正です");
  }

  const result = parseRenderRequest(parsed);
  if (!result.ok) {
    logEvent("warn", { code: result.error.code });
    return errorResponse(400, result.error.code, result.error.error);
  }
  const { document, template } = result.data;
  const markdownLength = document.source.length;
  const templateId = template.id;

  try {
    const bodyHtml = renderMarkdown(document.source);
    const html = buildHtmlDocument({ bodyHtml, template });

    let browser;
    try {
      browser = await getBrowser();
    } catch (err) {
      logEvent("error", {
        code: "CHROMIUM_LAUNCH_FAILED",
        markdownLength,
        templateId,
        durationMs: Date.now() - startedAt,
        message: err instanceof Error ? err.message : String(err),
      });
      return errorResponse(
        500,
        "CHROMIUM_LAUNCH_FAILED",
        "PDF 生成エンジンを起動できませんでした",
      );
    }

    const context = await browser.newContext();
    const page = await context.newPage();
    let warnings = 0;
    try {
      await page.setContent(html, { waitUntil: "load" });

      const mermaidPath = await getMermaidBundlePath();
      await page.addScriptTag({ path: mermaidPath });
      await page.addScriptTag({ content: MERMAID_RUNNER_SCRIPT });

      try {
        warnings = await Promise.race([
          page.evaluate(
            (theme) => {
              type Runner = (theme: string) => Promise<number>;
              const fn = (window as unknown as { __mdpdfRunMermaid?: Runner })
                .__mdpdfRunMermaid;
              if (!fn) return Promise.resolve(0);
              return fn(theme);
            },
            template.mermaidTheme,
          ),
          new Promise<number>((_, reject) =>
            setTimeout(() => reject(new Error("MERMAID_TIMEOUT")), MERMAID_TIMEOUT_MS),
          ),
        ]);
      } catch (err) {
        if (err instanceof Error && err.message === "MERMAID_TIMEOUT") {
          logEvent("error", {
            code: "MERMAID_TIMEOUT",
            markdownLength,
            templateId,
            durationMs: Date.now() - startedAt,
          });
          return errorResponse(
            500,
            "MERMAID_TIMEOUT",
            "mermaid 図の描画がタイムアウトしました",
          );
        }
        throw err;
      }

      const pdfBuffer = await Promise.race([
        page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true }),
        new Promise<Buffer>((_, reject) =>
          setTimeout(() => reject(new Error("PDF_TIMEOUT")), PDF_TIMEOUT_MS),
        ),
      ]);

      const duration = Date.now() - startedAt;
      logEvent("info", {
        code: "OK",
        markdownLength,
        templateId,
        durationMs: duration,
        warnings,
        byteSize: pdfBuffer.length,
      });

      const filename = document.filenameBase || "document";
      const headers = new Headers({
        "Content-Type": "application/pdf",
        "Content-Length": String(pdfBuffer.length),
        "Content-Disposition": buildContentDisposition(filename),
        "Cache-Control": "no-store",
        "X-Render-Duration-Ms": String(duration),
        "X-Render-Warnings": String(warnings),
      });
      return new Response(new Uint8Array(pdfBuffer), {
        status: 200,
        headers,
      });
    } finally {
      await page.close().catch(() => {});
      await context.close().catch(() => {});
    }
  } catch (err) {
    logEvent("error", {
      code: "PDF_GENERATION_FAILED",
      markdownLength,
      templateId,
      durationMs: Date.now() - startedAt,
      message: err instanceof Error ? err.message : String(err),
    });
    return errorResponse(
      500,
      "PDF_GENERATION_FAILED",
      "PDF 生成中にエラーが発生しました",
    );
  }
}

export async function GET(): Promise<Response> {
  return new Response(
    JSON.stringify({ error: "method not allowed", code: "METHOD_NOT_ALLOWED" }),
    {
      status: 405,
      headers: { Allow: "POST", "Content-Type": "application/json" },
    },
  );
}

export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;
