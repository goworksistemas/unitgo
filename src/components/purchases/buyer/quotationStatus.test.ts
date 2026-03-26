import { describe, expect, it } from "vitest";
import { quotationStatusBadgeClass, quotationStatusLabel } from "./quotationStatus";

describe("quotationStatusLabel", () => {
  it("mapeia status conhecidos", () => {
    expect(quotationStatusLabel("draft")).toBe("Rascunho");
    expect(quotationStatusLabel("sent")).toBe("Enviada");
    expect(quotationStatusLabel("responded")).toBe("Respondida");
    expect(quotationStatusLabel("approved")).toBe("Aprovada");
    expect(quotationStatusLabel("rejected")).toBe("Rejeitada");
  });
});

describe("quotationStatusBadgeClass", () => {
  it("approved e rejected usam cores fortes", () => {
    expect(quotationStatusBadgeClass("approved")).toContain("emerald");
    expect(quotationStatusBadgeClass("rejected")).toContain("red");
  });

  it("sent e responded usam âmbar", () => {
    expect(quotationStatusBadgeClass("sent")).toContain("amber");
    expect(quotationStatusBadgeClass("responded")).toContain("amber");
  });

  it("draft usa slate", () => {
    expect(quotationStatusBadgeClass("draft")).toContain("slate");
  });
});
