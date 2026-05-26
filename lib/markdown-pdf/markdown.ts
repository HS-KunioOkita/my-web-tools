import MarkdownIt from "markdown-it";

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false,
  breaks: false,
});

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const defaultFence = md.renderer.rules.fence;

md.renderer.rules.fence = function fence(tokens, idx, options, env, self) {
  const token = tokens[idx];
  const info = token.info ? token.info.trim().split(/\s+/)[0] : "";
  if (info === "mermaid") {
    const source = token.content;
    return `<div class="mermaid" data-mermaid-source="${escapeHtml(source)}">${escapeHtml(source)}</div>\n`;
  }
  if (defaultFence) {
    return defaultFence(tokens, idx, options, env, self);
  }
  return self.renderToken(tokens, idx, options);
};

export function renderMarkdown(source: string): string {
  return md.render(source);
}
