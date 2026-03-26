import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BuyerQuotationsPanel from "./BuyerQuotationsPanel";
import {
  buyerUser,
  mkPurchaseRequest,
  mkQuotation,
  mkSupplier,
  purchaseContextEmpty,
} from "./testFixtures";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const hoisted = vi.hoisted(() => ({
  useApp: vi.fn(),
  usePurchases: vi.fn(),
}));

vi.mock("@/contexts/AppContext", () => ({
  useApp: () => hoisted.useApp(),
}));

vi.mock("@/contexts/PurchaseContext", () => ({
  usePurchases: () => hoisted.usePurchases(),
}));

describe("BuyerQuotationsPanel", () => {
  beforeEach(() => {
    hoisted.useApp.mockReturnValue({ currentUser: buyerUser });
    hoisted.usePurchases.mockReturnValue(purchaseContextEmpty());
  });

  it("carregamento", () => {
    hoisted.usePurchases.mockReturnValue({
      ...purchaseContextEmpty(),
      isLoadingPurchases: true,
    });
    render(<BuyerQuotationsPanel />);
    expect(screen.getByText("Carregando cotações…")).toBeInTheDocument();
  });

  it("sem cotações no escopo", () => {
    const sc = mkPurchaseRequest({ compradorId: "buyer-1" });
    hoisted.usePurchases.mockReturnValue({
      ...purchaseContextEmpty(),
      purchaseRequests: [sc],
    });
    render(<BuyerQuotationsPanel />);
    expect(
      screen.getByText(/Nenhuma cotação no seu escopo ainda/i),
    ).toBeInTheDocument();
  });

  it("lista cotação e envia rascunho", async () => {
    const user = userEvent.setup();
    const sc = mkPurchaseRequest({
      id: "sc-cot",
      status: "in_quotation",
      compradorId: "buyer-1",
    });
    const q = mkQuotation({
      id: "q-draft",
      solicitacaoId: "sc-cot",
      status: "draft",
      linkPreenchimento: "https://exemplo.test/preencher",
    });
    const ctx = purchaseContextEmpty();
    hoisted.usePurchases.mockReturnValue({
      ...ctx,
      purchaseRequests: [sc],
      quotations: [q],
      suppliers: [mkSupplier()],
    });
    render(<BuyerQuotationsPanel />);
    expect(screen.getByText("Fornecedor Alpha LTDA")).toBeInTheDocument();
    expect(screen.getByText("Rascunho")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Enviar$/i }));
    expect(ctx.updateQuotationStatus).toHaveBeenCalledWith(
      "q-draft",
      "sent",
      expect.objectContaining({ linkPreenchimento: "https://exemplo.test/preencher" }),
    );
  });

  it("filtra por texto na busca", async () => {
    const user = userEvent.setup();
    const sc = mkPurchaseRequest({
      id: "sc-filtro",
      compradorId: "buyer-1",
    });
    const q = mkQuotation({
      solicitacaoId: "sc-filtro",
      status: "sent",
    });
    hoisted.usePurchases.mockReturnValue({
      ...purchaseContextEmpty(),
      purchaseRequests: [sc],
      quotations: [q],
      suppliers: [mkSupplier({ razaoSocial: "Beta Industrial" })],
    });
    render(<BuyerQuotationsPanel />);
    const input = screen.getByPlaceholderText(/Filtrar por fornecedor/i);
    await user.type(input, "zzz-inexistente");
    expect(
      screen.getByText(/Nenhum resultado para/i),
    ).toBeInTheDocument();
  });
});
