/**
 * GOWORK - App Context
 * 
 * Context principal que gerencia estado global, autenticação, CRUD operations,
 * sistema de códigos diários e confirmação de entregas
 */

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { User, Unit, Item, UnitStock, Movement, SimpleMovement, Loan, Category, Request, FurnitureTransfer, FurnitureRemovalRequest, FurnitureRequestToDesigner, DeliveryBatch, DeliveryConfirmation } from '../types';
import { api } from '../utils/api';
import { generateRandomDailyCode, isDailyCodeExpired } from '../utils/dailyCode';
import { projectId, publicAnonKey, functionSlug } from '../utils/supabase/info';
import { authService } from '../utils/auth';

interface AppContextType {
  currentUser: User | null;
  currentUnit: Unit | null;
  users: User[];
  units: Unit[];
  items: Item[];
  categories: Category[];
  unitStocks: UnitStock[];
  movements: SimpleMovement[];
  loans: Loan[];
  requests: Request[];
  furnitureTransfers: FurnitureTransfer[];
  furnitureRemovalRequests: FurnitureRemovalRequest[];
  furnitureRequestsToDesigner: FurnitureRequestToDesigner[];
  deliveryBatches: DeliveryBatch[];
  deliveryConfirmations: DeliveryConfirmation[];
  isLoading: boolean;
  login: (userId: string) => void;
  logout: () => void;
  setCurrentUnit: (unitId: string) => void;
  addMovement: (movement: Omit<SimpleMovement, 'id' | 'timestamp' | 'createdAt'>) => Promise<void>;
  addLoan: (loan: Omit<Loan, 'id' | 'withdrawalDate'>) => Promise<void>;
  updateLoan: (loanId: string, updates: Partial<Loan>) => Promise<void>;
  updateStock: (stockId: string, quantity: number, location?: string, minimumQuantity?: number) => Promise<void>;
  updateStockWithLocation: (stockId: string, quantity: number, location: string) => void;
  addItemWithStock: (item: Omit<Item, 'id'> & { createdAt?: Date; updatedAt?: Date }, unitId: string, quantity: number, location: string) => Promise<string>;
  addItem: (item: Omit<Item, 'id'> & { createdAt?: Date; updatedAt?: Date }) => void;
  updateItem: (itemId: string, updates: Partial<Item>) => void;
  addStock: (stock: Omit<UnitStock, 'id'>) => void;
  addRequest: (request: Omit<Request, 'id' | 'createdAt'>) => void;
  updateRequest: (requestId: string, updates: Partial<Request>) => void;
  addFurnitureTransfer: (transfer: Omit<FurnitureTransfer, 'id' | 'createdAt'>) => void;
  updateFurnitureTransfer: (transferId: string, updates: Partial<FurnitureTransfer>) => void;
  addFurnitureRemovalRequest: (request: Omit<FurnitureRemovalRequest, 'id' | 'createdAt'>) => void;
  updateFurnitureRemovalRequest: (requestId: string, updates: Partial<FurnitureRemovalRequest>) => void;
  addFurnitureRequestToDesigner: (request: Omit<FurnitureRequestToDesigner, 'id' | 'createdAt'>) => void;
  updateFurnitureRequestToDesigner: (requestId: string, updates: Partial<FurnitureRequestToDesigner>) => void;
  addUser: (user: Omit<User, 'id'> & { password?: string }) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  deleteUser: (userId: string) => void;
  addUnit: (unit: Omit<Unit, 'id'>) => void;
  updateUnit: (unitId: string, updates: Partial<Unit>) => void;
  deleteUnit: (unitId: string) => void;
  getAvailableUnits: () => Unit[];
  getWarehouseUnitId: () => string | undefined;
  getStockForItem: (itemId: string, unitId: string) => UnitStock | undefined;
  getItemById: (itemId: string) => Item | undefined;
  getCategoryById: (categoryId: string) => Category | undefined;
  getUnitById: (unitId: string) => Unit | undefined;
  getUserById: (userId: string) => User | undefined;
  createDeliveryBatch: (requestIds: string[], furnitureRequestIds: string[], targetUnitId: string, driverUserId: string) => string;
  confirmDelivery: (batchId: string, confirmation: Omit<DeliveryConfirmation, 'id' | 'batchId' | 'timestamp'>, receiverDailyCode: string) => Promise<void>;
  confirmReceipt: (batchId: string, confirmation: Omit<DeliveryConfirmation, 'id' | 'batchId' | 'timestamp'>) => Promise<void>;
  getDeliveryBatchById: (batchId: string) => DeliveryBatch | undefined;
  getConfirmationsForBatch: (batchId: string) => DeliveryConfirmation[];
  separateItemInBatch: (requestId: string, batchId: string) => Promise<void>;
  getUserDailyCode: (userId: string) => string;
  getUserByDailyCode: (code: string) => User | undefined;
  validateUserDailyCode: (userId: string, code: string) => boolean;
  confirmFurnitureDelivery: (furnitureRequestId: string, confirmation: Omit<DeliveryConfirmation, 'id' | 'furnitureRequestId' | 'timestamp'>, receiverDailyCode: string) => Promise<void>;
  markDeliveryAsPendingConfirmation: (batchId: string, notes?: string) => Promise<void>;
  confirmDeliveryByRequester: (
    batchId: string, 
    confirmationData: { userId: string; userName: string; notes?: string; dailyCode: string }
  ) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUnit, setCurrentUnitState] = useState<Unit | null>(null);
  const [appUsers, setAppUsers] = useState<User[]>([]);
  const [appUnits, setAppUnits] = useState<Unit[]>([]);
  const [appItems, setAppItems] = useState<Item[]>([]);
  const [appCategories, setAppCategories] = useState<Category[]>([]);
  const [appUnitStocks, setAppUnitStocks] = useState<UnitStock[]>([]);
  const [appMovements, setAppMovements] = useState<SimpleMovement[]>([]);
  const [appLoans, setAppLoans] = useState<Loan[]>([]);
  const [appRequests, setAppRequests] = useState<Request[]>([]);
  const [appFurnitureTransfers, setAppFurnitureTransfers] = useState<FurnitureTransfer[]>([]);
  const [appFurnitureRemovalRequests, setAppFurnitureRemovalRequests] = useState<FurnitureRemovalRequest[]>([]);
  const [appFurnitureRequestsToDesigner, setAppFurnitureRequestsToDesigner] = useState<FurnitureRequestToDesigner[]>([]);
  const [appDeliveryBatches, setAppDeliveryBatches] = useState<DeliveryBatch[]>([]);
  const [appDeliveryConfirmations, setAppDeliveryConfirmations] = useState<DeliveryConfirmation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const initGenerationRef = useRef(0);

  // Fluxo unificado: validar sessão -> carregar dados -> restaurar usuário
  useEffect(() => {
    const generation = ++initGenerationRef.current;

    const initApp = async () => {
      let validatedUserId: string | null = null;

      // 1. Se há sessão salva, valida com o backend (rede/5xx não deslogam)
      if (authService.hasStoredSession()) {
        const storedUserId = authService.getStoredUserId();
        console.log('🔄 Sessão encontrada no localStorage, validando...');

        const authState = await authService.validateAuthState();
        if (authState === 'logged_out') {
          console.log('⚠️ Sessão inválida ou expirada');
          validatedUserId = null;
        } else {
          validatedUserId = storedUserId;
          if (authState === 'offline') {
            console.log('⚠️ Validação adiada (rede/servidor); usando sessão local');
          } else {
            console.log('✅ Sessão válida no backend');
          }
        }
      }

      if (generation !== initGenerationRef.current) return;

      // 2. Carregar dados do backend
      try {
        console.log('🔄 Carregando dados do backend...');

        const results = await Promise.allSettled([
          api.users.getAll(),
          api.units.getAll(),
          api.categories.getAll(),
          api.items.getAll(),
          api.unitStocks.getAll(),
          api.movements.getAll(),
          api.loans.getAll(),
          api.requests.getAll(),
          api.furnitureTransfers.getAll(),
          api.furnitureRemovalRequests.getAll(),
          api.furnitureRequestsToDesigner.getAll(),
          api.deliveryBatches.getAll(),
          api.deliveryConfirmations.getAll(),
        ]);

        const unwrap = <T,>(r: PromiseSettledResult<T>, fallback: T): T =>
          r.status === 'fulfilled' ? (r.value ?? fallback) : fallback;

        const usersData = unwrap(results[0], []);
        const unitsData = unwrap(results[1], []);
        const categoriesData = unwrap(results[2], []);
        const itemsData = unwrap(results[3], []);
        const unitStocksData = unwrap(results[4], []);
        const movementsData = unwrap(results[5], []);
        const loansData = unwrap(results[6], []);
        const requestsData = unwrap(results[7], []);
        const furnitureTransfersData = unwrap(results[8], []);
        const furnitureRemovalRequestsData = unwrap(results[9], []);
        const furnitureRequestsToDesignerData = unwrap(results[10], []);
        const deliveryBatchesData = unwrap(results[11], []);
        const deliveryConfirmationsData = unwrap(results[12], []);

        results.forEach((r, i) => {
          if (r.status === 'rejected') {
            const names = ['users', 'units', 'categories', 'items', 'unitStocks', 'movements', 'loans', 'requests', 'furnitureTransfers', 'furnitureRemovalRequests', 'furnitureRequestsToDesigner', 'deliveryBatches', 'deliveryConfirmations'];
            console.warn(`⚠️ Falha ao carregar ${names[i]}:`, r.reason?.message ?? r.reason);
          }
        });

        setAppUsers(usersData || []);

        const unitsWithFloors = (unitsData || []).map((unit: Unit) => ({
          ...unit,
          floors: Array.isArray(unit.floors) ? unit.floors : []
        }));
        setAppUnits(unitsWithFloors);

        setAppCategories(categoriesData || []);
        setAppItems(itemsData || []);
        setAppUnitStocks(unitStocksData || []);
        setAppMovements(movementsData || []);

        const loansWithDates = (loansData || []).map((loan: any) => ({
          ...loan,
          withdrawalDate: loan.withdrawalDate ? new Date(loan.withdrawalDate) : new Date(),
          expectedReturnDate: loan.expectedReturnDate ? new Date(loan.expectedReturnDate) : new Date(),
          returnDate: loan.returnDate ? new Date(loan.returnDate) : undefined,
        }));
        setAppLoans(loansWithDates);

        setAppRequests(requestsData || []);
        setAppFurnitureTransfers(furnitureTransfersData || []);
        setAppFurnitureRemovalRequests(furnitureRemovalRequestsData || []);
        setAppFurnitureRequestsToDesigner(furnitureRequestsToDesignerData || []);
        setAppDeliveryBatches(deliveryBatchesData || []);
        setAppDeliveryConfirmations(deliveryConfirmationsData || []);

        if (generation !== initGenerationRef.current) return;

        const usersResult = results[0];

        const applyRestoredUser = (userToRestore: User) => {
          console.log('✅ Sessão restaurada:', userToRestore.name);
          setCurrentUser(userToRestore);

          if (!['admin', 'driver'].includes(userToRestore.role)) {
            if (!userToRestore.dailyCode || isDailyCodeExpired(userToRestore.dailyCodeGeneratedAt)) {
              const newCode = generateRandomDailyCode();
              const now = new Date();
              userToRestore.dailyCode = newCode;
              userToRestore.dailyCodeGeneratedAt = now;
              setAppUsers(prev => prev.map(u =>
                u.id === userToRestore.id ? { ...u, dailyCode: newCode, dailyCodeGeneratedAt: now } : u
              ));
              api.users.update(userToRestore.id, {
                dailyCode: newCode,
                dailyCodeGeneratedAt: now.toISOString(),
              }).catch(err => console.error('Erro ao salvar código diário:', err));
            }
          }

          if (userToRestore.role !== 'designer' && userToRestore.role !== 'developer' && userToRestore.primaryUnitId && unitsData?.length) {
            const primaryUnit = unitsData.find((u: Unit) => u.id === userToRestore.primaryUnitId);
            if (primaryUnit) {
              setCurrentUnitState(primaryUnit);
            }
          }
        };

        // 3. Restaurar usuário: prioriza lista da API; se falhou ou veio vazia, usa cache do localStorage
        if (validatedUserId) {
          const userFromApi =
            usersResult.status === 'fulfilled' && Array.isArray(usersData)
              ? usersData.find((u: User) => u.id === validatedUserId)
              : undefined;

          if (userFromApi) {
            applyRestoredUser(userFromApi);
          } else {
            const cached = authService.getCurrentUserNormalized();
            const cacheOk = cached?.id === validatedUserId;
            const usersFailed = usersResult.status === 'rejected';
            const listEmpty = usersResult.status === 'fulfilled' && Array.isArray(usersData) && usersData.length === 0;

            if (cacheOk && (usersFailed || listEmpty)) {
              console.warn('⚠️ Usando perfil em cache (API de usuários indisponível ou lista vazia)');
              applyRestoredUser(cached);
            } else if (usersResult.status === 'fulfilled' && usersData.length > 0) {
              console.log('⚠️ Usuário não encontrado no cadastro, limpando sessão');
              authService.clearStorage();
            } else if (cacheOk) {
              applyRestoredUser(cached);
            } else {
              authService.clearStorage();
            }
          }
        }
      } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
      } finally {
        if (generation === initGenerationRef.current) {
          setIsLoading(false);
        }
      }
    };

    initApp();
  }, []);

  const login = (userId: string) => {
    const user = appUsers.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);

      if (!['admin', 'driver'].includes(user.role)) {
        if (!user.dailyCode || isDailyCodeExpired(user.dailyCodeGeneratedAt)) {
          const newCode = generateRandomDailyCode();
          const now = new Date();
          user.dailyCode = newCode;
          user.dailyCodeGeneratedAt = now;
          setAppUsers(prev => prev.map(u =>
            u.id === userId ? { ...u, dailyCode: newCode, dailyCodeGeneratedAt: now } : u
          ));
          api.users.update(userId, {
            dailyCode: newCode,
            dailyCodeGeneratedAt: now.toISOString(),
          }).catch(err => console.error('Erro ao salvar código diário:', err));
        }
      }

      if (user.role === 'designer' || user.role === 'developer' || !user.primaryUnitId) {
        setCurrentUnitState(null);
      } else {
        const primaryUnit = appUnits.find(u => u.id === user.primaryUnitId);
        setCurrentUnitState(primaryUnit || null);
      }
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentUnitState(null);

    authService.signOut().catch(() => {});
  };

  const setCurrentUnit = (unitId: string) => {
    const unit = appUnits.find(u => u.id === unitId);
    if (unit && currentUser) {
      // Check if user has access to this unit
      const hasAccess = 
        currentUser.role === 'admin' ||
        currentUser.role === 'designer' || // Designers podem acessar todas as unidades
        currentUser.role === 'developer' || // Developers podem acessar todas as unidades
        currentUser.primaryUnitId === unitId ||
        currentUser.additionalUnitIds?.includes(unitId);
      
      if (hasAccess) {
        setCurrentUnitState(unit);
      }
    }
  };

  const addMovement = async (movementData: Omit<SimpleMovement, 'id' | 'timestamp' | 'createdAt'>) => {
    const now = new Date();
    
    try {
      // NÃO enviar id - deixar o banco gerar o UUID
      const dataToSend = {
        type: movementData.type,
        itemId: movementData.itemId,
        unitId: movementData.unitId,
        userId: movementData.userId,
        quantity: movementData.quantity,
        timestamp: now.toISOString(),
        notes: movementData.notes,
      };
      
      // Persistir no backend e receber o movimento com ID gerado pelo banco
      const createdMovement = await api.movements.create(dataToSend);
      console.log('✅ Movimento criado:', createdMovement.id);
      
      // Adicionar ao estado com o ID real do banco
      setAppMovements(prev => [...prev, createdMovement]);

      // IMPORTANTE: Recarregar os stocks do backend pois o stock pode ter sido criado/atualizado
      const updatedStocks = await api.unitStocks.getAll();
      setAppUnitStocks(updatedStocks);
      console.log('✅ Stocks atualizados após movimentação');
      
    } catch (error) {
      console.error('❌ Erro ao criar movimento:', error);
      throw error;
    }
  };

  const addLoan = async (loan: Omit<Loan, 'id' | 'withdrawalDate'>) => {
    // Create temporary loan in frontend
    const tempId = `loan-temp-${Date.now()}`;
    const newLoan: Loan = {
      ...loan,
      id: tempId,
      withdrawalDate: new Date(),
    };
    setAppLoans(prev => [...prev, newLoan]);

    // Save to backend
    try {
      const createdLoan = await api.loans.create({
        itemId: loan.itemId,
        unitId: loan.unitId,
        responsibleUserId: loan.responsibleUserId,
        serialNumber: loan.serialNumber,
        quantity: loan.quantity,
        status: loan.status,
        observations: loan.observations,
        withdrawalDate: new Date().toISOString(),
        expectedReturnDate: loan.expectedReturnDate instanceof Date 
          ? loan.expectedReturnDate.toISOString() 
          : loan.expectedReturnDate,
      });
      
      // Convert dates from ISO strings to Date objects
      const loanWithDates = {
        ...createdLoan,
        withdrawalDate: createdLoan.withdrawalDate ? new Date(createdLoan.withdrawalDate) : new Date(),
        expectedReturnDate: createdLoan.expectedReturnDate ? new Date(createdLoan.expectedReturnDate) : new Date(),
        returnDate: createdLoan.returnDate ? new Date(createdLoan.returnDate) : undefined,
      };
      
      // Replace temp loan with real loan from backend
      setAppLoans(prev => prev.map(l => 
        l.id === tempId ? loanWithDates : l
      ));

    } catch (error) {
      console.error('❌ Erro ao criar empréstimo no backend:', error);
      // Rollback: remove temp loan
      setAppLoans(prev => prev.filter(l => l.id !== tempId));
      throw error;
    }
  };

  const updateLoan = async (loanId: string, updates: Partial<Loan>) => {
    // Update locally first (optimistic update)
    setAppLoans(prev => prev.map(loan => 
      loan.id === loanId ? { ...loan, ...updates } : loan
    ));

    // Só atualizar no backend se não for um ID temporário
    if (!loanId.startsWith('loan-temp-')) {
      try {
        const updatesToSend = {
          ...updates,
          returnDate: updates.returnDate instanceof Date 
            ? updates.returnDate.toISOString() 
            : updates.returnDate,
        };
        
        await api.loans.update(loanId, updatesToSend);
      } catch (error) {
        console.error('❌ Erro ao atualizar empréstimo no backend:', error);
        // Rollback on error
        const originalLoan = appLoans.find(l => l.id === loanId);
        if (originalLoan) {
          setAppLoans(prev => prev.map(loan => 
            loan.id === loanId ? originalLoan : loan
          ));
        }
        throw error;
      }
    }
  };

  const updateStock = async (stockId: string, quantity: number, location?: string, minimumQuantity?: number) => {
    const stock = appUnitStocks.find(s => s.id === stockId);
    if (stock) {
      const updatedStock: UnitStock = {
        ...stock,
        quantity,
        ...(location !== undefined && { location }),
        ...(minimumQuantity !== undefined && { minimumQuantity }),
      };
      
      // Só atualizar no backend se não for um ID temporário
      if (!stockId.startsWith('stock-temp-')) {
        try {
          await api.unitStocks.update(stockId, updatedStock);
          setAppUnitStocks(prev => prev.map(s =>
            s.id === stockId ? updatedStock : s
          ));
        } catch (error) {
          console.error('❌ Erro ao atualizar estoque:', error);
          throw error;
        }
      } else {
        // Se for temporário, apenas atualizar no frontend
        setAppUnitStocks(prev => prev.map(s =>
          s.id === stockId ? updatedStock : s
        ));
      }
    }
  };

  const updateStockWithLocation = (stockId: string, quantity: number, location: string) => {
    setAppUnitStocks(prev => prev.map(stock =>
      stock.id === stockId ? { ...stock, quantity, location } : stock
    ));
  };

  const addItemWithStock = async (itemData: Omit<Item, 'id'> & { createdAt?: Date; updatedAt?: Date }, unitId: string, quantity: number, location: string): Promise<string> => {
    // Gerar UUID temporário para o frontend
    const tempId = crypto.randomUUID();
    const newItem: Item = {
      ...itemData,
      id: tempId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setAppItems(prev => [...prev, newItem]);

    const warehouseId = getWarehouseUnitId();
    
    // ✅ SALVAR NO BACKEND PRIMEIRO - aguardar ID real do banco
    try {
      // 1. Salvar o item e pegar o ID real do backend
      const createdItem = await api.items.create(newItem);
      const realItemId = createdItem.id;
      
      // Atualizar o item no frontend com o ID real
      setAppItems(prev => prev.map(item => 
        item.id === tempId ? { ...item, id: realItemId } : item
      ));
      
      // 2. Criar stocks com o ID REAL do item
      let newStocks: UnitStock[] = [];
      
      if (itemData.isFurniture) {
        // Móvel: apenas 1 stock na unidade especificada
        newStocks = [{
          id: crypto.randomUUID(),
          itemId: realItemId,  // ✅ Usar ID real do backend
          unitId: unitId,
          quantity: quantity,
          minimumQuantity: itemData.defaultMinimumQuantity || 5,
          location: location,
        }];
      } else {
        // Material regular: stocks em todas as unidades
        newStocks = appUnits.map(unit => ({
          id: crypto.randomUUID(),
          itemId: realItemId,  // ✅ Usar ID real do backend
          unitId: unit.id,
          quantity: unit.id === warehouseId ? quantity : 0,
          minimumQuantity: itemData.defaultMinimumQuantity || 5,
          location: unit.id === warehouseId ? location : '',
        }));
      }
      
      // 3. Salvar todos os stocks no backend
      for (const stock of newStocks) {
        await api.unitStocks.create(stock);
      }
      
      // 4. Atualizar stocks no frontend
      setAppUnitStocks(prev => [...prev, ...newStocks]);
      
      return realItemId;
    } catch (error) {
      console.error('❌ Erro ao salvar item/stock no backend:', error);
      // Rollback: remover item temporário do frontend
      setAppItems(prev => prev.filter(item => item.id !== tempId));
      throw error;
    }
  };

  const addItem = async (itemData: Omit<Item, 'id'> & { createdAt?: Date; updatedAt?: Date }) => {
    // Create temporary item in frontend com UUID
    const tempId = crypto.randomUUID();
    const tempItem: Item = {
      ...itemData,
      id: tempId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setAppItems(prev => [...prev, tempItem]);

    // Save to backend
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/${functionSlug}/items`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: itemData.name,
          category_id: itemData.categoryId,
          description: itemData.description,
          unit_of_measure: itemData.unitOfMeasure,
          is_consumable: itemData.isConsumable,
          requires_responsibility_term: itemData.requiresResponsibilityTerm,
          default_loan_days: itemData.defaultLoanDays,
          default_minimum_quantity: itemData.defaultMinimumQuantity,
          serial_number: itemData.serialNumber,
          image_url: itemData.imageUrl,
          is_unique_product: itemData.isUniqueProduct,
          is_furniture: itemData.isFurniture,
          active: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create item in backend');
      }

      const createdItem = await response.json();
      
      // Replace temp item with real item from backend
      setAppItems(prev => prev.map(item => 
        item.id === tempId ? { 
          ...tempItem, 
          id: createdItem.id,
        } : item
      ));

    } catch (error) {
      console.error('❌ Erro ao criar item no backend:', error);
      // Rollback: remove temp item
      setAppItems(prev => prev.filter(item => item.id !== tempId));
      throw error;
    }
  };

  const updateItem = async (itemId: string, updates: Partial<Item>) => {
    // Update in frontend immediately
    setAppItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, ...updates, updatedAt: new Date() } : item
    ));

    // Save to backend
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/${functionSlug}/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: updates.name,
          category_id: updates.categoryId,
          description: updates.description,
          unit_of_measure: updates.unitOfMeasure,
          is_consumable: updates.isConsumable,
          requires_responsibility_term: updates.requiresResponsibilityTerm,
          default_loan_days: updates.defaultLoanDays,
          default_minimum_quantity: updates.defaultMinimumQuantity,
          serial_number: updates.serialNumber,
          image_url: updates.imageUrl,
          is_unique_product: updates.isUniqueProduct,
          is_furniture: updates.isFurniture,
          active: updates.active,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update item in backend');
      }

    } catch (error) {
      console.error('❌ Erro ao atualizar item no backend:', error);
      // Note: Frontend state is already updated, user can retry or refresh
    }
  };

  const addStock = async (stockData: Omit<UnitStock, 'id'>) => {
    // Create temporary stock in frontend
    const tempId = `stock-temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newStock: UnitStock = {
      ...stockData,
      id: tempId,
    };
    setAppUnitStocks(prev => [...prev, newStock]);

    // Save to backend
    try {
      const createdStock = await api.unitStocks.create(stockData);
      
      // Replace temp stock with real stock from backend
      setAppUnitStocks(prev => prev.map(s => 
        s.id === tempId ? createdStock : s
      ));

    } catch (error) {
      console.error('❌ Erro ao criar estoque no backend:', error);
      // Rollback: remove temp stock
      setAppUnitStocks(prev => prev.filter(s => s.id !== tempId));
      throw error;
    }
  };

  const getAvailableUnits = (): Unit[] => {
    if (!currentUser) return [];
    
    if (currentUser.role === 'admin') {
      return appUnits;
    }
    
    // Designers e Developers são volantes e podem ver todas as unidades operacionais (exceto almoxarifado)
    if (currentUser.role === 'designer' || currentUser.role === 'developer') {
      const warehouseId = getWarehouseUnitId();
      return appUnits.filter(u => u.id !== warehouseId);
    }
    
    // Garantir que primaryUnitId existe antes de usar
    const unitIds = [
      ...(currentUser.primaryUnitId ? [currentUser.primaryUnitId] : []),
      ...(currentUser.additionalUnitIds || [])
    ];
    return appUnits.filter(u => unitIds.includes(u.id));
  };

  const getWarehouseUnitId = (): string | undefined => {
    const warehouse = appUnits.find(u => u.name === 'Almoxarifado Central');
    return warehouse?.id;
  };

  const getStockForItem = (itemId: string, unitId: string): UnitStock | undefined => {
    return appUnitStocks.find(s => s.itemId === itemId && s.unitId === unitId);
  };

  const getItemById = (itemId: string): Item | undefined => {
    return appItems.find(i => i.id === itemId);
  };

  const getCategoryById = (categoryId: string): Category | undefined => {
    return appCategories.find(c => c.id === categoryId);
  };

  const getUnitById = (unitId: string): Unit | undefined => {
    return appUnits.find(u => u.id === unitId);
  };

  const getUserById = (userId: string): User | undefined => {
    return appUsers.find(u => u.id === userId);
  };

  const addRequest = async (requestData: Omit<Request, 'id' | 'createdAt'>) => {
    // Create temporary request in frontend
    const tempId = `req-temp-${Date.now()}`;
    const newRequest: Request = {
      ...requestData,
      id: tempId,
      createdAt: new Date(),
    };
    setAppRequests(prev => [...prev, newRequest]);

    // Save to backend
    try {
      // Don't send createdAt - Supabase will auto-generate created_at timestamp
      const createdRequest = await api.requests.create(requestData);
      
      // Replace temp request with real request from backend
      setAppRequests(prev => prev.map(r => 
        r.id === tempId ? createdRequest : r
      ));

    } catch (error) {
      console.error('❌ Erro ao criar solicitação no backend:', error);
      console.error('❌ Detalhes do erro:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        details: (error as any).details,
        requestData: requestData,
      });
      // Rollback: remove temp request
      setAppRequests(prev => prev.filter(r => r.id !== tempId));
      throw error;
    }
  };

  const updateRequest = async (requestId: string, updates: Partial<Request>) => {
    // Update in frontend immediately for optimistic UI
    setAppRequests(prev => prev.map(req =>
      req.id === requestId ? { ...req, ...updates } : req
    ));

    // Só atualizar no backend se não for um ID temporário
    if (!requestId.startsWith('req-temp-')) {
      try {
        await api.requests.update(requestId, updates);
      } catch (error) {
        console.error('❌ Erro ao atualizar request no backend:', error);
        // Note: Frontend state is already updated, user can retry or refresh
      }
    }
  };

  const addFurnitureTransfer = (transferData: Omit<FurnitureTransfer, 'id' | 'createdAt'>) => {
    const newTransfer: FurnitureTransfer = {
      ...transferData,
      id: `ft-${Date.now()}`,
      createdAt: new Date(),
    };
    setAppFurnitureTransfers(prev => [...prev, newTransfer]);
  };

  const updateFurnitureTransfer = (transferId: string, updates: Partial<FurnitureTransfer>) => {
    setAppFurnitureTransfers(prev => prev.map(transfer =>
      transfer.id === transferId ? { ...transfer, ...updates } : transfer
    ));
  };

  const addFurnitureRemovalRequest = async (requestData: Omit<FurnitureRemovalRequest, 'id' | 'createdAt'>) => {
    const newRequest: FurnitureRemovalRequest = {
      ...requestData,
      id: `frr-${Date.now()}`,
      createdAt: new Date(),
    };
    setAppFurnitureRemovalRequests(prev => [...prev, newRequest]);
    
    // Salvar no backend
    try {
      await api.furnitureRemovalRequests.create(newRequest);
    } catch (error) {
      console.error('❌ Erro ao salvar solicitação de retirada no backend:', error);
    }
  };

  const updateFurnitureRemovalRequest = async (requestId: string, updates: Partial<FurnitureRemovalRequest>) => {
    setAppFurnitureRemovalRequests(prev => prev.map(req =>
      req.id === requestId ? { ...req, ...updates } : req
    ));
    
    // Só atualizar no backend se não for um ID temporário
    if (!requestId.startsWith('frr-')) {
      try {
        await api.furnitureRemovalRequests.update(requestId, updates);
      } catch (error) {
        console.error('❌ Erro ao atualizar solicitação de retirada no backend:', error);
      }
    }
  };

  const addFurnitureRequestToDesigner = async (requestData: Omit<FurnitureRequestToDesigner, 'id' | 'createdAt'>) => {
    const newRequest: FurnitureRequestToDesigner = {
      ...requestData,
      id: `frd-${Date.now()}`,
      createdAt: new Date(),
    };
    setAppFurnitureRequestsToDesigner(prev => [...prev, newRequest]);
    
    // Salvar no backend
    try {
      await api.furnitureRequestsToDesigner.create(newRequest);
    } catch (error) {
      console.error('❌ Erro ao salvar solicitação ao designer no backend:', error);
    }
  };

  const updateFurnitureRequestToDesigner = async (requestId: string, updates: Partial<FurnitureRequestToDesigner>) => {
    setAppFurnitureRequestsToDesigner(prev => prev.map(req =>
      req.id === requestId ? { ...req, ...updates } : req
    ));
    
    // Só atualizar no backend se não for um ID temporário
    if (!requestId.startsWith('frd-')) {
      try {
        await api.furnitureRequestsToDesigner.update(requestId, updates);
      } catch (error) {
        console.error('❌ Erro ao atualizar solicitação ao designer no backend:', error);
      }
    }
  };

  const addUser = async (userData: Omit<User, 'id'> & { password?: string }) => {
    // Create temporary user in frontend
    const tempId = `user-temp-${Date.now()}`;
    const newUser: User = {
      ...userData,
      id: tempId,
    };
    setAppUsers(prev => [...prev, newUser]);

    // Save to backend using signup endpoint (creates in auth.users and public.users)
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/${functionSlug}/auth/signup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userData.email,
          password: (userData as { password?: string }).password || 'senha123', // Default password if not provided
          name: userData.name,
          role: userData.role,
          primaryUnitId: userData.primaryUnitId,
          additionalUnitIds: userData.additionalUnitIds,
          warehouseType: userData.warehouseType,
          jobTitle: userData.jobTitle,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      const createdUser = await response.json();
      
      // Replace temp user with real user from backend
      setAppUsers(prev => prev.map(u => 
        u.id === tempId ? createdUser.user : u
      ));

    } catch (error) {
      console.error('❌ Erro ao criar usuário no backend:', error);
      // Rollback: remove temp user
      setAppUsers(prev => prev.filter(u => u.id !== tempId));
      throw error;
    }
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    setAppUsers(prev => prev.map(user =>
      user.id === userId ? { ...user, ...updates } : user
    ));
  };

  const deleteUser = (userId: string) => {
    setAppUsers(prev => prev.filter(user => user.id !== userId));
    
    // Call API to delete user from backend
    fetch(`https://${projectId}.supabase.co/functions/v1/${functionSlug}/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
    }).catch(error => {
      console.error('Error deleting user from backend:', error);
    });
  };

  const addUnit = async (unitData: Omit<Unit, 'id'>) => {
    // Criar unidade temporária no frontend
    const tempId = `unit-${Date.now()}`;
    const tempUnit: Unit = {
      ...unitData,
      id: tempId,
    };
    setAppUnits(prev => [...prev, tempUnit]);
    
    // Criar estoque zerado para todos os itens na nova unidade
    const newStocks = appItems
      .filter(item => item.categoryId !== 'cat-9') // Excluir móveis
      .map(item => ({
        id: `stock-${item.id}-${tempId}`,
        itemId: item.id,
        unitId: tempId,
        quantity: 0,
        minimumQuantity: item.defaultMinimumQuantity || 5,
        location: '',
      }));
    setAppUnitStocks(prev => [...prev, ...newStocks]);
    
    // Save to backend (backend will generate UUID)
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/${functionSlug}/units`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(unitData), // Send without ID
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Supabase] Error creating unit:', errorData);
        throw new Error(errorData.error || 'Failed to create unit');
      }
      
      const savedUnit = await response.json();
      
      // Update frontend with real UUID from backend
      setAppUnits(prev => prev.map(u => u.id === tempId ? savedUnit : u));
      setAppUnitStocks(prev => prev.map(s => s.unitId === tempId ? { ...s, unitId: savedUnit.id } : s));
    } catch (error) {
      console.error('Error saving unit to backend:', error);
      // Remove from frontend if backend save failed
      setAppUnits(prev => prev.filter(u => u.id !== tempId));
      setAppUnitStocks(prev => prev.filter(s => s.unitId !== tempId));
      throw error;
    }
  };

  const updateUnit = async (unitId: string, updates: Partial<Unit>) => {
    console.log('🔄 [AppContext.updateUnit] Iniciando atualização:', unitId);
    console.log('🔄 [AppContext.updateUnit] Updates:', updates);
    console.log('🔄 [AppContext.updateUnit] Floors:', updates.floors, 'Type:', typeof updates.floors, 'isArray:', Array.isArray(updates.floors));
    
    setAppUnits(prev => prev.map(unit =>
      unit.id === unitId ? { ...unit, ...updates } : unit
    ));
    
    // Save to backend
    try {
      console.log('📤 [AppContext.updateUnit] Enviando para backend...');
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/${functionSlug}/units/${unitId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ [AppContext.updateUnit] Erro do backend:', errorData);
        throw new Error(errorData.error || 'Failed to update unit');
      }
      
      const savedUnit = await response.json();
    } catch (error) {
      console.error('❌ [AppContext.updateUnit] Erro ao atualizar no backend:', error);
      throw error;
    }
  };

  const deleteUnit = (unitId: string) => {
    // Não permitir deletar o almoxarifado
    const warehouseId = getWarehouseUnitId();
    if (unitId === warehouseId) {
      return;
    }
    setAppUnits(prev => prev.filter(unit => unit.id !== unitId));
    // Remover todos os estoques da unidade
    setAppUnitStocks(prev => prev.filter(stock => stock.unitId !== unitId));
  };

  // Criar lote de entrega
  const createDeliveryBatch = (
    requestIds: string[], 
    furnitureRequestIds: string[], 
    targetUnitId: string, 
    driverUserId: string
  ): string => {
    const qrCode = `DEL-${Date.now().toString().slice(-6)}`;
    const furnitureOnly =
      furnitureRequestIds.length > 0 && requestIds.length === 0;
    const now = new Date();

    const newBatch: DeliveryBatch = {
      id: `batch-${Date.now()}`,
      requestIds,
      furnitureRequestIds: furnitureRequestIds.length > 0 ? furnitureRequestIds : undefined,
      targetUnitId,
      driverUserId,
      qrCode,
      status: furnitureOnly ? 'in_transit' : 'pending',
      createdAt: now,
      ...(furnitureOnly ? { dispatchedAt: now } : {}),
    };

    // Persistir no backend
    api.deliveryBatches.create(newBatch).catch(error => {
      console.error('❌ Erro ao criar lote no backend:', error);
    });

    setAppDeliveryBatches(prev => [...prev, newBatch]);

    // Atualizar status das solicitações para 'processing' (fazem parte de um lote, mas ainda não separadas)
    requestIds.forEach(reqId => {
      updateRequest(reqId, { 
        status: 'processing',
      });
    });

    furnitureRequestIds.forEach(reqId => {
      updateFurnitureRequestToDesigner(reqId, {
        status: furnitureOnly ? 'in_transit' : 'awaiting_delivery',
        deliveredByUserId: driverUserId,
      });
    });

    console.log('✅ Lote criado:', newBatch.id, 'QR:', qrCode);
    return newBatch.id;
  };

  // Confirmar entrega (motorista)
  const confirmDelivery = async (
    batchId: string, 
    confirmationData: Omit<DeliveryConfirmation, 'id' | 'batchId' | 'timestamp'>,
    receiverDailyCode: string
  ) => {
    const newConfirmation: DeliveryConfirmation = {
      ...confirmationData,
      id: `conf-${Date.now()}`,
      batchId,
      timestamp: new Date(),
    };

    try {
      // Persistir confirmação no backend
      await api.deliveryConfirmations.create(newConfirmation);
      
      setAppDeliveryConfirmations(prev => [...prev, newConfirmation]);

      // Buscar o lote completo para enviar todos os dados ao backend
      const batch = appDeliveryBatches.find(b => b.id === batchId);
      if (!batch) {
        throw new Error(`Lote ${batchId} não encontrado`);
      }

      // Atualizar status do lote no backend com dados completos
      await api.deliveryBatches.update(batchId, {
        status: 'delivery_confirmed',
        deliveryConfirmedAt: new Date().toISOString(),
        // Dados completos para criar se não existir
        requestIds: batch.requestIds,
        furnitureRequestIds: batch.furnitureRequestIds,
        targetUnitId: batch.targetUnitId,
        driverUserId: batch.driverUserId,
        qrCode: batch.qrCode,
        createdAt: typeof batch.createdAt === 'string' ? batch.createdAt : batch.createdAt.toISOString(),
        dispatchedAt: batch.dispatchedAt ? (typeof batch.dispatchedAt === 'string' ? batch.dispatchedAt : batch.dispatchedAt.toISOString()) : undefined,
      });

      // Atualizar status do lote localmente
      setAppDeliveryBatches(prev => prev.map(b =>
        b.id === batchId 
          ? { 
              ...b, 
              status: 'delivery_confirmed',
              deliveryConfirmedAt: new Date()
            }
          : b
      ));

      // Atualizar status das solicitações
      batch.requestIds.forEach(reqId => {
        updateRequest(reqId, { 
          status: 'delivery_confirmed'
        });
      });
      
      console.log('✅ Entrega confirmada com QR Code:', batchId);
    } catch (error) {
      console.error('❌ Erro ao confirmar entrega:', error);
      throw error;
    }
  };

  // Confirmar recebimento (recebedor)
  const confirmReceipt = async (
    batchId: string, 
    confirmationData: Omit<DeliveryConfirmation, 'id' | 'batchId' | 'timestamp'>
  ) => {
    console.log('🔍 confirmReceipt chamado:', { batchId, confirmationData });
    
    const confirmedBy = confirmationData.confirmedByUserId ?? (confirmationData as { userId?: string }).userId ?? '';
    const newConfirmation: DeliveryConfirmation = {
      ...confirmationData,
      confirmedByUserId: confirmedBy,
      type: confirmationData.type ?? 'receipt',
      photoUrl: confirmationData.photoUrl ?? '',
      id: `conf-${Date.now()}`,
      batchId,
      timestamp: new Date(),
    };

    console.log('📦 Nova confirmação criada:', newConfirmation);

    // Atualizar estado local primeiro (otimistic update)
    setAppDeliveryConfirmations(prev => [...prev, newConfirmation]);

    // Atualizar status do lote
    setAppDeliveryBatches(prev => prev.map(batch =>
      batch.id === batchId 
        ? { 
            ...batch, 
            status: 'completed',
            receivedConfirmedAt: new Date(),
            completedAt: new Date()
          }
        : batch
    ));

    // Atualizar status das solicitações para 'completed'
    const batch = appDeliveryBatches.find(b => b.id === batchId);
    if (batch) {
      batch.requestIds.forEach(reqId => {
        updateRequest(reqId, { 
          status: 'completed',
          completedByUserId: confirmedBy,
          completedAt: new Date()
        });
      });

      // Atualizar móveis se houver
      batch.furnitureRequestIds?.forEach(reqId => {
        updateFurnitureRequestToDesigner(reqId, { 
          status: 'completed',
          completedAt: new Date()
        });
      });
    }

    // Salvar no backend
    try {
      console.log('🚀 Enviando confirmação para o backend...');
      
      // Converter Date para ISO string para enviar ao backend
      const confirmationForBackend = {
        ...newConfirmation,
        timestamp: newConfirmation.timestamp.toISOString(),
      };
      
      await api.deliveryConfirmations.create(confirmationForBackend);
      
      console.log('🚀 Atualizando status do lote no backend...');
      // Atualizar batch no backend
      await api.deliveryBatches.update(batchId, {
        status: 'completed',
        receivedConfirmedAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Erro ao salvar confirmação no backend:', error);
      // Rollback em caso de erro
      setAppDeliveryConfirmations(prev => prev.filter(c => c.id !== newConfirmation.id));
      setAppDeliveryBatches(prev => prev.map(b =>
        b.id === batchId ? { ...b, status: 'pending_confirmation' } : b
      ));
      throw error;
    }
  };

  // Confirmar entrega individual de móvel (motorista)
  const confirmFurnitureDelivery = async (
    furnitureRequestId: string,
    confirmationData: Omit<DeliveryConfirmation, 'id' | 'furnitureRequestId' | 'timestamp'>,
    receiverDailyCode: string
  ) => {
    try {
      // Validar código diário do recebedor
      const receiver = getUserByDailyCode(receiverDailyCode);
      if (!receiver) {
        throw new Error('Código diário inválido');
      }

      // Criar confirmação de entrega
      const newConfirmation: DeliveryConfirmation = {
        ...confirmationData,
        id: `conf-${Date.now()}`,
        furnitureRequestId,
        receivedByUserId: receiver.id,
        timestamp: new Date(),
      };

      // Persistir confirmação no backend
      const confirmationForBackend = {
        ...newConfirmation,
        timestamp: newConfirmation.timestamp.toISOString(),
      };
      await api.deliveryConfirmations.create(confirmationForBackend);
      
      // Atualizar estado local
      setAppDeliveryConfirmations(prev => [...prev, newConfirmation]);

      // Atualizar status da solicitação de móvel
      await updateFurnitureRequestToDesigner(furnitureRequestId, {
        status: 'completed',
        deliveredByUserId: confirmationData.confirmedByUserId,
        deliveredAt: new Date(),
        completedAt: new Date(),
      });

      console.log('✅ Entrega de móvel confirmada:', furnitureRequestId, 'Recebedor:', receiver.name);
    } catch (error) {
      console.error('❌ Erro ao confirmar entrega de móvel:', error);
      throw error;
    }
  };

  const getDeliveryBatchById = (batchId: string) => {
    return appDeliveryBatches.find(b => b.id === batchId);
  };

  const getConfirmationsForBatch = (batchId: string) => {
    return appDeliveryConfirmations.filter(c => c.batchId === batchId);
  };

  const separateItemInBatch = async (requestId: string, batchId: string) => {
    console.log('🔍 separateItemInBatch chamado:', { requestId, batchId });
    
    if (!currentUser) {
      console.log('❌ currentUser não existe!');
      return;
    }
    
    console.log('✅ currentUser:', currentUser.name, currentUser.id);
    
    // Buscar o pedido para pegar informações do item
    const request = appRequests.find(r => r.id === requestId);
    if (!request) {
      console.log('❌ Request não encontrado:', requestId);
      return;
    }
    
    console.log('✅ Request encontrado:', request);
    
    // Buscar o item para verificar se é material regular
    const item = appItems.find(i => i.id === request.itemId);
    if (!item) {
      console.log('❌ Item não encontrado:', request.itemId);
      return;
    }
    
    console.log('✅ Item encontrado:', item.name, 'isFurniture:', item.isFurniture);
    
    // Criar movimentação de SAÍDA do almoxarifado (apenas para materiais regulares)
    // IMPORTANTE: Se isFurniture for undefined ou false, é material regular
    if (item.isFurniture !== true) {
      console.log('📦 É material regular, criando movimentação de saída...');
      
      const warehouseId = getWarehouseUnitId();
      if (!warehouseId) {
        console.error('❌ Almoxarifado Central não encontrado!');
        throw new Error('Almoxarifado Central não encontrado');
      }
      
      console.log('✅ Almoxarifado ID:', warehouseId);
      
      // Verificar se há estoque suficiente
      const warehouseStock = getStockForItem(request.itemId, warehouseId);
      const availableQuantity = warehouseStock?.quantity || 0;
      
      console.log(`📦 Estoque disponível: ${availableQuantity}, Quantidade solicitada: ${request.quantity}`);
      
      if (availableQuantity < request.quantity) {
        console.error(`❌ ESTOQUE INSUFICIENTE! Disponível: ${availableQuantity}, Necessário: ${request.quantity}`);
        throw new Error(`Estoque insuficiente no almoxarifado. Disponível: ${availableQuantity}, Necessário: ${request.quantity}`);
      }
      
      try {
        const destinoNome =
          appUnits.find((u) => u.id === request.requestingUnitId)?.name ?? request.requestingUnitId;
        console.log('📤 Criando movimentação de SAÍDA...');
        await addMovement({
          type: 'consumption',
          itemId: request.itemId,
          unitId: warehouseId, // Almoxarifado Central (ID dinâmico)
          userId: currentUser.id,
          quantity: request.quantity,
          notes: `Separação do lote para entrega - Destino: ${destinoNome}`,
        });
        console.log('✅ Movimentação de saída criada:', request.itemId, request.quantity, 'do almoxarifado', warehouseId);
      } catch (error) {
        console.error('❌ Erro ao criar movimentação de saída:', error);
        throw error;
      }
    } else {
      console.log('🪑 É móvel (isFurniture=true), pulando criação de movimentação');
    }
    
    // Marcar o item como separado (awaiting_pickup)
    await updateRequest(requestId, {
      status: 'awaiting_pickup',
      pickupReadyByUserId: currentUser.id,
      pickupReadyAt: new Date(),
    });

    // Verificar se todos os itens do lote foram separados
    const batch = appDeliveryBatches.find(b => b.id === batchId);
    if (!batch) return;

    const materialIds = batch.requestIds ?? [];
    const statusByRequestId = new Map(
      appRequests.map((r) => [r.id, r.status]),
    );
    statusByRequestId.set(requestId, 'awaiting_pickup');
    const allMaterialSeparated =
      materialIds.length === 0 ||
      materialIds.every(
        (reqId) => statusByRequestId.get(reqId) === 'awaiting_pickup',
      );

    // Se todos os materiais foram separados, liberar o lote para o motorista
    if (allMaterialSeparated) {
      // Persistir mudança de status no backend
      api.deliveryBatches.update(batchId, {
        status: 'in_transit',
        dispatchedAt: new Date().toISOString(),
        // Dados completos para criar se não existir
        requestIds: batch.requestIds,
        furnitureRequestIds: batch.furnitureRequestIds,
        targetUnitId: batch.targetUnitId,
        driverUserId: batch.driverUserId,
        qrCode: batch.qrCode,
        createdAt: typeof batch.createdAt === 'string' ? batch.createdAt : batch.createdAt.toISOString(),
      }).catch(error => {
        console.error('❌ Erro ao atualizar status do lote para in_transit:', error);
      });

      setAppDeliveryBatches(prev => prev.map(b =>
        b.id === batchId 
          ? { 
              ...b, 
              status: 'in_transit',
              dispatchedAt: new Date()
            }
          : b
      ));

      // Atualizar todos os requests para out_for_delivery
      batch.requestIds.forEach(reqId => {
        updateRequest(reqId, { 
          status: 'out_for_delivery',
          pickedUpByUserId: batch.driverUserId,
          pickedUpAt: new Date()
        });
      });

      if (batch.furnitureRequestIds?.length) {
        await Promise.all(
          batch.furnitureRequestIds.map((reqId) =>
            updateFurnitureRequestToDesigner(reqId, {
              status: 'in_transit',
              deliveredByUserId: batch.driverUserId,
            }),
          ),
        );
      }

      console.log('✅ Lote liberado para motorista:', batchId);
    }
  };

  const ensureUserDailyCode = async (userId: string): Promise<string> => {
    const user = appUsers.find(u => u.id === userId);
    if (!user) return '';

    if (user.dailyCode && !isDailyCodeExpired(user.dailyCodeGeneratedAt)) {
      return user.dailyCode;
    }

    const newCode = generateRandomDailyCode();
    const now = new Date();

    setAppUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, dailyCode: newCode, dailyCodeGeneratedAt: now } : u
    ));

    try {
      await api.users.update(userId, {
        dailyCode: newCode,
        dailyCodeGeneratedAt: now.toISOString(),
      });
    } catch (error) {
      console.error('Erro ao salvar código diário no backend:', error);
    }

    return newCode;
  };

  const getUserDailyCode = (userId: string): string => {
    const user = appUsers.find(u => u.id === userId);
    if (!user) return '';

    if (user.dailyCode && !isDailyCodeExpired(user.dailyCodeGeneratedAt)) {
      return user.dailyCode;
    }

    ensureUserDailyCode(userId);
    return user.dailyCode || '';
  };

  const getUserByDailyCode = (code: string): User | undefined => {
    return appUsers.find(user =>
      user.dailyCode === code && !isDailyCodeExpired(user.dailyCodeGeneratedAt)
    );
  };

  const validateUserDailyCode = (userId: string, code: string): boolean => {
    const user = appUsers.find(u => u.id === userId);
    if (!user) return false;
    return user.dailyCode === code && !isDailyCodeExpired(user.dailyCodeGeneratedAt);
  };

  const markDeliveryAsPendingConfirmation = async (batchId: string, notes?: string) => {
    try {
      // Buscar o lote completo para enviar todos os dados ao backend
      const batch = appDeliveryBatches.find(b => b.id === batchId);
      if (!batch) {
        throw new Error(`Lote ${batchId} não encontrado`);
      }

      // Persistir no backend com TODOS os dados do lote (para auto-criação se necessário)
      await api.deliveryBatches.update(batchId, { 
        status: 'pending_confirmation',
        notes,
        // Dados completos para criar se não existir
        requestIds: batch.requestIds,
        furnitureRequestIds: batch.furnitureRequestIds,
        targetUnitId: batch.targetUnitId,
        driverUserId: batch.driverUserId,
        qrCode: batch.qrCode,
        createdAt: typeof batch.createdAt === 'string' ? batch.createdAt : batch.createdAt.toISOString(),
        dispatchedAt: batch.dispatchedAt ? (typeof batch.dispatchedAt === 'string' ? batch.dispatchedAt : batch.dispatchedAt.toISOString()) : undefined,
      });
      
      // Atualizar estado local
      setAppDeliveryBatches(prev => prev.map(b =>
        b.id === batchId 
          ? { 
              ...b, 
              status: 'pending_confirmation',
              notes
            }
          : b
      ));
      
      console.log('✅ Lote marcado como pendente de confirmação:', batchId);
    } catch (error) {
      console.error('❌ Erro ao marcar lote como pendente:', error);
      throw error;
    }
  };

  const confirmDeliveryByRequester = async (
    batchId: string, 
    confirmationData: { userId: string; userName: string; notes?: string; dailyCode: string }
  ) => {
    const newConfirmation: DeliveryConfirmation = {
      id: `conf-${Date.now()}`,
      batchId,
      type: 'requester',
      confirmedByUserId: confirmationData.userId,
      photoUrl: '',
      timestamp: new Date(),
      notes: confirmationData.notes,
      dailyCode: confirmationData.dailyCode,
    };

    try {
      // Persistir confirmação no backend
      await api.deliveryConfirmations.create(newConfirmation);
      
      // Atualizar estado local
      setAppDeliveryConfirmations(prev => [...prev, newConfirmation]);

      // Buscar o lote completo para enviar todos os dados ao backend
      const batch = appDeliveryBatches.find(b => b.id === batchId);
      if (!batch) {
        throw new Error(`Lote ${batchId} não encontrado`);
      }

      // Persistir mudança de status do lote no backend com dados completos
      await api.deliveryBatches.update(batchId, { 
        status: 'confirmed_by_requester',
        confirmedByRequesterAt: new Date().toISOString(),
        // Dados completos para criar se não existir
        requestIds: batch.requestIds,
        furnitureRequestIds: batch.furnitureRequestIds,
        targetUnitId: batch.targetUnitId,
        driverUserId: batch.driverUserId,
        qrCode: batch.qrCode,
        createdAt: typeof batch.createdAt === 'string' ? batch.createdAt : batch.createdAt.toISOString(),
        dispatchedAt: batch.dispatchedAt ? (typeof batch.dispatchedAt === 'string' ? batch.dispatchedAt : batch.dispatchedAt.toISOString()) : undefined,
        deliveryConfirmedAt: batch.deliveryConfirmedAt ? (typeof batch.deliveryConfirmedAt === 'string' ? batch.deliveryConfirmedAt : batch.deliveryConfirmedAt.toISOString()) : undefined,
      });

      // Atualizar status do lote no estado local
      setAppDeliveryBatches(prev => prev.map(b =>
        b.id === batchId 
          ? { 
              ...b, 
              status: 'confirmed_by_requester',
              confirmedByRequesterAt: new Date()
            }
          : b
      ));

      // Atualizar status das solicitações para 'completed' e criar movimentações de saída do almoxarifado
      if (batch) {
        console.log('📦 Processando', batch.requestIds.length, 'pedidos do lote...');
        
        // Processar cada pedido
        for (const reqId of batch.requestIds) {
          const request = appRequests.find(r => r.id === reqId);
          if (request) {
            console.log('🔍 Processando pedido:', reqId, 'Item:', request.itemId, 'Qty:', request.quantity);
            
            // Buscar o item para verificar se é material regular
            const item = appItems.find(i => i.id === request.itemId);
            
            // Criar movimentação de SAÍDA do almoxarifado (apenas para materiais regulares)
            // IMPORTANTE: As unidades NÃO controlam estoque, apenas o almoxarifado
            if (item && item.isFurniture === false) {
              const warehouseId = getWarehouseUnitId();
              if (warehouseId) {
                console.log('📤 Criando movimentação de SAÍDA do almoxarifado...');
                console.log('   ├─ Item:', request.itemId);
                console.log('   ├─ Quantidade:', request.quantity);
                console.log('   ├─ Almoxarifado ID:', warehouseId);
                console.log('   └─ Lote:', batch.qrCode);
                
                // Verificar se já existe uma movimentação de saída para este pedido/lote
                const existingOutMovement = appMovements.find(m => 
                  m.type === 'out' && 
                  m.itemId === request.itemId && 
                  m.unitId === warehouseId &&
                  m.notes?.includes(batch.qrCode)
                );

                // Se não existe, criar a movimentação de saída
                if (!existingOutMovement) {
                  try {
                    const destinoNome =
                      appUnits.find((u) => u.id === request.requestingUnitId)?.name ??
                      request.requestingUnitId;
                    await addMovement({
                      type: 'out',
                      itemId: request.itemId,
                      unitId: warehouseId,
                      userId: confirmationData.userId,
                      quantity: request.quantity,
                      notes: `Baixa do lote ${batch.qrCode} - Entrega confirmada para ${destinoNome}`,
                    });
                    console.log('✅ Movimentação de SAÍDA criada do almoxarifado');
                  } catch (error) {
                    console.error('❌ Erro ao criar movimentação de saída do almoxarifado:', error);
                    throw error;
                  }
                } else {
                  console.log('⚠️ Movimentação de saída já existe para este item/lote');
                }
              } else {
                console.error('❌ Almoxarifado não encontrado!');
              }
            } else if (item?.isFurniture === true) {
              console.log('🪑 Item é móvel, não cria movimentação de estoque');
            }
            
            // Atualizar status do pedido
            updateRequest(reqId, { 
              status: 'completed',
              completedByUserId: confirmationData.userId,
              completedAt: new Date()
            });
            console.log('✅ Pedido marcado como completed:', reqId);
          }
        }

        // Atualizar móveis se houver
        batch.furnitureRequestIds?.forEach(reqId => {
          updateFurnitureRequestToDesigner(reqId, { 
            status: 'completed',
            completedAt: new Date()
          });
        });
      }
      
      console.log('✅ Confirmação do solicitante registrada:', batchId);
      console.log('📊 RESUMO DA CONFIRMAÇÃO:');
      console.log('   ├─ Lote ID:', batchId);
      console.log('   ├─ Lote QR:', batch?.qrCode);
      console.log('   ├─ Total de pedidos:', batch?.requestIds.length);
      console.log('   ├─ Movimentações criadas: SAÍDA do almoxarifado + ENTRADA na unidade');
      console.log('   └─ Status: confirmed_by_requester');
    } catch (error) {
      console.error('❌ Erro ao confirmar entrega pelo solicitante:', error);
      throw error;
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        currentUnit,
        users: appUsers,
        units: appUnits,
        items: appItems,
        categories: appCategories,
        unitStocks: appUnitStocks,
        movements: appMovements,
        loans: appLoans,
        requests: appRequests,
        furnitureTransfers: appFurnitureTransfers,
        furnitureRemovalRequests: appFurnitureRemovalRequests,
        furnitureRequestsToDesigner: appFurnitureRequestsToDesigner,
        deliveryBatches: appDeliveryBatches,
        deliveryConfirmations: appDeliveryConfirmations,
        isLoading,
        login,
        logout,
        setCurrentUnit,
        addMovement,
        addLoan,
        updateLoan,
        updateStock,
        updateStockWithLocation,
        addItemWithStock,
        addItem,
        updateItem,
        addStock,
        addRequest,
        updateRequest,
        addFurnitureTransfer,
        updateFurnitureTransfer,
        addFurnitureRemovalRequest,
        updateFurnitureRemovalRequest,
        addFurnitureRequestToDesigner,
        updateFurnitureRequestToDesigner,
        addUser,
        updateUser,
        deleteUser,
        addUnit,
        updateUnit,
        deleteUnit,
        getAvailableUnits,
        getWarehouseUnitId,
        getStockForItem,
        getItemById,
        getCategoryById,
        getUnitById,
        getUserById,
        createDeliveryBatch,
        confirmDelivery,
        confirmReceipt,
        getDeliveryBatchById,
        getConfirmationsForBatch,
        separateItemInBatch,
        getUserDailyCode,
        getUserByDailyCode,
        validateUserDailyCode,
        confirmFurnitureDelivery,
        markDeliveryAsPendingConfirmation,
        confirmDeliveryByRequester,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}