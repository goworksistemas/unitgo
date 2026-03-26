import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { User } from "@/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BuyerApprovalsHubPanel from "./BuyerApprovalsHubPanel";
import {
  buyerUser,
  mkPurchaseOrder,
  mkPurchaseRequest,
  purchaseContextEmpty,
} from "./testFixtures";

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

const users: User[] = [
  buyerUser,
  {
    id: "sol-1",
    name: "Solicitante Silva",
    email: "sol@test.com",
    role: "requester",
  },
];

describe("BuyerApprovalsHubPanel", () => {
  beforeEach(() => {
    hoisted.useApp.mockReturnValue({
      currentUser: buyerUser,
      getUserById: (id: string) => users.find((u) => u.id === id),
    });
    hoisted.usePurchases.mockReturnValue(purchaseContextEmpty());
  });

  it("carregamento", () => {
    hoisted.usePurchases.mockReturnValue({
      ...purchaseContextEmpty(),
      isLoadingPurchases: true,
    });
    render(<BuyerApprovalsHubPanel />);
    expect(screen.getByText("Carregando…")).toBeInTheDocument();
  });

  it("lista vazia de pedidos quando não há alçada pendente", () => {
    render(<BuyerApprovalsHubPanel />);
    expect(
      screen.getByText(/Nenhum pedido aguardando alçada no seu escopo/i),
    ).toBeInTheDocument();
  });

  it("lista pedido pendente e permite abrir", async () => {
    const user = userEvent.setup();
    const onOpenOrder = vi.fn();
    const po = mkPurchaseOrder({
      id: "po-abrir",
      statusAprovacao: "pendente",
      compradorId: "buyer-1",
      numeroOmie: "PC-99",
    });
    hoisted.usePurchases.mockReturnValue({
      ...purchaseContextEmpty(),
      purchaseOrders: [po],
    });
    render(<BuyerApprovalsHubPanel onOpenOrder={onOpenOrder} />);
    expect(screen.getByText("PC-99")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Abrir pedido/i }));
    expect(onOpenOrder).toHaveBeenCalledWith("po-abrir");
  });

  it("mostra SC aguardando gestão na aba Solicitações", async () => {
    const user = userEvent.setup();
    const sc = mkPurchaseRequest({
      id: "sc-gestao",
      status: "pending_manager",
      compradorId: "buyer-1",
    });
    hoisted.usePurchases.mockReturnValue({
      ...purchaseContextEmpty(),
      purchaseRequests: [sc],
    });
    render(<BuyerApprovalsHubPanel />);
    await user.click(screen.getByRole("tab", { name: /Solicitações/i }));
    expect(screen.getByText("Solicitante Silva")).toBeInTheDocument();
    expect(screen.getByText(/Aguardando Gestor/i)).toBeInTheDocument();
  });
});
