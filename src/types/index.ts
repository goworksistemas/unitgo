/**
 * GOWORK - Type Definitions
 * 
 * Sistema de tipos TypeScript para toda a aplicação
 */

/**
 * Perfis de usuário:
 * - controller: Controlador com acesso total (Almoxarifado + Admin)
 * - admin: Administrador (gerencia usuários e unidades + gestor de compras 1ª camada)
 * - warehouse: Almoxarife (separa e entrega pedidos)
 * - designer: Designer (aprova/rejeita pedidos de móveis)
 * - developer: Developer (gerencia catálogo de itens e categorias)
 * - requester: Solicitante (faz pedidos de materiais)
 * - buyer: Comprador (cotações, pedidos, fornecedores)
 * - financial: Financeiro (contratos, centros de custo, relatórios)
 * - purchases_admin: Administrador do módulo de compras (requisições, cotações, pedidos, aprovações e parametrização de alçadas)
 */
export type UserRole = 'controller' | 'admin' | 'warehouse' | 'designer' | 'developer' | 'requester' | 'executor' | 'driver' | 'buyer' | 'financial' | 'purchases_admin';

export type MovementType = 'entrada' | 'saida' | 'emprestimo' | 'devolucao' | 'ajuste';

/**
 * Tipos de movimento de estoque:
 * - entry: Entrada (aumenta estoque)
 * - consumption: Consumo/Saída (diminui estoque)
 * - loan: Empréstimo (diminui estoque)
 * - return: Devolução (aumenta estoque)
 */
export type SimpleMovementType = 'entry' | 'consumption' | 'loan' | 'return' | 'adjustment' | 'devolucao' | 'in' | 'out';

/**
 * Fluxo de status de pedidos:
 * pending → approved → awaiting_pickup → out_for_delivery → completed
 *        ↓
 *     rejected
 */
export type RequestStatus = 'pending' | 'approved' | 'processing' | 'awaiting_pickup' | 'out_for_delivery' | 'delivery_confirmed' | 'received_confirmed' | 'completed' | 'rejected' | 'cancelled';

