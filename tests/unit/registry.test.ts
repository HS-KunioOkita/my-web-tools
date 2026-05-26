import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { assertValidTools } from "../../lib/tools/registry";
import type { Tool } from "../../lib/tools/types";

describe("assertValidTools (US3)", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  test("必須フィールド欠落エントリは除外される", () => {
    const input = [
      {
        id: "ok",
        slug: "ok",
        name: "OK",
        description: "ok",
        status: "available",
      },
      {
        id: "",
        slug: "",
        name: "",
        description: "",
        status: "available",
      },
    ] as Tool[];

    const result = assertValidTools(input);
    expect(result.map((t) => t.id)).toEqual(["ok"]);
    expect(warn).toHaveBeenCalled();
  });

  test("slug が ^[a-z0-9-]+$ に違反するエントリは除外される", () => {
    const input: Tool[] = [
      {
        id: "ok",
        slug: "valid-slug",
        name: "OK",
        description: "ok",
        status: "available",
      },
      {
        id: "bad",
        slug: "Bad_Slug!",
        name: "Bad",
        description: "bad",
        status: "available",
      },
    ];

    const result = assertValidTools(input);
    expect(result.map((t) => t.id)).toEqual(["ok"]);
    expect(warn).toHaveBeenCalled();
  });

  test("同一 slug の重複は最初の 1 件のみ残る", () => {
    const input: Tool[] = [
      {
        id: "first",
        slug: "dup",
        name: "First",
        description: "first",
        status: "available",
      },
      {
        id: "second",
        slug: "dup",
        name: "Second",
        description: "second",
        status: "available",
      },
    ];

    const result = assertValidTools(input);
    expect(result.map((t) => t.id)).toEqual(["first"]);
    expect(warn).toHaveBeenCalled();
  });

  test("status が許容値外なら除外される", () => {
    const input = [
      {
        id: "ok",
        slug: "ok",
        name: "OK",
        description: "ok",
        status: "available",
      },
      {
        id: "weird",
        slug: "weird",
        name: "Weird",
        description: "weird",
        status: "in-progress",
      },
    ] as Tool[];

    const result = assertValidTools(input);
    expect(result.map((t) => t.id)).toEqual(["ok"]);
    expect(warn).toHaveBeenCalled();
  });

  test("order 指定エントリが昇順 → 未指定エントリが name 昇順で安定ソートされる", () => {
    const input: Tool[] = [
      {
        id: "no-order-b",
        slug: "no-order-b",
        name: "Bravo",
        description: "x",
        status: "available",
      },
      {
        id: "ordered-2",
        slug: "ordered-2",
        name: "Z2",
        description: "x",
        status: "available",
        order: 2,
      },
      {
        id: "no-order-a",
        slug: "no-order-a",
        name: "Alpha",
        description: "x",
        status: "available",
      },
      {
        id: "ordered-1",
        slug: "ordered-1",
        name: "Z1",
        description: "x",
        status: "available",
        order: 1,
      },
    ];

    const result = assertValidTools(input);
    expect(result.map((t) => t.id)).toEqual([
      "ordered-1",
      "ordered-2",
      "no-order-a",
      "no-order-b",
    ]);
  });
});
