import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BuyerIndicatorsPanel from "./BuyerIndicatorsPanel";
import { buyerUser, mkPurchaseOrder, purchaseContextEmpty } from "./testFixtures";

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

describe("BuyerIndicatorsPanel", () => {
  beforeEach(() => {
    hoisted.useApp.mockReturnValue({ currentUser: null });
    hoisted.usePurchases.mockReturnValue(purchaseContextEmpty());
  });

  it("estado de carregamento", () => {
    hoisted.usePurchases.mockReturnValue({
      ...purchaseContextEmpty(),
      isLoadingPurchases: true,
    });
    render(<BuyerIndicatorsPanel />);
    expect(screen.getByText("Carregando indicadores…")).toBeInTheDocument();
  });

  it("sem usuário mostra zeros e sem dados no gráfico", () => {
    render(<BuyerIndicatorsPanel />);
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("Sem dados para o gráfico.")).toBeInTheDocument();
  });

  it("agrega pedidos do comprador e valor total", () => {
    hoisted.useApp.mockReturnValue({ currentUser: buyerUser });
    hoisted.usePurchases.mockReturnValue({
      ...purchaseContextEmpty(),
      purchaseOrders: [
        mkPurchaseOrder({ id: "a", valorTotal: 200, compradorId: "buyer-1" }),
        mkPurchaseOrder({ id: "b", valorTotal: 400, compradorId: "buyer-1" }),
      ],
    });
    render(<BuyerIndicatorsPanel />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText(/600,00/)).toBeInTheDocument();
  });

  it("relaxedBuyerScope mostra aviso", () => {
    hoisted.useApp.mockReturnValue({ currentUser: buyerUser });
    render(<BuyerIndicatorsPanel relaxedBuyerScope />);
    expect(
      screen.getByText(/Pré-visualização: inclui todos os pedidos/i),
    ).toBeInTheDocument();
  });
});
