import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BuyerHomePanel from "./BuyerHomePanel";
import {
  buyerUser,
  mkPurchaseOrder,
  mkPurchaseRequest,
  mkQuotation,
  purchaseContextEmpty,
} from "./testFixtures";

const hoisted = vi.hoisted(() => ({
  setActiveSection: vi.fn(),
  useApp: vi.fn(),
  usePurchases: vi.fn(),
}));

vi.mock("@/contexts/AppContext", () => ({
  useApp: () => hoisted.useApp(),
}));

vi.mock("@/contexts/PurchaseContext", () => ({
  usePurchases: () => hoisted.usePurchases(),
}));

vi.mock("@/hooks/useNavigation", () => ({
  useNavigation: () => ({ setActiveSection: hoisted.setActiveSection }),
}));

describe("BuyerHomePanel", () => {
  beforeEach(() => {
    hoisted.setActiveSection.mockClear();
    hoisted.useApp.mockReturnValue({ currentUser: null });
    hoisted.usePurchases.mockReturnValue(purchaseContextEmpty());
  });

  it("com isLoadingPurchases mostra aviso mas mantém botões clicáveis", async () => {
    const user = userEvent.setup();
    hoisted.usePurchases.mockReturnValue({
      ...purchaseContextEmpty(),
      isLoadingPurchases: true,
    });
    render(<BuyerHomePanel />);
    expect(screen.getByText(/Sincronizando dados de compras/i)).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: /Itens a tratar nas SCs/i });
    expect(btn).toBeEnabled();
    await user.click(btn);
    expect(hoisted.setActiveSection).toHaveBeenCalledWith("buyer-work", "buyer-sc");
  });

  it("sem usuário, métricas ficam em zero", () => {
    render(<BuyerHomePanel />);
    const btn = screen.getByRole("button", { name: /Itens a tratar nas SCs/i });
    expect(within(btn).getByText("0")).toBeInTheDocument();
  });

  it("conta SC em trabalho para o comprador logado", () => {
    hoisted.useApp.mockReturnValue({ currentUser: buyerUser });
    const sc = mkPurchaseRequest({ status: "in_quotation", compradorId: "buyer-1" });
    hoisted.usePurchases.mockReturnValue({
      ...purchaseContextEmpty(),
      purchaseRequests: [sc],
    });
    render(<BuyerHomePanel />);
    const btn = screen.getByRole("button", { name: /Itens a tratar nas SCs/i });
    expect(within(btn).getByText("1")).toBeInTheDocument();
  });

  it("conta cotações abertas ligadas às SCs do comprador", () => {
    hoisted.useApp.mockReturnValue({ currentUser: buyerUser });
    const sc = mkPurchaseRequest({ id: "sc-x", compradorId: "buyer-1" });
    const q = mkQuotation({
      solicitacaoId: "sc-x",
      status: "draft",
    });
    hoisted.usePurchases.mockReturnValue({
      ...purchaseContextEmpty(),
      purchaseRequests: [sc],
      quotations: [q],
    });
    render(<BuyerHomePanel />);
    const btn = screen.getByRole("button", { name: /Cotações abertas/i });
    expect(within(btn).getByText("1")).toBeInTheDocument();
  });

  it("clique no bloco prioridade chama setActiveSection", async () => {
    const user = userEvent.setup();
    hoisted.useApp.mockReturnValue({ currentUser: buyerUser });
    hoisted.usePurchases.mockReturnValue(purchaseContextEmpty());
    render(<BuyerHomePanel />);
    await user.click(
      screen.getByRole("button", { name: /Itens a tratar nas SCs/i }),
    );
    expect(hoisted.setActiveSection).toHaveBeenCalledWith(
      "buyer-work",
      "buyer-sc",
    );
  });

  it("atalho Lista de solicitações navega para buyer-sc", async () => {
    const user = userEvent.setup();
    hoisted.useApp.mockReturnValue({ currentUser: buyerUser });
    render(<BuyerHomePanel />);
    await user.click(screen.getByRole("button", { name: /Lista de solicitações/i }));
    expect(hoisted.setActiveSection).toHaveBeenCalledWith(
      "buyer-work",
      "buyer-sc",
    );
  });

  it("relaxedBuyerScope exibe aviso de pré-visualização", () => {
    hoisted.useApp.mockReturnValue({ currentUser: buyerUser });
    render(<BuyerHomePanel relaxedBuyerScope />);
    expect(
      screen.getByText(/Pré-visualização: métricas incluem todas as SCs/i),
    ).toBeInTheDocument();
  });

  it("pedidos em aprovação no escopo do comprador", () => {
    hoisted.useApp.mockReturnValue({ currentUser: buyerUser });
    const po = mkPurchaseOrder({
      statusAprovacao: "em_revisao",
      compradorId: "buyer-1",
    });
    hoisted.usePurchases.mockReturnValue({
      ...purchaseContextEmpty(),
      purchaseOrders: [po],
    });
    render(<BuyerHomePanel />);
    const btn = screen.getByRole("button", { name: /Pedidos em aprovação/i });
    expect(within(btn).getByText("1")).toBeInTheDocument();
  });
});
