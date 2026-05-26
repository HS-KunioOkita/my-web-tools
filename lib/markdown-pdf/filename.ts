const ASCII_FALLBACK_REPLACER = /[^A-Za-z0-9._-]+/g;

function ensurePdfExtension(name: string): string {
  return name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`;
}

function asciiFallback(name: string): string {
  const replaced = name.replace(ASCII_FALLBACK_REPLACER, "_").replace(/^_+|_+$/g, "");
  return replaced.length > 0 ? replaced : "document";
}

export function buildContentDisposition(filenameBase: string): string {
  const safeBase = filenameBase.length > 0 ? filenameBase : "document";
  const utf8Name = ensurePdfExtension(safeBase);
  const asciiName = ensurePdfExtension(asciiFallback(safeBase));
  const encoded = encodeURIComponent(utf8Name);
  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encoded}`;
}
