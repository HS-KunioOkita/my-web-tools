/**
 * Script source injected into the page (server-side Chromium *or* client
 * preview iframe) AFTER the mermaid bundle has been loaded.
 *
 * It exposes `window.__mdpdfRunMermaid(theme)` which:
 *   1) initializes mermaid with the given theme
 *   2) iterates over each `.markdown-pdf-root .mermaid` node and tries to
 *      render its source via `mermaid.render`
 *   3) on per-node failure, replaces the node with a styled error placeholder
 *      (does NOT abort the rest of the document)
 *   4) sets `document.body.dataset.mermaidReady = "true"` and
 *      `document.body.dataset.mermaidWarnings` to the count of failed nodes
 *
 * Kept as a plain string so it works identically when piped through
 * `page.addScriptTag({content})` (server) or appended as a `<script>`
 * (client preview).
 */
export const MERMAID_RUNNER_SCRIPT = String.raw`
(function () {
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  window.__mdpdfRunMermaid = async function (theme) {
    var mermaid = window.mermaid;
    if (!mermaid) {
      document.body.dataset.mermaidReady = "true";
      document.body.dataset.mermaidWarnings = "0";
      return 0;
    }
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: theme || "default",
        securityLevel: "loose",
        fontFamily: "var(--mdpdf-font-base)",
      });
    } catch (e) {
      // initialization errors are non-fatal; continue with defaults
    }
    var nodes = document.querySelectorAll(".markdown-pdf-root .mermaid");
    var warnings = 0;
    var counter = 0;
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var source = node.getAttribute("data-mermaid-source");
      if (source === null) source = node.textContent || "";
      var id = "mdpdf-mermaid-" + counter++;
      try {
        var result = await mermaid.render(id, source);
        node.innerHTML = result && result.svg ? result.svg : "";
      } catch (e) {
        warnings++;
        var msg = e && e.message ? e.message : String(e);
        node.innerHTML =
          '<div class="markdown-pdf-mermaid-error">mermaid 構文エラー: ' +
          escapeHtml(msg) +
          "</div>";
      }
    }
    document.body.dataset.mermaidReady = "true";
    document.body.dataset.mermaidWarnings = String(warnings);
    return warnings;
  };
})();
`;
