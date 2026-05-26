"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import mermaid from "mermaid";
import "./markdown-pdf.css";
import { renderMarkdown } from "@/lib/markdown-pdf/markdown";
import {
  getBaseCss,
  getDefaultTemplate,
  getTemplate,
  listTemplates,
} from "@/lib/markdown-pdf/templates";
import type { PdfTemplateId } from "@/lib/markdown-pdf/types";

const MAX_CHARS = 50_000;
const MAX_BYTES = 1 * 1024 * 1024;
const DEBOUNCE_MS = 150;

type MermaidStatus = "idle" | "rendering" | "ready" | "error";

interface InputError {
  code: "TOO_LARGE" | "EMPTY";
  message: string;
}

interface UploadFeedback {
  tone: "error" | "ok";
  message: string;
}

const ALLOWED_EXT_RE = /\.(md|markdown)$/i;
const ALLOWED_MIME = ["text/markdown", "text/x-markdown", "text/plain", ""];

function utf8ByteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default function MarkdownPdfPage() {
  const defaultTemplate = useMemo(() => getDefaultTemplate(), []);
  const templates = useMemo(() => listTemplates(), []);
  const [source, setSource] = useState("");
  const [templateId, setTemplateId] = useState<PdfTemplateId>(
    defaultTemplate.id,
  );
  const [renderedHtml, setRenderedHtml] = useState("");
  const [mermaidStatus, setMermaidStatus] = useState<MermaidStatus>("idle");
  const [inputError, setInputError] = useState<InputError | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [filenameBase, setFilenameBase] = useState("");
  const [uploadFeedback, setUploadFeedback] = useState<UploadFeedback | null>(
    null,
  );
  const [dragActive, setDragActive] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const template = useMemo(() => getTemplate(templateId), [templateId]);

  // Validate source size on every change.
  useEffect(() => {
    if (source.length === 0) {
      setInputError(null);
      return;
    }
    if (source.length > MAX_CHARS) {
      setInputError({
        code: "TOO_LARGE",
        message: `Markdown が ${MAX_CHARS} 文字を超えています (${source.length} 文字)`,
      });
      return;
    }
    if (utf8ByteLength(source) > MAX_BYTES) {
      setInputError({
        code: "TOO_LARGE",
        message: "Markdown が 1MiB を超えています",
      });
      return;
    }
    setInputError(null);
  }, [source]);

  // Debounce source → renderedHtml.
  useEffect(() => {
    if (inputError) {
      setRenderedHtml("");
      setMermaidStatus("idle");
      return;
    }
    const handle = setTimeout(() => {
      if (source.length === 0) {
        setRenderedHtml("");
        setMermaidStatus("idle");
        return;
      }
      setRenderedHtml(renderMarkdown(source));
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [source, inputError]);

  // Imperatively set the preview HTML so React doesn't reconcile-clobber the
  // mermaid SVG mutations we make below.
  useEffect(() => {
    if (!previewRef.current) return;
    previewRef.current.innerHTML = renderedHtml;
  }, [renderedHtml]);

  // Run mermaid after preview render.
  useEffect(() => {
    if (renderedHtml.length === 0) {
      setMermaidStatus("idle");
      return;
    }
    let cancelled = false;
    setMermaidStatus("rendering");
    (async () => {
      // Yield one frame so the previous useEffect has populated innerHTML.
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      const root = previewRef.current;
      if (!root || cancelled) return;
      const nodes = Array.from(
        root.querySelectorAll<HTMLDivElement>(".mermaid"),
      );
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: template.mermaidTheme,
          securityLevel: "loose",
        });
      } catch {
        // best-effort
      }
      let counter = 0;
      for (const node of nodes) {
        if (cancelled) return;
        const src =
          node.dataset.mermaidSource ?? node.textContent ?? "";
        const id = `mdpdf-preview-${counter++}-${Date.now()}`;
        try {
          const { svg } = await mermaid.render(id, src);
          node.innerHTML = svg;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          node.innerHTML = `<div class="markdown-pdf-mermaid-error">mermaid 構文エラー: ${escapeHtml(msg)}</div>`;
        }
      }
      if (!cancelled) {
        setMermaidStatus("ready");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [renderedHtml, template.mermaidTheme]);

  const downloadDisabled =
    source.length === 0 ||
    inputError !== null ||
    mermaidStatus === "rendering" ||
    generating;

  async function acceptFile(file: File): Promise<void> {
    setUploadFeedback(null);
    if (!ALLOWED_EXT_RE.test(file.name)) {
      setUploadFeedback({
        tone: "error",
        message:
          "Markdown ファイル (.md または .markdown) を選択してください",
      });
      return;
    }
    if (file.type && !ALLOWED_MIME.includes(file.type)) {
      // Some browsers report unusual MIME types; do not block based on MIME
      // alone, but log for awareness.
      console.warn(`Unexpected MIME type for upload: ${file.type}`);
    }
    if (file.size > MAX_BYTES) {
      setUploadFeedback({
        tone: "error",
        message: `ファイルが 1MiB を超えています (${file.size} bytes)`,
      });
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      setUploadFeedback({
        tone: "error",
        message: "ファイルの読み込みに失敗しました",
      });
      return;
    }
    if (text.length > MAX_CHARS) {
      setUploadFeedback({
        tone: "error",
        message: `Markdown が ${MAX_CHARS} 文字を超えています`,
      });
      return;
    }
    if (
      source.length > 0 &&
      !window.confirm("入力欄を上書きします。よろしいですか？")
    ) {
      return;
    }
    setSource(text);
    const base = file.name.replace(ALLOWED_EXT_RE, "");
    setFilenameBase(base.length > 0 ? base : "");
    setUploadFeedback({
      tone: "ok",
      message: `${file.name} を読み込みました`,
    });
  }

  function onFilePicked(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (file) {
      void acceptFile(file);
    }
    // Reset input so the same file can be selected again.
    e.target.value = "";
  }

  function onDrop(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void acceptFile(file);
    }
  }

  async function handleDownload() {
    setGenerationError(null);
    setGenerating(true);
    try {
      const res = await fetch("/tools/markdown-pdf/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markdown: source,
          templateId,
          filename: filenameBase || undefined,
        }),
      });
      if (!res.ok) {
        let errText = "PDF 生成に失敗しました";
        try {
          const body = (await res.json()) as { error?: string; code?: string };
          if (body.error) errText = body.error;
        } catch {
          // not JSON
        }
        setGenerationError(errText);
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const filename = parseFilename(cd) ?? "document.pdf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoke after the download is initiated to ensure browser keeps it.
      setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch (err) {
      setGenerationError(
        err instanceof Error ? err.message : "PDF 生成中にエラーが発生しました",
      );
    } finally {
      setGenerating(false);
    }
  }

  const statusText = generationError
    ? generationError
    : generating
      ? "PDF を生成中..."
      : inputError
        ? inputError.message
        : mermaidStatus === "rendering"
          ? "プレビューを更新中..."
          : source.length === 0
            ? "Markdown を入力するとプレビューが表示されます"
            : "";

  const statusTone: "error" | "ok" | "" = generationError
    ? "error"
    : inputError
      ? "error"
      : "";

  return (
    <main className="mdpdf-page">
      <Link href="/" className="mdpdf-back-link" data-test="back-to-dashboard">
        ← ダッシュボードに戻る
      </Link>
      <header className="mdpdf-header">
        <h1>Markdown → PDF</h1>
        <p>
          Markdown を入力するとプレビューを確認できます。「PDF をダウンロード」で
          PDF が保存されます。
        </p>
      </header>

      <div className="mdpdf-toolbar" data-test="toolbar">
        <div className="mdpdf-toolbar-group">
          <label htmlFor="mdpdf-template">デザインテンプレート</label>
          <select
            id="mdpdf-template"
            data-test="template-select"
            value={templateId}
            onChange={(e) =>
              setTemplateId(e.target.value as PdfTemplateId)
            }
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id} title={t.description}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="mdpdf-download-button"
          data-test="download-button"
          disabled={downloadDisabled}
          onClick={handleDownload}
        >
          PDF をダウンロード
        </button>
      </div>

      <div
        className="mdpdf-upload-zone"
        data-test="upload-zone"
        data-drag={dragActive ? "true" : undefined}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        aria-label="Markdown ファイルをアップロード"
      >
        <strong>📄 .md ファイルをアップロード</strong>
        <span>
          ここをクリックして選択するか、ファイルをドラッグ&ドロップしてください
          (拡張子 .md / .markdown のみ、1MiB / 50,000 文字まで)
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown,text/markdown"
          data-test="file-input"
          onChange={onFilePicked}
        />
      </div>

      {uploadFeedback ? (
        <div
          className="mdpdf-status"
          data-test="upload-feedback"
          data-tone={uploadFeedback.tone}
        >
          {uploadFeedback.message}
        </div>
      ) : null}

      <div
        className="mdpdf-status"
        data-test="status"
        data-tone={statusTone || undefined}
      >
        {statusText}
      </div>

      <div className="mdpdf-split">
        <section className="mdpdf-panel" data-test="editor-panel">
          <div className="mdpdf-panel-title">Markdown</div>
          <textarea
            className="mdpdf-textarea"
            data-test="markdown-input"
            value={source}
            spellCheck={false}
            placeholder={"# サンプル\n\nここに Markdown を入力してください。"}
            onChange={(e) => setSource(e.target.value)}
          />
        </section>
        <section className="mdpdf-panel" data-test="preview-panel">
          <div className="mdpdf-panel-title">プレビュー</div>
          <style
            dangerouslySetInnerHTML={{
              __html: `${getBaseCss()}\n${template.css}`,
            }}
          />
          <div className="mdpdf-preview-scroll">
            {renderedHtml.length === 0 ? (
              <p
                className="mdpdf-preview-empty"
                data-test="preview-empty"
              >
                Markdown を入力するとここにプレビューが表示されます
              </p>
            ) : (
              <div
                ref={previewRef}
                className="markdown-pdf-root"
                data-test="preview-root"
                data-mermaid-status={mermaidStatus}
                data-template={templateId}
                // Body is populated imperatively in useEffect to keep
                // mermaid's SVG mutations from being clobbered on re-render.
                suppressHydrationWarning
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function parseFilename(contentDisposition: string): string | null {
  const utf = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf) {
    try {
      return decodeURIComponent(utf[1].trim());
    } catch {
      // fallthrough
    }
  }
  const ascii = /filename\s*=\s*"?([^";]+)"?/i.exec(contentDisposition);
  return ascii ? ascii[1].trim() : null;
}
