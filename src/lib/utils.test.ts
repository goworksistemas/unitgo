import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("concatena classes simples", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });
});
