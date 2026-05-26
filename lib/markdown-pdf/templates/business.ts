export default `.markdown-pdf-root {
  --mdpdf-page-margin: 30mm;
  --mdpdf-font-base: "Yu Mincho", "Hiragino Mincho ProN", "Noto Serif JP",
    "MS Mincho", serif;
  --mdpdf-font-heading: "Yu Gothic UI", "Hiragino Sans", "Noto Sans JP",
    "Meiryo", sans-serif;
  --mdpdf-color-text: #1f2937;
  --mdpdf-color-heading: #111827;
  --mdpdf-color-accent: #1f2937;
  --mdpdf-color-rule: #cbd5e1;
  --mdpdf-color-code-bg: #f1f5f9;
  font-size: 11.5pt;
  line-height: 1.85;
}
.markdown-pdf-root h1,
.markdown-pdf-root h2 {
  border-bottom: 2px solid var(--mdpdf-color-rule);
  letter-spacing: 0.04em;
}
.markdown-pdf-root h1 {
  text-align: center;
  border-bottom-width: 3px;
  padding-bottom: 0.4em;
  margin-bottom: 1.2em;
}
.markdown-pdf-root blockquote {
  background: #f8fafc;
  border-left-color: #475569;
}
`;