export interface Unit {
  id: string;
  name: string;
  address: string;
  status: 'active' | 'inactive';
  type?: string; // Tipo da unidade (ex: warehouse, office)
  floors?: string[]; // Andares disponíveis na unidade (JSONB)
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Item {
  id: string;
  productId?: number; // ID numérico do produto (ex: Cadeado = 1, Cabo HDMI = 2)
  name: string;
  categoryId: string;
  description: string;
  unitOfMeasure: string;
  isConsumable: boolean;
  requiresResponsibilityTerm: boolean;
  defaultLoanDays: number;
  active: boolean;
  serialNumber?: string;
  imageUrl?: string;
  defaultMinimumQuantity?: number;
  brand?: string;
  model?: string;
  isFurniture?: boolean; // Móveis de unidade (não passam pelo almoxarifado)
  isUniqueProduct?: boolean; // Produto com serial único
  minQuantity?: number; // Alias para defaultMinimumQuantity
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UnitStock {
  id: string;
  itemId: string;
  unitId: string;
  quantity: number;
  minimumQuantity: number;
  location: string;
}

export interface Movement {
  id: string;
  type: MovementType;
  itemId: string;
  unitId: string;
  quantity: number;
  executorUserId: string;
  approverUserId?: string;
  timestamp: Date;
  reason: string;
  observations?: string;
  documentNumber?: string;
  serviceOrder?: string; // Ordem de serviço para consumos de executores
}

// Simplified movement tracking for modern UI
export interface SimpleMovement {
  id: string;
  type: SimpleMovementType;
  itemId: string;
  unitId: string;
  userId: string; // User who performed the action
  quantity: number;
  timestamp: Date;
  createdAt: Date; // For compatibility
  movementDate?: Date; // Alias/legacy
  reason?: string; // Legacy/consumption reason
  workOrder?: string; // For consumptions
  borrowerUnitId?: string; // For loans
  notes?: string;
}

export interface Loan {
  id: string;
  itemId: string;
  unitId: string;
  responsibleUserId: string;
  withdrawalDate: Date;
  expectedReturnDate: Date;
  returnDate?: Date;
  status: 'active' | 'overdue' | 'returned' | 'lost';
  observations?: string;
  serialNumber?: string;
  quantity?: number;
}

export interface AccessGroupMember {
  userId: string;
  userName?: string;
  createdAt?: string;
}

export interface AccessGroup {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  tabs: string[];
  members: AccessGroupMember[];
  createdAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  primaryUnitId?: string;
  additionalUnitIds?: string[];
  /** Setor/departamento (FK departments) — preenchido no cadastro/edição pelo desenvolvedor */
  departmentId?: string | null;
  warehouseType?: 'storage' | 'delivery';
  jobTitle?: string;
  adminType?: 'units' | 'warehouse';
  dailyCode?: string;
  dailyCodeGeneratedAt?: Date;
  requirePasswordChange?: boolean;
  firstLogin?: boolean;
  resetToken?: string;
  resetTokenExpiry?: string;
}

export interface Request {
  id: string;
  itemId: string;
  requestingUnitId: string;
  requestedByUserId: string;
  quantity: number;
  status: RequestStatus;
  createdAt: Date;
  approvedByUserId?: string;
  approvedAt?: Date;
  pickupReadyByUserId?: string;
  pickupReadyAt?: Date;
  pickedUpByUserId?: string;
  pickedUpAt?: Date;
  completedByUserId?: string;
  completedAt?: Date;
  rejectedReason?: string;
  rejectionReason?: string; // Alias
  deliveredAt?: Date; // Quando foi entregue
  observations?: string;
  urgency: 'low' | 'medium' | 'high';
}

export interface FurnitureTransfer {
  id: string;
  itemId: string;
  fromUnitId: string;
  toUnitId: string;
  requestedByUserId: string;
  approvedByUserId?: string;
  quantity?: number;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  createdAt: Date;
  approvedAt?: Date;
  completedAt?: Date;
  observations?: string;
}

export interface FurnitureRemovalRequest {
  id: string;
  itemId: string;
  unitId: string;
  requestedByUserId: string;
  quantity: number;
  reason: string;
  status: 'pending' | 'approved_storage' | 'approved_disposal' | 'awaiting_pickup' | 'in_transit' | 'completed' | 'rejected';
  createdAt: Date;
  reviewedByUserId?: string;
  reviewedAt?: Date;
  pickedUpByUserId?: string;
  pickedUpAt?: Date;
  receivedByUserId?: string;
  receivedAt?: Date;
  completedAt?: Date;
  observations?: string;
  disposalJustification?: string; // Justificativa do designer para descarte
}

// Solicitação de móveis do controlador para o designer
export interface FurnitureRequestToDesigner {
  id: string;
  itemId: string; // ID do item de móvel solicitado
  requestingUnitId: string; // Unidade que está solicitando
  requestedByUserId: string; // Controlador que fez a solicitação
  quantity: number;
  location: string; // Onde será colocado na unidade
  justification: string; // Por que precisa do móvel
  status: 'pending_designer' | 'approved_designer' | 'approved_storage' | 'separated' | 'awaiting_delivery' | 'in_transit' | 'pending_confirmation' | 'completed' | 'rejected';
  qrCode?: string; // Código único para confirmação (gerado quando status vira in_transit)
  createdAt: Date;
  reviewedByDesignerId?: string; // Designer que aprovou/rejeitou
  reviewedAt?: Date;
  approvedByStorageUserId?: string; // Almoxarifado storage que aprovou
  approvedByStorageAt?: Date;
  separatedByUserId?: string; // Quem separou o item
  separatedAt?: Date;
  assignedToWarehouseUserId?: string; // Almoxarifado/motorista responsável
  assignedAt?: Date;
  deliveredByUserId?: string; // Motorista que entregou
  deliveredAt?: Date;
  receivedByUserId?: string; // Quem recebeu no destino
  completedAt?: Date;
  rejectionReason?: string;
  observations?: string;
}

// Lote de entregas (múltiplos itens entregues juntos)
export interface DeliveryBatch {
  id: string;
  requestIds: string[]; // IDs das solicitações agrupadas
  furnitureRequestIds?: string[]; // IDs das solicitações de móveis agrupadas
  targetUnitId: string; // Unidade de destino
  driverUserId: string; // Motorista responsável
  qrCode: string; // Código único para confirmação
  status: 'pending' | 'in_transit' | 'delivery_confirmed' | 'received_confirmed' | 'completed' | 'pending_confirmation' | 'confirmed_by_requester' | 'delivered';
  driverId?: string; // Alias para driverUserId
  createdAt: Date;
  dispatchedAt?: Date;
  deliveryConfirmedAt?: Date;
  receivedConfirmedAt?: Date;
  completedAt?: Date;
  confirmedByRequesterAt?: Date;
  notes?: string;
}

// Confirmação de entrega com foto
export interface DeliveryConfirmation {
  id: string;
  batchId?: string; // Referência ao lote (opcional se for entrega individual)
  furnitureRequestId?: string; // Referência à solicitação individual de móvel
  type: 'delivery' | 'receipt' | 'requester'; // Entrega (motorista), Recebimento (recebedor), ou Confirmação do Solicitante
  confirmedByUserId: string;
  userId?: string; // Alias para confirmedByUserId
  userName?: string; // Nome de quem confirmou
  receivedByUserId?: string; // Quem recebeu (validado por código diário)
  photoUrl?: string; // Base64 ou URL da foto (opcional para confirmação por código)
  timestamp: Date;
  confirmedAt?: Date; // Alias para timestamp
  location?: { // Geolocalização opcional
    latitude: number;
    longitude: number;
  };
  signature?: string; // Assinatura digital opcional (base64)
  notes?: string;
  dailyCode?: string; // Código diário usado na confirmação
}

// Re-export purchase types
export * from './purchases';