import { describe, expect, it } from "vitest";
import { isDriverUser } from "./userProfile";

describe("isDriverUser", () => {
  it("é true para papel driver", () => {
    expect(isDriverUser({ role: "driver", warehouseType: undefined })).toBe(
      true,
    );
  });

  it("é true para warehouse com tipo delivery", () => {
    expect(
      isDriverUser({ role: "warehouse", warehouseType: "delivery" }),
    ).toBe(true);
  });

  it("é false para warehouse sem tipo delivery", () => {
    expect(
      isDriverUser({ role: "warehouse", warehouseType: "storage" }),
    ).toBe(false);
  });

  it("é false para solicitante", () => {
    expect(
      isDriverUser({ role: "requester", warehouseType: undefined }),
    ).toBe(false);
  });
});
