import type { User } from "@/types";
import type {
  Contract,
  CostCenter,
  Currency,
  PurchaseOrder,
  PurchaseRequest,
  Quotation,
  Receiving,
  Supplier,
  SupplierCategory,
} from "@/types/purchases";
import { vi } from "vitest";

export const buyerUser: User = {
  id: "buyer-1",
  name: "Comprador Teste",
  email: "comprador@test.com",
  role: "buyer",
};

export function mkPurchaseRequest(
  overrides: Partial<PurchaseRequest> = {},
): PurchaseRequest {
  const id = overrides.id ?? "sc-aaaa-1111-2222-3333-444444444444";
  return {
    id,
    solicitanteId: "sol-1",
    unidadeId: "u-1",
    centroCustoId: "cc-1",
    justificativa: "Compra operacional para testes",
    status: "in_quotation",
    itens: [],
    aprovacoes: [],
    compradorId: "buyer-1",
    createdAt: new Date("2025-06-01"),
    updatedAt: new Date("2025-06-01"),
    ...overrides,
  };
}

export function mkQuotation(overrides: Partial<Quotation> = {}): Quotation {
  const solicitacaoId =
    overrides.solicitacaoId ?? "sc-aaaa-1111-2222-3333-444444444444";
  return {
    id: "quot-1111-2222-3333-444444444444",
    solicitacaoId,
    fornecedorId: "sup-1",
    moedaId: "cur-1",
    status: "draft",
    itens: [],
    createdAt: new Date("2025-06-02"),
    updatedAt: new Date("2025-06-02"),
    ...overrides,
  };
}

export function mkPurchaseOrder(
  overrides: Partial<PurchaseOrder> = {},
): PurchaseOrder {
  return {
    id: "po-1111-2222-3333-444444444444",
    cotacaoId: "quot-1111-2222-3333-444444444444",
    valorTotal: 500,
    status: "created",
    notasFiscais: [],
    statusAprovacao: "pendente",
    compradorId: "buyer-1",
    createdAt: new Date("2025-06-03"),
    updatedAt: new Date("2025-06-03"),
    ...overrides,
  };
}

export function mkSupplier(overrides: Partial<Supplier> = {}): Supplier {
  return {
    id: "sup-1",
    razaoSocial: "Fornecedor Alpha LTDA",
    cnpj: "12.345.678/0001-90",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const brl: Currency = {
  id: "cur-1",
  codigo: "BRL",
  simbolo: "R$",
  nome: "Real",
  status: "active",
};

/** Contexto mínimo compatível com `usePurchases()` nos painéis buyer. */
export function purchaseContextEmpty() {
  return {
    purchaseRequests: [] as PurchaseRequest[],
    suppliers: [] as Supplier[],
    supplierCategories: [] as SupplierCategory[],
    costCenters: [] as CostCenter[],
    contracts: [] as Contract[],
    currencies: [brl],
    quotations: [] as Quotation[],
    purchaseOrders: [] as PurchaseOrder[],
    receivings: [] as Receiving[],
    isLoadingPurchases: false,
    refreshPurchases: vi.fn().mockResolvedValue(undefined),
    createPurchaseRequest: vi.fn(),
    approvePurchaseRequestManager: vi.fn(),
    rejectPurchaseRequestManager: vi.fn(),
    approvePurchaseRequestDirector: vi.fn(),
    rejectPurchaseRequestDirector: vi.fn(),
    createSupplier: vi.fn(),
    updateSupplier: vi.fn(),
    createCostCenter: vi.fn(),
    createContract: vi.fn(),
    createQuotation: vi.fn().mockResolvedValue(null),
    updateQuotation: vi.fn(),
    updateQuotationStatus: vi.fn().mockResolvedValue(undefined),
    createPurchaseOrder: vi.fn(),
    updatePurchaseOrder: vi.fn(),
    createReceiving: vi.fn(),
    approveOrder: vi.fn(),
    rejectOrder: vi.fn(),
    resendOrderForApproval: vi.fn(),
  };
}
