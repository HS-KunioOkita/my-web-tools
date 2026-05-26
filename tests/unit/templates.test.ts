import { describe, it, expect, vi, afterEach } from "vitest";
import {
  assertValidTemplates,
  getDefaultTemplate,
  getTemplate,
  isPdfTemplateId,
  listTemplates,
} from "../../lib/markdown-pdf/templates";

describe("templates", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getTemplate('standard') returns the standard template", () => {
    const t = getTemplate("standard");
    expect(t.id).toBe("standard");
    expect(t.name).toBeTruthy();
    expect(t.css).toBeTruthy();
  });

  it("getTemplate(unknown id) warns and falls back to standard", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const t = getTemplate("does-not-exist");
    expect(t.id).toBe("standard");
    expect(warn).toHaveBeenCalledOnce();
  });

  it("getDefaultTemplate() === getTemplate('standard')", () => {
    expect(getDefaultTemplate().id).toBe("standard");
  });

  it("listTemplates() returns standard / business / technical in declaration order", () => {
    const ids = listTemplates().map((t) => t.id);
    expect(ids).toEqual(["standard", "business", "technical"]);
  });

  it("getTemplate('business') and getTemplate('technical') return distinct templates", () => {
    const b = getTemplate("business");
    const t = getTemplate("technical");
    expect(b.id).toBe("business");
    expect(t.id).toBe("technical");
    expect(b.css).not.toBe(t.css);
    expect(b.mermaidTheme).toBe("neutral");
    expect(t.mermaidTheme).toBe("forest");
  });

  it("isPdfTemplateId accepts known ids, rejects others", () => {
    expect(isPdfTemplateId("standard")).toBe(true);
    expect(isPdfTemplateId("business")).toBe(true);
    expect(isPdfTemplateId("technical")).toBe(true);
    expect(isPdfTemplateId("unknown")).toBe(false);
    expect(isPdfTemplateId(undefined)).toBe(false);
    expect(isPdfTemplateId(42)).toBe(false);
  });

  it("assertValidTemplates([]) throws", () => {
    expect(() => assertValidTemplates([])).toThrow(/empty/);
  });

  it("assertValidTemplates rejects duplicate ids", () => {
    const dup = listTemplates();
    expect(() => assertValidTemplates([...dup, ...dup])).toThrow(/duplicate/);
  });
});
