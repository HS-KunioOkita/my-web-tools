export default `/* Common base styles for all PDF templates.
   All selectors are scoped under .markdown-pdf-root so the dashboard
   layout is never affected by preview/PDF styling. */

@page {
  size: A4;
  margin: var(--mdpdf-page-margin, 25mm);
}

.markdown-pdf-root {
  /* CSS variables — overridden by each template */
  --mdpdf-page-margin: 25mm;
  --mdpdf-font-base: -apple-system, BlinkMacSystemFont, "Hiragino Sans",
    "Yu Gothic UI", "Noto Sans JP", "Segoe UI", sans-serif;
  --mdpdf-font-heading: var(--mdpdf-font-base);
  --mdpdf-font-mono: "JetBrains Mono", "SFMono-Regular", "Menlo", "Consolas",
    monospace;
  --mdpdf-color-text: #1a1a1a;
  --mdpdf-color-heading: #1a1a1a;
  --mdpdf-color-accent: #2563eb;
  --mdpdf-color-rule: #d1d5db;
  --mdpdf-color-code-bg: #f3f4f6;
  --mdpdf-color-code-text: #111827;
  --mdpdf-color-quote-bar: #9ca3af;
  --mdpdf-color-mermaid-error-bg: #fef2f2;
  --mdpdf-color-mermaid-error-border: #dc2626;

  color: var(--mdpdf-color-text);
  font-family: var(--mdpdf-font-base);
  font-size: 11pt;
  line-height: 1.7;
  word-wrap: break-word;
  overflow-wrap: anywhere;
}

.markdown-pdf-root h1,
.markdown-pdf-root h2,
.markdown-pdf-root h3,
.markdown-pdf-root h4,
.markdown-pdf-root h5,
.markdown-pdf-root h6 {
  font-family: var(--mdpdf-font-heading);
  color: var(--mdpdf-color-heading);
  line-height: 1.35;
  margin-top: 1.6em;
  margin-bottom: 0.6em;
  page-break-after: avoid;
}

.markdown-pdf-root h1 {
  font-size: 1.9em;
  border-bottom: 1px solid var(--mdpdf-color-rule);
  padding-bottom: 0.3em;
}

.markdown-pdf-root h2 {
  font-size: 1.55em;
  border-bottom: 1px solid var(--mdpdf-color-rule);
  padding-bottom: 0.2em;
}

.markdown-pdf-root h3 {
  font-size: 1.3em;
}

.markdown-pdf-root h4 {
  font-size: 1.1em;
}

.markdown-pdf-root h5,
.markdown-pdf-root h6 {
  font-size: 1em;
}

.markdown-pdf-root p {
  margin: 0.6em 0;
}

.markdown-pdf-root strong {
  font-weight: 700;
}

.markdown-pdf-root em {
  font-style: italic;
}

.markdown-pdf-root del {
  text-decoration: line-through;
}

.markdown-pdf-root a {
  color: var(--mdpdf-color-accent);
  text-decoration: underline;
}

.markdown-pdf-root ul,
.markdown-pdf-root ol {
  margin: 0.6em 0 0.6em 1.4em;
  padding-left: 0;
}

.markdown-pdf-root li {
  margin: 0.2em 0;
}

.markdown-pdf-root li > ul,
.markdown-pdf-root li > ol {
  margin-top: 0.2em;
  margin-bottom: 0.2em;
}

.markdown-pdf-root blockquote {
  margin: 0.8em 0;
  padding: 0.2em 0 0.2em 1em;
  border-left: 4px solid var(--mdpdf-color-quote-bar);
  color: #4b5563;
}

.markdown-pdf-root hr {
  border: none;
  border-top: 1px solid var(--mdpdf-color-rule);
  margin: 1.2em 0;
}

.markdown-pdf-root code {
  font-family: var(--mdpdf-font-mono);
  font-size: 0.92em;
  background: var(--mdpdf-color-code-bg);
  color: var(--mdpdf-color-code-text);
  padding: 0.1em 0.35em;
  border-radius: 3px;
}

.markdown-pdf-root pre {
  background: var(--mdpdf-color-code-bg);
  color: var(--mdpdf-color-code-text);
  padding: 0.8em 1em;
  border-radius: 4px;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  page-break-inside: avoid;
  margin: 0.8em 0;
}

.markdown-pdf-root pre code {
  background: transparent;
  padding: 0;
  font-size: 0.9em;
}

.markdown-pdf-root table {
  border-collapse: collapse;
  margin: 0.8em 0;
  width: 100%;
  page-break-inside: avoid;
}

.markdown-pdf-root th,
.markdown-pdf-root td {
  border: 1px solid var(--mdpdf-color-rule);
  padding: 0.45em 0.7em;
  text-align: left;
  vertical-align: top;
}

.markdown-pdf-root th {
  background: var(--mdpdf-color-code-bg);
  font-weight: 700;
}

.markdown-pdf-root img {
  max-width: 100%;
  height: auto;
  page-break-inside: avoid;
}

.markdown-pdf-root .mermaid {
  display: flex;
  justify-content: center;
  margin: 1em 0;
  page-break-inside: avoid;
}

.markdown-pdf-root .mermaid > svg {
  max-width: 100%;
  height: auto;
  font-family: var(--mdpdf-font-base);
}

.markdown-pdf-root .markdown-pdf-mermaid-error {
  background: var(--mdpdf-color-mermaid-error-bg);
  border: 1px solid var(--mdpdf-color-mermaid-error-border);
  color: var(--mdpdf-color-mermaid-error-border);
  font-family: var(--mdpdf-font-mono);
  font-size: 0.9em;
  padding: 0.7em 1em;
  border-radius: 4px;
  white-space: pre-wrap;
}
`;
