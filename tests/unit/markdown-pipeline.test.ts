import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../../lib/markdown-pdf/markdown";

describe("renderMarkdown", () => {
  it("converts ```mermaid fences to <div class='mermaid'>", () => {
    const src = "```mermaid\nflowchart LR\nA-->B\n```\n";
    const html = renderMarkdown(src);
    expect(html).toContain('<div class="mermaid"');
    expect(html).toContain("data-mermaid-source=");
    expect(html).not.toContain("<pre><code class=\"language-mermaid\"");
  });

  it("leaves non-mermaid code fences as <pre><code> blocks", () => {
    const src = "```python\nprint('hi')\n```\n";
    const html = renderMarkdown(src);
    expect(html).toContain("<pre>");
    expect(html).toContain("<code");
    expect(html).toContain("language-python");
    expect(html).not.toContain('<div class="mermaid"');
  });

  it("escapes inline HTML when html option is false", () => {
    const src = "<script>alert(1)</script>\n\nHello";
    const html = renderMarkdown(src);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders GFM tables", () => {
    const src = "| A | B |\n|---|---|\n| 1 | 2 |\n";
    const html = renderMarkdown(src);
    expect(html).toContain("<table>");
    expect(html).toContain("<th>A</th>");
    expect(html).toContain("<td>1</td>");
  });

  it("preserves multibyte characters", () => {
    const src = "# 日本語\n\nこんにちは、世界。\n";
    const html = renderMarkdown(src);
    expect(html).toContain("日本語");
    expect(html).toContain("こんにちは、世界。");
  });
});
