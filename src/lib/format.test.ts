import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatDate,
  formatDateShort,
  formatRelativeTimePast,
  getRoleBadge,
  getRoleBadgeVariant,
  getRoleName,
  getStatusConfig,
  replaceUnitIdsWithNames,
} from "./format";

describe("getRoleName", () => {
  it("retorna rótulo conhecido", () => {
    expect(getRoleName("buyer")).toBe("Comprador");
    expect(getRoleName("warehouse")).toBe("Almoxarifado");
  });

  it("retorna o próprio valor se desconhecido", () => {
    expect(getRoleName("custom_role")).toBe("custom_role");
  });
});

describe("getRoleBadge", () => {
  it("retorna sigla conhecida", () => {
    expect(getRoleBadge("buyer")).toBe("CMP");
  });

  it("usa três primeiras letras em maiúsculas para papel desconhecido", () => {
    expect(getRoleBadge("supervisor")).toBe("SUP");
  });
});

describe("getRoleBadgeVariant", () => {
  it("admin e developer são destructive", () => {
    expect(getRoleBadgeVariant("admin")).toBe("destructive");
    expect(getRoleBadgeVariant("developer")).toBe("destructive");
  });

  it("warehouse é secondary", () => {
    expect(getRoleBadgeVariant("warehouse")).toBe("secondary");
  });

  it("buyer cai no default (outline)", () => {
    expect(getRoleBadgeVariant("buyer")).toBe("outline");
  });
});

describe("getStatusConfig", () => {
  it("mapeia status conhecido", () => {
    expect(getStatusConfig("pending")).toEqual({
      label: "Pendente",
      variant: "outline",
    });
  });

  it("usa o próprio status como label quando desconhecido", () => {
    expect(getStatusConfig("unknown_xyz")).toEqual({
      label: "unknown_xyz",
      variant: "outline",
    });
  });
});

describe("replaceUnitIdsWithNames", () => {
  it("substitui UUIDs pelos nomes das unidades", () => {
    const text = "Destino: abc-uuid-1 fim";
    const units = [{ id: "abc-uuid-1", name: "Unidade Norte" }];
    expect(replaceUnitIdsWithNames(text, units)).toBe("Destino: Unidade Norte fim");
  });
});

describe("formatDate / formatDateShort", () => {
  it("formatam data ISO em pt-BR (não vazio)", () => {
    const iso = "2025-03-15T14:30:00.000Z";
    expect(formatDate(iso).length).toBeGreaterThan(0);
    expect(formatDateShort(iso).length).toBeGreaterThan(0);
    expect(formatDateShort(iso)).toMatch(/\d/);
  });
});

describe("formatRelativeTimePast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retorna vazio para undefined", () => {
    expect(formatRelativeTimePast(undefined)).toBe("");
  });

  it("retorna vazio para data inválida", () => {
    expect(formatRelativeTimePast("not-a-date")).toBe("");
  });

  it("retorna 'agora' para instante atual", () => {
    expect(formatRelativeTimePast(new Date("2025-06-15T12:00:00.000Z"))).toBe("agora");
  });

  it("retorna minutos para pouco tempo atrás", () => {
    const d = new Date("2025-06-15T11:30:00.000Z");
    expect(formatRelativeTimePast(d)).toBe("há 30 min");
  });

  it("retorna horas quando passou menos de um dia", () => {
    const d = new Date("2025-06-15T06:00:00.000Z");
    expect(formatRelativeTimePast(d)).toBe("há 6 h");
  });

  it("retorna dias para menos de uma semana", () => {
    const d = new Date("2025-06-10T12:00:00.000Z");
    expect(formatRelativeTimePast(d)).toBe("há 5 dias");
  });

  it("retorna data curta para intervalo maior", () => {
    const d = new Date("2025-05-01T12:00:00.000Z");
    expect(formatRelativeTimePast(d)).toBe(formatDateShort(d));
  });
});
