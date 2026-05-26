import type { PdfTemplate } from "./types";
import { getBaseCss } from "./templates";

interface BuildHtmlOptions {
  bodyHtml: string;
  template: PdfTemplate;
}

export function buildHtmlDocument({
  bodyHtml,
  template,
}: BuildHtmlOptions): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>Markdown PDF</title>
<style>${getBaseCss()}\n${template.css}</style>
</head>
<body data-template="${template.id}">
<div class="markdown-pdf-root">${bodyHtml}</div>
</body>
</html>`;
}
