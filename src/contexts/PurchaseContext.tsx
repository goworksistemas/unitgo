/**
 * Context do Módulo Sistema de Compras
 * Gerencia estado e operações de purchase requests, suppliers, quotations, etc.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { api } from '../utils/api';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner';
import type {
  PurchaseRequest,
  PurchaseRequestItem,
  PurchaseApproval,
  Supplier,
  SupplierCategory,
  CostCenter,
  Contract,
  Currency,
  Quotation,
  QuotationStatus,
  PurchaseOrder,
  Receiving,
} from '../types/purchases';

interface PurchaseContextType {
  purchaseRequests: PurchaseRequest[];
  suppliers: Supplier[];
  supplierCategories: SupplierCategory[];
  costCenters: CostCenter[];
  contracts: Contract[];
  currencies: Currency[];
  quotations: Quotation[];
  purchaseOrders: PurchaseOrder[];
  receivings: Receiving[];
  isLoadingPurchases: boolean;
  refreshPurchases: () => Promise<void>;
  createPurchaseRequest: (data: Omit<PurchaseRequest, 'id' | 'createdAt' | 'updatedAt'>) => Promise<PurchaseRequest | null>;
  approvePurchaseRequestManager: (id: string, approverId: string, approverName: string) => Promise<void>;
  rejectPurchaseRequestManager: (id: string, approverId: string, approverName: string, justificativa: string) => Promise<void>;
  approvePurchaseRequestDirector: (id: string, approverId: string, approverName: string) => Promise<void>;
  rejectPurchaseRequestDirector: (id: string, approverId: string, approverName: string, justificativa: string) => Promise<void>;
  createSupplier: (data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Supplier | null>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
  createCostCenter: (data: Omit<CostCenter, 'id'>) => Promise<CostCenter | null>;
  createContract: (data: Omit<Contract, 'id' | 'valorConsumido' | 'saldo' | 'createdAt' | 'updatedAt'>) => Promise<Contract | null>;
  createQuotation: (data: Omit<Quotation, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Quotation | null>;
  updateQuotation: (id: string, updates: Partial<Quotation>) => Promise<void>;
  updateQuotationStatus: (id: string, status: Quotation['status'], extra?: Partial<Quotation>) => Promise<void>;
  createPurchaseOrder: (data: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt'>) => Promise<PurchaseOrder | null>;
  updatePurchaseOrder: (id: string, updates: Partial<PurchaseOrder>) => Promise<PurchaseOrder | null>;
  createReceiving: (data: Omit<Receiving, 'id' | 'createdAt'>) => Promise<Receiving | null>;
  approveOrder: (orderId: string, approverId: string, approverName: string) => Promise<void>;
  rejectOrder: (orderId: string, approverId: string, approverName: string, observacao: string) => Promise<void>;
  resendOrderForApproval: (orderId: string, compradorId: string) => Promise<void>;
}

const PurchaseContext = createContext<PurchaseContextType | undefined>(undefined);

export function PurchaseProvider({ children }: { children: ReactNode }) {
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierCategories, setSupplierCategories] = useState<SupplierCategory[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [receivings, setReceivings] = useState<Receiving[]>([]);
  const [isLoadingPurchases, setIsLoadingPurchases] = useState(true);

  const loadPurchases = useCallback(async () => {
    setIsLoadingPurchases(true);
    try {
      const results = await Promise.allSettled([
        api.purchaseRequests.getAll(),
        api.suppliers.getAll(),
        api.supplierCategories.getAll(),
        api.costCenters.getAll(),
        api.contracts.getAll(),
        api.currencies.getAll(),
        api.quotations.getAll(),
        api.purchaseOrders.getAll(),
        api.receivings.getAll(),
      ]);

      const [pr, sup, supCat, cc, cont, curr, quot, po, rec] = results.map((r) =>
        r.status === 'fulfilled' ? (Array.isArray(r.value) ? r.value : []) : []
      );

      const defaultCostCenters: CostCenter[] = (cc as CostCenter[]).length
        ? (cc as CostCenter[])
        : [
            { id: 'cc-1', codigo: 'CC001', nome: 'Administrativo', descricao: 'Centro de custo administrativo', status: 'active' },
            { id: 'cc-2', codigo: 'CC002', nome: 'Operacional', descricao: 'Centro de custo operacional', status: 'active' },
          ];
      const defaultCurrencies: Currency[] = (curr as Currency[]).length
        ? (curr as Currency[])
        : [
            { id: 'cur-1', codigo: 'BRL', simbolo: 'R$', nome: 'Real', status: 'active' },
            { id: 'cur-2', codigo: 'USD', simbolo: '$', nome: 'Dólar', status: 'active' },
          ];

      setPurchaseRequests(pr as PurchaseRequest[]);
      setSuppliers(sup as Supplier[]);
      setSupplierCategories(supCat as SupplierCategory[]);
      setCostCenters(defaultCostCenters);
      setContracts(cont as Contract[]);
      setCurrencies(defaultCurrencies);
      setQuotations(quot as Quotation[]);
      setPurchaseOrders(
        (po as Record<string, unknown>[]).map((o) => ({
          ...o,
          approvals: (o.purchaseOrderApprovals ?? o.approvals ?? []) as PurchaseOrder['approvals'],
        })) as PurchaseOrder[]
      );
      setReceivings(rec as Receiving[]);
    } catch {
      setPurchaseRequests([]);
      setSuppliers([]);
      setSupplierCategories([]);
      setCostCenters([]);
      setContracts([]);
      setCurrencies([]);
      setQuotations([]);
      setPurchaseOrders([]);
      setReceivings([]);
    } finally {
      setIsLoadingPurchases(false);
    }
  }, []);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  const refreshPurchases = useCallback(() => loadPurchases(), [loadPurchases]);

  useEffect(() => {
    const channel = supabase
      .channel('fila-compras')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'purchase_requests',
        },
        () => {
          refreshPurchases();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshPurchases]);

  const createPurchaseRequest = useCallback(
    async (data: Omit<PurchaseRequest, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const created = await api.purchaseRequests.create(data);
        setPurchaseRequests((prev) => [...prev, created as PurchaseRequest]);
        toast.success('Solicitação de compra criada');
        return created as PurchaseRequest;
      } catch (e: any) {
        const id = crypto.randomUUID();
        const now = new Date();
        const created: PurchaseRequest = {
          ...data,
          id,
          itens: data.itens.map((i) => ({ ...i, id: i.id || crypto.randomUUID(), solicitacaoId: id })),
          createdAt: now,
          updatedAt: now,
        };
        setPurchaseRequests((prev) => [...prev, created]);
        toast.success('Solicitação de compra criada (modo local)');
        return created;
      }
    },
    []
  );

  const approvePurchaseRequestManager = useCallback(
    async (id: string, approverId: string, approverName: string) => {
      const updateState = () =>
        setPurchaseRequests((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: 'pending_director' as const,
                  aprovacoes: [
                    ...r.aprovacoes,
                    {
                      id: crypto.randomUUID(),
                      userId: approverId,
                      userName: approverName,
                      role: 'manager' as const,
                      action: 'approved' as const,
                      timestamp: new Date(),
                    },
                  ],
                  updatedAt: new Date(),
                }
              : r
          )
        );
      try {
        await api.purchaseRequests.approveManager(id, { approverId, approverName });
        updateState();
        toast.success('Solicitação aprovada pelo gestor');
      } catch {
        updateState();
        toast.success('Solicitação aprovada pelo gestor (modo local)');
      }
    },
    []
  );

  const rejectPurchaseRequestManager = useCallback(
    async (id: string, approverId: string, approverName: string, justificativa: string) => {
      const updateState = () =>
        setPurchaseRequests((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: 'rejected_manager' as const,
                  aprovacoes: [
                    ...r.aprovacoes,
                    {
                      id: crypto.randomUUID(),
                      userId: approverId,
                      userName: approverName,
                      role: 'manager' as const,
                      action: 'rejected' as const,
                      justificativa,
                      timestamp: new Date(),
                    },
                  ],
                  updatedAt: new Date(),
                }
              : r
          )
        );
      try {
        await api.purchaseRequests.rejectManager(id, { approverId, approverName, justificativa });
        updateState();
        toast.success('Solicitação rejeitada');
      } catch {
        updateState();
        toast.success('Solicitação rejeitada (modo local)');
      }
    },
    []
  );

  const approvePurchaseRequestDirector = useCallback(
    async (id: string, approverId: string, approverName: string) => {
      const updateState = () =>
        setPurchaseRequests((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: 'in_quotation' as const,
                  aprovacoes: [
                    ...r.aprovacoes,
                    {
                      id: crypto.randomUUID(),
                      userId: approverId,
                      userName: approverName,
                      role: 'director' as const,
                      action: 'approved' as const,
                      timestamp: new Date(),
                    },
                  ],
                  updatedAt: new Date(),
                }
              : r
          )
        );
      try {
        await api.purchaseRequests.approveDirector(id, { approverId, approverName });
        updateState();
        toast.success('Solicitação aprovada pela diretoria');
      } catch {
        updateState();
        toast.success('Solicitação aprovada pela diretoria (modo local)');
      }
    },
    []
  );

  const rejectPurchaseRequestDirector = useCallback(
    async (id: string, approverId: string, approverName: string, justificativa: string) => {
      const updateState = () =>
        setPurchaseRequests((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: 'rejected_director' as const,
                  aprovacoes: [
                    ...r.aprovacoes,
                    {
                      id: crypto.randomUUID(),
                      userId: approverId,
                      userName: approverName,
                      role: 'director' as const,
                      action: 'rejected' as const,
                      justificativa,
                      timestamp: new Date(),
                    },
                  ],
                  updatedAt: new Date(),
                }
              : r
          )
        );
      try {
        await api.purchaseRequests.rejectDirector(id, { approverId, approverName, justificativa });
        updateState();
        toast.success('Solicitação rejeitada');
      } catch {
        updateState();
        toast.success('Solicitação rejeitada (modo local)');
      }
    },
    []
  );

  const createSupplier = useCallback(async (data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const created = await api.suppliers.create(data);
      setSuppliers((prev) => [...prev, created as Supplier]);
      toast.success('Fornecedor cadastrado');
      return created as Supplier;
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao cadastrar fornecedor');
      return null;
    }
  }, []);

  const updateSupplier = useCallback(async (id: string, updates: Partial<Supplier>) => {
    try {
      await api.suppliers.update(id, updates);
      setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
      toast.success('Fornecedor atualizado');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atualizar');
    }
  }, []);

  const createCostCenter = useCallback(async (data: Omit<CostCenter, 'id'>) => {
    try {
      const created = await api.costCenters.create(data);
      setCostCenters((prev) => [...prev, created as CostCenter]);
      toast.success('Centro de custo criado');
      return created as CostCenter;
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao criar centro de custo');
      return null;
    }
  }, []);

  const createContract = useCallback(
    async (data: Omit<Contract, 'id' | 'valorConsumido' | 'saldo' | 'createdAt' | 'updatedAt'>) => {
      try {
        const created = await api.contracts.create({ ...data, valorConsumido: 0, saldo: data.valorTotal });
        setContracts((prev) => [...prev, created as Contract]);
        toast.success('Contrato cadastrado');
        return created as Contract;
      } catch (e: any) {
        toast.error(e?.message || 'Erro ao cadastrar contrato');
        return null;
      }
    },
    []
  );

  const createQuotation = useCallback(async (data: Omit<Quotation, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const created = await api.quotations.create(data);
      setQuotations((prev) => [...prev, created as Quotation]);
      toast.success('Cotação criada');
      return created as Quotation;
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao criar cotação');
      return null;
    }
  }, []);

  const updateQuotation = useCallback(async (id: string, updates: Partial<Quotation>) => {
    try {
      const updated = await api.quotations.update(id, updates);
      setQuotations((prev) => prev.map((q) => (q.id === id ? (updated as Quotation) : q)));
      toast.success('Cotação atualizada');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atualizar cotação');
    }
  }, []);

  const updateQuotationStatus = useCallback(
    async (id: string, status: QuotationStatus, extra?: Partial<Quotation>) => {
      const updates: Partial<Quotation> = { status, ...extra };
      if (status === 'sent') {
        updates.linkPreenchimento = extra?.linkPreenchimento ?? crypto.randomUUID();
        updates.enviadoEm = new Date();
      } else if (status === 'responded') {
        updates.respondidoEm = new Date();
      }
      await updateQuotation(id, updates);
    },
    [updateQuotation]
  );

  const createPurchaseOrder = useCallback(async (data: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const created = await api.purchaseOrders.create(data);
      setPurchaseOrders((prev) => [...prev, created as PurchaseOrder]);
      toast.success('Pedido criado');
      return created as PurchaseOrder;
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao criar pedido');
      return null;
    }
  }, []);

  const updatePurchaseOrder = useCallback(async (id: string, updates: Partial<PurchaseOrder>) => {
    try {
      const updated = await api.purchaseOrders.update(id, updates);
      setPurchaseOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, ...(updated as PurchaseOrder) } : o))
      );
      toast.success('Pedido atualizado');
      return updated as PurchaseOrder;
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atualizar pedido');
      return null;
    }
  }, []);

  const createReceiving = useCallback(async (data: Omit<Receiving, 'id' | 'createdAt'>) => {
    try {
      const created = await api.receivings.create({ ...data, createdAt: new Date() });
      setReceivings((prev) => [...prev, created as Receiving]);
      toast.success('Recebimento registrado');
      return created as Receiving;
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao registrar recebimento');
      return null;
    }
  }, []);

  const approveOrder = useCallback(async (orderId: string, approverId: string, approverName: string) => {
    await api.purchaseOrders.approve(orderId, { approverId, approverName });
    setPurchaseOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, statusAprovacao: 'aprovado' as const }
          : o
      )
    );
  }, []);

  const rejectOrder = useCallback(
    async (orderId: string, approverId: string, approverName: string, observacao: string) => {
      await api.purchaseOrders.reject(orderId, { approverId, approverName, observacao });
      setPurchaseOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, statusAprovacao: 'reprovado' as const }
            : o
        )
      );
    },
    []
  );

  const resendOrderForApproval = useCallback(async (orderId: string, compradorId: string) => {
    await api.purchaseOrders.resendForApproval(orderId, { compradorId });
    setPurchaseOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, statusAprovacao: 'em_revisao' as const, versao: (o.versao ?? 1) + 1 }
          : o
      )
    );
  }, []);

  const value: PurchaseContextType = {
    purchaseRequests,
    suppliers,
    supplierCategories,
    costCenters,
    contracts,
    currencies,
    quotations,
    purchaseOrders,
    receivings,
    isLoadingPurchases,
    refreshPurchases,
    createPurchaseRequest,
    approvePurchaseRequestManager,
    rejectPurchaseRequestManager,
    approvePurchaseRequestDirector,
    rejectPurchaseRequestDirector,
    createSupplier,
    updateSupplier,
    createCostCenter,
    createContract,
    createQuotation,
    updateQuotation,
    updateQuotationStatus,
    createPurchaseOrder,
    updatePurchaseOrder,
    createReceiving,
    approveOrder,
    rejectOrder,
    resendOrderForApproval,
  };

  return <PurchaseContext.Provider value={value}>{children}</PurchaseContext.Provider>;
}

export function usePurchases() {
  const ctx = useContext(PurchaseContext);
  if (!ctx) throw new Error('usePurchases must be used within PurchaseProvider');
  return ctx;
}
