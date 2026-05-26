export default `.markdown-pdf-root {
  --mdpdf-page-margin: 20mm;
  --mdpdf-font-base: -apple-system, BlinkMacSystemFont, "Hiragino Sans",
    "Yu Gothic UI", "Noto Sans JP", "Segoe UI", sans-serif;
  --mdpdf-font-heading: var(--mdpdf-font-base);
  --mdpdf-color-text: #111827;
  --mdpdf-color-heading: #064e3b;
  --mdpdf-color-accent: #15803d;
  --mdpdf-color-rule: #d1fae5;
  --mdpdf-color-code-bg: #0f172a;
  --mdpdf-color-code-text: #f8fafc;
  font-size: 10.5pt;
  line-height: 1.65;
}
.markdown-pdf-root h1 {
  color: var(--mdpdf-color-heading);
  border-bottom: 3px solid var(--mdpdf-color-accent);
  padding-bottom: 0.3em;
}
.markdown-pdf-root h2 {
  color: var(--mdpdf-color-heading);
  border-bottom: 1px solid var(--mdpdf-color-accent);
}
.markdown-pdf-root h3 {
  color: var(--mdpdf-color-accent);
}
.markdown-pdf-root pre {
  background: var(--mdpdf-color-code-bg);
  color: var(--mdpdf-color-code-text);
  border: 1px solid #1e293b;
}
.markdown-pdf-root pre code {
  color: var(--mdpdf-color-code-text);
}
.markdown-pdf-root code {
  background: #ecfdf5;
  color: #065f46;
}
.markdown-pdf-root a {
  color: var(--mdpdf-color-accent);
}
.markdown-pdf-root table th {
  background: #ecfdf5;
  color: var(--mdpdf-color-heading);
}
`;
