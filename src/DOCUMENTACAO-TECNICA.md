# 📘 Documentação Técnica Detalhada - Gowork Sistema de Estoque

## 📋 Índice

1. [Componentes por Perfil](#componentes-por-perfil)
2. [Componentes UI Base](#componentes-ui-base)
3. [Contextos e Estado Global](#contextos-e-estado-global)
4. [Utilitários e Helpers](#utilitários-e-helpers)
5. [Backend e API](#backend-e-api)
6. [Tipos e Interfaces](#tipos-e-interfaces)
7. [Fluxos de Dados](#fluxos-de-dados)
8. [Módulo Sistema de Compras](#módulo-sistema-de-compras)

---

## 🎭 Componentes por Perfil

### 👨‍💻 Developer Dashboard

#### `DeveloperDashboard.tsx`
**Propósito:** Dashboard principal do perfil Developer com acesso total ao sistema.

**Funcionalidades:**
- Renderiza sistema de abas com todas as funcionalidades
- Controla navegação entre: Usuários, Unidades, Itens, Admin Dashboard, Migrações
- Gerencia estado do modo developer (simulação de perfis)

**Props:** Nenhuma (usa contexto global)

**Abas disponíveis:**
1. **Usuários** - Gestão completa de usuários
2. **Unidades** - Gestão de unidades e andares
3. **Itens** - Catálogo de itens/móveis
4. **Admin** - Acesso ao dashboard administrativo
5. **Migrações** - Ferramentas de migração de dados

---

#### `CreateUserDialog.tsx`
**Propósito:** Modal para criar novos usuários no sistema.

**Funcionalidades:**
- Formulário de criação com campos: nome, email, senha, perfil, unidade
- Validação de campos obrigatórios
- Geração de ID único (UUID)
- Criação via API `/api/users`
- Notificação de sucesso/erro

**Props:**
- `open: boolean` - Controla visibilidade do modal
- `onOpenChange: (open: boolean) => void` - Callback ao fechar

**Campos do formulário:**
```typescript
{
  name: string;        // Nome completo
  email: string;       // Email único
  password: string;    // Senha (mínimo 6 caracteres)
  role: UserRole;      // Perfil do usuário
  unitId?: string;     // Unidade (se solicitante)
}
```

**Validações:**
- Email deve ser único
- Senha mínimo 6 caracteres
- Perfil obrigatório
- Unidade obrigatória para solicitantes

---

#### `AdminResetPasswordDialog.tsx`
**Propósito:** Permite que admins/developers resetem senha de qualquer usuário.

**Funcionalidades:**
- Seleção de usuário via dropdown
- Campo para nova senha
- Confirmação de senha
- Reset via API
- Log de auditoria

**Props:**
- `open: boolean`
- `onOpenChange: (open: boolean) => void`

**Fluxo:**
1. Admin seleciona usuário
2. Define nova senha
3. Confirma senha
4. Sistema valida e atualiza
5. Notifica sucesso

---

#### `DeveloperModeSelector.tsx`
**Propósito:** Permite developer simular login como outro usuário.

**Funcionalidades:**
- Lista todos os usuários do sistema
- Permite trocar de perfil instantaneamente
- Útil para testes e debug
- Mostra perfil atual

**Props:**
- `currentUser: User` - Usuário atual
- `onUserChange: (user: User) => void` - Callback ao trocar

**Uso:**
```typescript
<DeveloperModeSelector 
  currentUser={user} 
  onUserChange={setUser}
/>
```

---

### 👨‍💼 Admin Dashboard

#### `AdminDashboard.tsx`
**Propósito:** Dashboard principal do perfil Admin/Controlador.

**Funcionalidades:**
- Renderiza `AdminUnitsDashboard` com sistema de abas
- Acesso a: Solicitações, Transferências, Retiradas, Estoque, Analytics

**Props:** Nenhuma

**Estrutura:**
```
AdminDashboard
  └── AdminUnitsDashboard
       ├── Tab: Solicitações
       ├── Tab: Transferências  
       ├── Tab: Retiradas
       ├── Tab: Estoque de Móveis
       └── Tab: Analytics
```

---

#### `AdminUnitsDashboard.tsx`
**Propósito:** Sistema de abas com todas as funcionalidades do admin.

**Funcionalidades:**
- Gerencia navegação entre abas
- Renderiza componentes específicos por aba
- Mostra contadores de pendências

**Abas:**

**1. Solicitações de Móveis**
- Componente: `FurnitureRequestsPanel`
- Mostra: Solicitações pendentes de aprovação
- Ações: Aprovar, Rejeitar

**2. Transferências**
- Componente: `FurnitureWarehousePanel` (modo transfer)
- Mostra: Transferências pendentes
- Ações: Aprovar, Rejeitar

**3. Retiradas**
- Componente: Painel de retiradas
- Mostra: Retiradas avaliadas pelo designer
- Ações: Visualizar status

**4. Estoque de Móveis**
- Componente: `AdminWarehouseDashboard`
- Mostra: Estoque de móveis por unidade
- Ações: Editar quantidade, Transferir

**5. Analytics**
- Componente: `AdminAnalytics`
- Mostra: Log master, gráficos, relatórios
- Ações: Filtrar, Exportar CSV

---

#### `AdminWarehouseDashboard.tsx`
**Propósito:** Gestão de estoque de móveis por unidade (visão admin).

**Funcionalidades:**
- Seleção de unidade
- Exibição de estoque atual
- Edição de quantidades
- Transferências entre unidades

**Props:** Nenhuma

**Interface:**
```
┌─────────────────────────────────┐
│ Selecionar Unidade: [Dropdown]  │
├─────────────────────────────────┤
│ Móvel A      | 15 und | [Editar]│
│ Móvel B      | 8 und  | [Editar]│
│ Móvel C      | 22 und | [Editar]│
└─────────────────────────────────┘
```

---

#### `AdminAnalytics.tsx`
**Propósito:** Dashboard de analytics e relatórios completos.

**Funcionalidades:**
- **Log Master:** Histórico de todas as movimentações
- **Filtros:** Por período (7d, 30d, 90d, tudo)
- **Filtros:** Por tipo de ação
- **Busca:** Tempo real por usuário, item, unidade
- **Gráficos:** Distribuição de ações (barras)
- **KPIs:** Total, movimentações, solicitações, transferências
- **Exportação:** CSV completo

**Props:** Nenhuma

**Dados exibidos:**
```typescript
type LogEntry = {
  timestamp: Date;           // Data/hora da ação
  type: string;             // Tipo (movimento, solicitação, etc)
  action: string;           // Ação específica
  user: string;             // Quem fez
  userRole: string;         // Perfil do usuário
  item: string;             // Item/móvel
  quantity?: number;        // Quantidade
  unit?: string;            // Unidade
  fromUnit?: string;        // Origem (transferências)
  toUnit?: string;          // Destino (transferências)
  status?: string;          // Status atual
  details: string;          // Detalhes completos
}
```

**Tipos de log registrados:**
- ✅ `movement` - Entrada/saída de estoque
- ✅ `request` - Criação de solicitação
- ✅ `approval` - Aprovação de solicitação/transferência
- ✅ `rejection` - Rejeição
- ✅ `delivery` - Entrega confirmada
- ✅ `transfer` - Transferência entre unidades
- ✅ `removal` - Retirada de móvel

**Função exportCSV:**
```typescript
generateCSVReport() {
  // Gera CSV com todas as colunas
  // Inclui BOM UTF-8 para acentos
  // Download automático
}
```

---

#### `FurnitureRequestsPanel.tsx`
**Propósito:** Painel de aprovação de solicitações de móveis.

**Funcionalidades:**
- Lista solicitações com status "pending"
- Mostra: solicitante, item, quantidade, unidade, data
- Botões: Aprovar, Rejeitar
- Modal de rejeição com campo de justificativa

**Props:** Nenhuma

**Fluxo de aprovação:**
1. Admin vê solicitação pendente
2. Clica "Aprovar"
3. Sistema atualiza status para "approved"
4. Almoxarifado recebe notificação
5. Log de auditoria registrado

**Fluxo de rejeição:**
1. Admin clica "Rejeitar"
2. Modal abre com campo de motivo
3. Admin digita justificativa
4. Sistema atualiza status para "rejected"
5. Solicitante recebe feedback
6. Log de auditoria registrado

---

### 📦 Almoxarifado Dashboard

#### `WarehouseDashboard.tsx`
**Propósito:** Dashboard principal do almoxarifado.

**Funcionalidades:**
- Sistema de abas: Estoque, Solicitações, Entregas, Retiradas
- Gestão de materiais
- Processamento de solicitações aprovadas
- Criação de entregas

**Abas:**

**1. Estoque**
- Componente: `WarehouseStockPanel`
- Adicionar itens ao estoque
- Consumir itens
- Visualizar timeline de movimentações

**2. Solicitações Aprovadas**
- Componente: Painel de solicitações
- Listar solicitações com status "approved"
- Criar entrega individual ou em lote

**3. Entregas**
- Componente: Painel de entregas
- Visualizar entregas criadas
- Acompanhar status
- Gerar QR Code

**4. Retiradas**
- Componente: Painel de retiradas
- Receber móveis retirados
- Confirmar armazenagem/descarte

---

#### `WarehouseStockPanel.tsx`
**Propósito:** Gestão de estoque de materiais do almoxarifado central.

**Funcionalidades:**
- Adicionar itens ao estoque (entrada)
- Consumir itens (saída)
- Visualizar estoque atual
- Timeline de movimentações

**Props:** Nenhuma

**Componentes internos:**
- `AddStockDialog` - Modal para adicionar estoque
- `ConsumeItemDialog` - Modal para consumir/retirar
- `StockMovementsTimeline` - Histórico de movimentações

**Fluxo de entrada:**
1. Clica "Adicionar ao Estoque"
2. Seleciona item
3. Define quantidade
4. Especifica motivo (compra, devolução, etc)
5. Sistema cria movimento tipo "in"
6. Estoque atualizado

**Fluxo de saída:**
1. Clica "Consumir Item"
2. Seleciona item
3. Define quantidade
4. Especifica motivo (uso interno, descarte, etc)
5. Sistema cria movimento tipo "out"
6. Estoque atualizado

---

#### `CreateBatchDeliveryDialog.tsx`
**Propósito:** Criar entregas em lote para múltiplas solicitações.

**Funcionalidades:**
- Seleção de solicitações aprovadas
- Atribuição de motorista
- Geração de lote único
- QR Code do lote

**Props:**
- `open: boolean`
- `onOpenChange: (open: boolean) => void`

**Interface:**
```
┌──────────────────────────────────────┐
│ Criar Lote de Entrega                │
├──────────────────────────────────────┤
│ Motorista: [Dropdown]                │
├──────────────────────────────────────┤
│ Solicitações Disponíveis:            │
│ ☑ #001 - Mesa (5 und) - Paulista 302│
│ ☑ #002 - Cadeira (10) - Paulista 475│
│ ☐ #003 - Armário (2) - Paulista 302 │
├──────────────────────────────────────┤
│           [Cancelar] [Criar Lote]    │
└──────────────────────────────────────┘
```

**Resultado:**
```typescript
{
  id: string;              // ID único do lote
  driverId: string;        // Motorista atribuído
  requestIds: string[];    // IDs das solicitações
  status: 'pending';       // Status inicial
  createdAt: Date;         // Data de criação
  qrCode: string;          // QR Code único do lote
}
```

---

### 🎨 Designer Dashboard

#### `DesignerDashboard.tsx`
**Propósito:** Dashboard do designer para avaliar retiradas de móveis.

**Funcionalidades:**
- Lista retiradas pendentes de avaliação
- Visualiza detalhes do móvel e motivo
- Aprova para armazenagem ou descarte
- Rejeita retirada

**Props:** Nenhuma

**Interface:**
```
┌─────────────────────────────────────────┐
│ Retiradas Pendentes de Avaliação        │
├─────────────────────────────────────────┤
│ Mesa Executiva - 2 und                  │
│ Unidade: Paulista 302                   │
│ Motivo: Móvel danificado                │
│ Solicitante: João Silva                 │
│                                         │
│ [Armazenar] [Descartar] [Rejeitar]     │
├─────────────────────────────────────────┤
│ Cadeira Escritório - 5 und              │
│ ...                                     │
└─────────────────────────────────────────┘
```

**Ações disponíveis:**

**1. Aprovar para Armazenagem**
```typescript
approveForStorage(requestId: string) {
  // Atualiza status para "approved_storage"
  // Notifica almoxarifado
  // Móvel voltará ao estoque
}
```

**2. Aprovar para Descarte**
```typescript
approveForDisposal(requestId: string, justification: string) {
  // Requer justificativa obrigatória
  // Atualiza status para "approved_disposal"
  // Notifica almoxarifado
  // Móvel será descartado (não volta ao estoque)
}
```

**3. Rejeitar Retirada**
```typescript
rejectRemoval(requestId: string, reason: string) {
  // Móvel permanece na unidade
  // Notifica solicitante
  // Status: "rejected_designer"
}
```

---

### 🚚 Driver Dashboard

#### `DriverDashboard.tsx`
**Propósito:** Dashboard do motorista para gestão de entregas.

**Funcionalidades:**
- Lista entregas atribuídas ao motorista
- Exibe entregas individuais e lotes
- Scanner QR Code para confirmação
- Marcar entrega como pendente

**Props:** Nenhuma

**Estados de entrega:**
- 🟡 `pending` - Aguardando entrega
- 🟢 `delivered` - Entregue
- 🔴 `awaiting_confirmation` - Pendente de confirmação

**Componentes:**
- `DeliveryQRCode` - Exibe QR Code do lote
- `FurnitureQRCodeScannerDialog` - Scanner de câmera
- `DeliveryTimeline` - Timeline da entrega

**Fluxo de entrega normal:**
1. Motorista vê lista de entregas
2. Clica "Confirmar Entrega"
3. Abre câmera
4. Escaneia QR Code do recebedor
5. Sistema valida código do dia
6. Confirma entrega automaticamente
7. Status atualizado para "delivered"

**Fluxo de entrega pendente:**
1. Motorista não encontra recebedor
2. Clica "Marcar como Pendente"
3. Sistema atualiza para "awaiting_confirmation"
4. Admin recebe notificação
5. Admin confirma manualmente depois

---

#### `FurnitureQRCodeScannerDialog.tsx`
**Propósito:** Scanner de QR Code para confirmação de entrega.

**Funcionalidades:**
- Acesso à câmera do dispositivo
- Leitura de QR Code
- Validação de código do dia
- Confirmação automática

**Props:**
- `open: boolean`
- `onOpenChange: (open: boolean) => void`
- `onScanSuccess: (code: string) => void`

**Validação:**
```typescript
validateDailyCode(scannedCode: string, userId: string): boolean {
  const expectedCode = generateDailyCode(userId);
  return scannedCode === expectedCode;
}
```

**Erros possíveis:**
- ❌ QR Code inválido
- ❌ Código expirado (não é de hoje)
- ❌ Usuário não encontrado
- ❌ Câmera não disponível

---

#### `DeliveryTimeline.tsx`
**Propósito:** Timeline visual do status da entrega.

**Funcionalidades:**
- Exibe progresso da entrega
- Mostra etapas: Criada → Em Trânsito → Entregue
- Indica etapa atual
- Mostra datas de cada etapa

**Props:**
- `delivery: DeliveryBatch`

**Etapas:**
```
○ Criada (10/12 14:30)
│
○ Em Trânsito (10/12 15:00)
│
● Entregue (10/12 16:20)  ← Atual
```

---

### 📝 Requester Dashboard

#### `RequesterDashboard.tsx`
**Propósito:** Dashboard do solicitante para fazer pedidos e receber entregas.

**Funcionalidades:**
- Solicitar móveis
- Solicitar retirada de móveis
- Visualizar minhas solicitações
- Gerar QR Code para recebimento
- Confirmar recebimentos

**Abas:**

**1. Solicitar Móveis**
- Componente: `RequestItemsPanel`
- Seleciona item, quantidade, andar
- Envia solicitação

**2. Minhas Solicitações**
- Lista todas as solicitações do usuário
- Status: Pendente, Aprovada, Rejeitada, Entregue
- Detalhes e timeline

**3. Solicitar Retirada**
- Componente: `FurnitureRemovalDialog`
- Seleciona móvel a retirar
- Especifica motivo

**4. Meu QR Code**
- Componente: `DailyCodeDisplay`
- QR Code único do dia
- Usado para recebimento de entregas

---

#### `RequestItemsPanel.tsx`
**Propósito:** Painel para solicitar móveis.

**Funcionalidades:**
- Seleção de item do catálogo
- Definição de quantidade
- Seleção de andar (destino)
- Criação de solicitação

**Props:** Nenhuma

**Interface:**
```
┌─────────────────────────────────┐
│ Solicitar Móvel                 │
├─────────────────────────────────┤
│ Item: [Dropdown - Mesa, Cadeira]│
│ Quantidade: [Input numérico]    │
│ Unidade: Paulista 302 (auto)    │
│ Andar: [Dropdown - 1º, 2º, 3º] │
├─────────────────────────────────┤
│              [Solicitar]        │
└─────────────────────────────────┘
```

**Validações:**
- Item obrigatório
- Quantidade > 0
- Andar obrigatório
- Unidade automática (do usuário)

**Resultado:**
```typescript
{
  id: string;
  itemId: string;
  quantity: number;
  requestingUnitId: string;
  floorId: string;
  requestedByUserId: string;
  status: 'pending';
  createdAt: Date;
}
```

---

#### `DailyCodeDisplay.tsx`
**Propósito:** Exibe QR Code pessoal do usuário para recebimentos.

**Funcionalidades:**
- Gera QR Code único do dia
- Atualiza automaticamente à meia-noite
- Exibe código em texto
- Instruções de uso

**Props:**
- `userId: string`

**Geração do código:**
```typescript
function generateDailyCode(userId: string): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const secret = 'gowork-secret-2024';
  const hash = SHA256(`${userId}-${date}-${secret}`);
  return hash.substring(0, 16); // Código de 16 caracteres
}
```

**Interface:**
```
┌─────────────────────────────────┐
│ Meu Código para Recebimento     │
├─────────────────────────────────┤
│      [QR CODE IMAGE]            │
├─────────────────────────────────┤
│ Código: ABC123XYZ456            │
│ Válido até: 23:59 hoje          │
├─────────────────────────────────┤
│ Mostre este código ao motorista │
│ para confirmar suas entregas.   │
└─────────────────────────────────┘
```

---

#### `FurnitureRemovalDialog.tsx`
**Propósito:** Modal para solicitar retirada de móveis.

**Funcionalidades:**
- Seleção de móvel
- Quantidade a retirar
- Motivo da retirada
- Criação de solicitação

**Props:**
- `open: boolean`
- `onOpenChange: (open: boolean) => void`

**Campos:**
```typescript
{
  itemId: string;        // Móvel a retirar
  quantity: number;      // Quantidade
  unitId: string;        // Unidade (automático)
  reason: string;        // Motivo (quebrado, reforma, etc)
  requestedByUserId: string;
}
```

**Status flow:**
```
pending_designer 
  → (Designer avalia) 
  → approved_storage / approved_disposal / rejected_designer
  → (Almoxarifado recebe)
  → completed
```

---

## 🧩 Componentes UI Base

### `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardDescription`
**Arquivo:** `/components/ui/card.tsx`

**Propósito:** Componente de card reutilizável para layout.

**Uso:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Título do Card</CardTitle>
    <CardDescription>Descrição opcional</CardDescription>
  </CardHeader>
  <CardContent>
    Conteúdo do card
  </CardContent>
</Card>
```

---

### `Button`
**Arquivo:** `/components/ui/button.tsx`

**Propósito:** Botão com variantes e tamanhos.

**Variantes:**
- `default` - Azul primário (#3F76FF)
- `destructive` - Vermelho para ações perigosas
- `outline` - Borda sem preenchimento
- `secondary` - Cinza secundário
- `ghost` - Sem borda
- `link` - Estilo de link

**Tamanhos:**
- `sm` - Pequeno
- `default` - Médio
- `lg` - Grande
- `icon` - Quadrado para ícones

**Uso:**
```tsx
<Button variant="default" size="lg">
  Confirmar
</Button>
```

---

### `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`
**Arquivo:** `/components/ui/dialog.tsx`

**Propósito:** Modal/Dialog para sobreposição.

**Uso:**
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Título do Modal</DialogTitle>
    </DialogHeader>
    <p>Conteúdo do modal</p>
  </DialogContent>
</Dialog>
```

---

### `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`
**Arquivo:** `/components/ui/table.tsx`

**Propósito:** Tabela responsiva e estilizada.

**Uso:**
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Nome</TableHead>
      <TableHead>Email</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>João</TableCell>
      <TableCell>joao@example.com</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

---

### `Badge`
**Arquivo:** `/components/ui/badge.tsx`

**Propósito:** Badge para status e labels.

**Variantes:**
- `default` - Azul
- `secondary` - Cinza
- `destructive` - Vermelho
- `outline` - Borda

**Uso:**
```tsx
<Badge variant="default">Aprovado</Badge>
<Badge variant="destructive">Rejeitado</Badge>
```

---

### `Input`
**Arquivo:** `/components/ui/input.tsx`

**Propósito:** Campo de input estilizado.

**Uso:**
```tsx
<Input 
  type="text" 
  placeholder="Digite aqui..."
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

---

### `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
**Arquivo:** `/components/ui/tabs.tsx`

**Propósito:** Sistema de abas.

**Uso:**
```tsx
<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Aba 1</TabsTrigger>
    <TabsTrigger value="tab2">Aba 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">
    Conteúdo da aba 1
  </TabsContent>
  <TabsContent value="tab2">
    Conteúdo da aba 2
  </TabsContent>
</Tabs>
```

---

## 🌐 Contextos e Estado Global

### `AppContext.tsx`
**Arquivo:** `/contexts/AppContext.tsx`

**Propósito:** Gerenciamento de estado global da aplicação.

**Estado gerenciado:**
```typescript
{
  // Autenticação
  currentUser: User | null;
  isAuthenticated: boolean;
  
  // Dados principais
  users: User[];
  items: Item[];
  units: Unit[];
  floors: Floor[];
  
  // Estoque
  movements: Movement[];
  unitStocks: UnitStock[];
  furnitureStock: FurnitureStock[];
  
  // Solicitações
  requests: Request[];
  furnitureTransfers: FurnitureTransfer[];
  furnitureRemovalRequests: FurnitureRemovalRequest[];
  
  // Entregas
  deliveryBatches: DeliveryBatch[];
  deliveryConfirmations: DeliveryConfirmation[];
  
  // Loading states
  loading: boolean;
  error: string | null;
}
```

**Funções disponíveis:**
```typescript
// Autenticação
login(email: string, password: string): Promise<User>
logout(): void
updatePassword(userId: string, newPassword: string): Promise<void>

// Usuários
createUser(user: Omit<User, 'id'>): Promise<User>
updateUser(userId: string, updates: Partial<User>): Promise<void>
getUserById(userId: string): User | undefined

// Unidades
createUnit(unit: Omit<Unit, 'id'>): Promise<Unit>
updateUnit(unitId: string, updates: Partial<Unit>): Promise<void>
getUnitById(unitId: string): Unit | undefined

// Andares
createFloor(floor: Omit<Floor, 'id'>): Promise<Floor>
updateFloor(floorId: string, updates: Partial<Floor>): Promise<void>
deleteFloor(floorId: string): Promise<void>

// Itens
createItem(item: Omit<Item, 'id'>): Promise<Item>
updateItem(itemId: string, updates: Partial<Item>): Promise<void>
getItemById(itemId: string): Item | undefined

// Movimentações
createMovement(movement: Omit<Movement, 'id'>): Promise<Movement>
getMovementsByUnit(unitId: string): Movement[]

// Solicitações
createRequest(request: Omit<Request, 'id'>): Promise<Request>
approveRequest(requestId: string, approverId: string): Promise<void>
rejectRequest(requestId: string, approverId: string, reason: string): Promise<void>

// Transferências
createFurnitureTransfer(transfer: Omit<FurnitureTransfer, 'id'>): Promise<FurnitureTransfer>
approveFurnitureTransfer(transferId: string, approverId: string): Promise<void>

// Retiradas
createFurnitureRemoval(removal: Omit<FurnitureRemovalRequest, 'id'>): Promise<FurnitureRemovalRequest>
reviewFurnitureRemoval(removalId: string, reviewerId: string, decision: 'storage' | 'disposal', justification?: string): Promise<void>

// Entregas
createDeliveryBatch(batch: Omit<DeliveryBatch, 'id'>): Promise<DeliveryBatch>
confirmDelivery(deliveryId: string, confirmationCode: string): Promise<void>

// Estoque de móveis
updateFurnitureStock(unitId: string, itemId: string, quantity: number): Promise<void>
getFurnitureStockByUnit(unitId: string): FurnitureStock[]

// Refresh
refreshData(): Promise<void>
```

**Provider:**
```tsx
<AppProvider>
  <App />
</AppProvider>
```

**Hook de uso:**
```tsx
const { 
  currentUser, 
  users, 
  createUser,
  login,
  logout 
} = useApp();
```

---

## 🛠️ Utilitários e Helpers

### `dailyCode.ts`
**Arquivo:** `/utils/dailyCode.ts`

**Propósito:** Geração e validação de códigos únicos diários.

**Funções:**

**`generateDailyCode(userId: string): string`**
```typescript
// Gera código único para o usuário no dia atual
// Algoritmo: SHA-256(userId + date + secret)
// Retorna: String de 16 caracteres hexadecimais

const code = generateDailyCode('user-123');
// Resultado: "a3f8c9d2e1b4f7c6"
```

**`validateDailyCode(code: string, userId: string): boolean`**
```typescript
// Valida se o código é válido para o usuário hoje
// Retorna: true se válido, false se inválido/expirado

const isValid = validateDailyCode('a3f8c9d2e1b4f7c6', 'user-123');
```

**`getDailyCodeExpiration(): Date`**
```typescript
// Retorna data/hora de expiração (23:59:59 de hoje)

const expiration = getDailyCodeExpiration();
// Resultado: 2024-12-10T23:59:59.999Z
```

---

### `api.ts`
**Arquivo:** `/utils/api.ts`

**Propósito:** Cliente HTTP para comunicação com backend.

**Funções:**

**`apiClient`**
```typescript
// Cliente axios configurado
const apiClient = axios.create({
  baseURL: `https://${projectId}.supabase.co/functions/v1/make-server-46b247d8`,
  headers: {
    'Authorization': `Bearer ${publicAnonKey}`,
    'Content-Type': 'application/json'
  }
});
```

**`get<T>(endpoint: string): Promise<T>`**
```typescript
// GET request
const users = await api.get<User[]>('/api/users');
```

**`post<T>(endpoint: string, data: any): Promise<T>`**
```typescript
// POST request
const newUser = await api.post<User>('/api/users', {
  name: 'João',
  email: 'joao@example.com'
});
```

**`put<T>(endpoint: string, data: any): Promise<T>`**
```typescript
// PUT request
const updated = await api.put<User>('/api/users/123', {
  name: 'João Silva'
});
```

**`delete<T>(endpoint: string): Promise<T>`**
```typescript
// DELETE request
await api.delete('/api/users/123');
```

**Interceptors:**
- Request: Adiciona token de autenticação
- Response: Trata erros globalmente
- Error: Exibe toast de erro

---

### `auth.ts`
**Arquivo:** `/utils/auth.ts`

**Propósito:** Funções de autenticação.

**Funções:**

**`hashPassword(password: string): string`**
```typescript
// Hash de senha (SHA-256)
const hashed = hashPassword('minhasenha123');
```

**`verifyPassword(password: string, hashedPassword: string): boolean`**
```typescript
// Verifica se senha corresponde ao hash
const isValid = verifyPassword('minhasenha123', hashed);
```

**`generateToken(userId: string): string`**
```typescript
// Gera token JWT
const token = generateToken('user-123');
```

**`verifyToken(token: string): string | null`**
```typescript
// Verifica token e retorna userId
const userId = verifyToken(token);
```

---

### `useInactivityLogout.ts`
**Arquivo:** `/hooks/useInactivityLogout.ts`

**Propósito:** Hook para logout automático por inatividade.

**Uso:**
```tsx
function App() {
  useInactivityLogout(30 * 60 * 1000); // 30 minutos
  
  return <div>...</div>;
}
```

**Funcionamento:**
- Monitora eventos: mousemove, keypress, click, scroll, touch
- Reseta timer a cada evento
- Após X tempo sem atividade, faz logout automático
- Exibe notificação antes de deslogar

**Configuração:**
```typescript
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutos
const WARNING_BEFORE_LOGOUT = 60 * 1000;   // 1 minuto de aviso
```

---

## 🔌 Backend e API

### `index.tsx` (Server)
**Arquivo:** `/supabase/functions/server/index.tsx`

**Propósito:** Servidor Hono (Edge Function) que gerencia todas as requisições.

**Tecnologias:**
- **Hono** - Framework web
- **Deno** - Runtime
- **Supabase Client** - Comunicação com banco

**Rotas:**

#### **Usuários**

**`GET /make-server-46b247d8/api/users`**
```typescript
// Retorna todos os usuários
// Resposta: User[]
```

**`POST /make-server-46b247d8/api/users`**
```typescript
// Cria novo usuário
// Body: { name, email, password, role, unitId? }
// Resposta: User
```

**`PUT /make-server-46b247d8/api/users/:id`**
```typescript
// Atualiza usuário
// Body: Partial<User>
// Resposta: User
```

**`POST /make-server-46b247d8/api/users/:id/reset-password`**
```typescript
// Reseta senha do usuário
// Body: { newPassword }
// Resposta: { success: true }
```

#### **Autenticação**

**`POST /make-server-46b247d8/api/auth/login`**
```typescript
// Login de usuário
// Body: { email, password }
// Resposta: { user: User, token: string }
```

**`POST /make-server-46b247d8/api/auth/logout`**
```typescript
// Logout
// Headers: { Authorization: Bearer <token> }
// Resposta: { success: true }
```

#### **Unidades**

**`GET /make-server-46b247d8/api/units`**
```typescript
// Lista todas as unidades (da tabela units)
// Resposta: Unit[]
```

**`POST /make-server-46b247d8/api/units`**
```typescript
// Cria nova unidade
// Body: { name, address }
// Resposta: Unit
```

**`PUT /make-server-46b247d8/api/units/:id`**
```typescript
// Atualiza unidade
// Body: Partial<Unit>
// Resposta: Unit
```

#### **Andares**

**`GET /make-server-46b247d8/api/floors`**
```typescript
// Lista todos os andares (da tabela floors)
// Resposta: Floor[]
```

**`POST /make-server-46b247d8/api/floors`**
```typescript
// Cria novo andar
// Body: { unitId, name }
// Resposta: Floor
```

**`PUT /make-server-46b247d8/api/floors/:id`**
```typescript
// Atualiza andar
// Body: Partial<Floor>
// Resposta: Floor
```

**`DELETE /make-server-46b247d8/api/floors/:id`**
```typescript
// Deleta andar
// Resposta: { success: true }
```

#### **Itens**

**`GET /make-server-46b247d8/api/items`**
```typescript
// Lista todos os itens
// Resposta: Item[]
```

**`POST /make-server-46b247d8/api/items`**
```typescript
// Cria novo item
// Body: { name, description, category, type }
// Resposta: Item
```

**`PUT /make-server-46b247d8/api/items/:id`**
```typescript
// Atualiza item
// Body: Partial<Item>
// Resposta: Item
```

#### **Movimentações**

**`GET /make-server-46b247d8/api/movements`**
```typescript
// Lista todas as movimentações
// Resposta: Movement[]
```

**`POST /make-server-46b247d8/api/movements`**
```typescript
// Cria nova movimentação
// Body: { itemId, unitId, userId, type: 'in' | 'out', quantity, reason }
// Resposta: Movement
```

#### **Solicitações**

**`GET /make-server-46b247d8/api/requests`**
```typescript
// Lista todas as solicitações
// Resposta: Request[]
```

**`POST /make-server-46b247d8/api/requests`**
```typescript
// Cria nova solicitação
// Body: { itemId, quantity, requestingUnitId, floorId, requestedByUserId }
// Resposta: Request
```

**`PUT /make-server-46b247d8/api/requests/:id/approve`**
```typescript
// Aprova solicitação
// Body: { approverId }
// Resposta: Request
```

**`PUT /make-server-46b247d8/api/requests/:id/reject`**
```typescript
// Rejeita solicitação
// Body: { approverId, rejectionReason }
// Resposta: Request
```

#### **Transferências**

**`GET /make-server-46b247d8/api/furniture-transfers`**
```typescript
// Lista todas as transferências
// Resposta: FurnitureTransfer[]
```

**`POST /make-server-46b247d8/api/furniture-transfers`**
```typescript
// Cria transferência
// Body: { itemId, quantity, fromUnitId, toUnitId, requestedByUserId }
// Resposta: FurnitureTransfer
```

**`PUT /make-server-46b247d8/api/furniture-transfers/:id/approve`**
```typescript
// Aprova transferência
// Body: { approverId }
// Resposta: FurnitureTransfer
```

#### **Retiradas**

**`GET /make-server-46b247d8/api/furniture-removals`**
```typescript
// Lista todas as retiradas
// Resposta: FurnitureRemovalRequest[]
```

**`POST /make-server-46b247d8/api/furniture-removals`**
```typescript
// Cria solicitação de retirada
// Body: { itemId, quantity, unitId, reason, requestedByUserId }
// Resposta: FurnitureRemovalRequest
```

**`PUT /make-server-46b247d8/api/furniture-removals/:id/review`**
```typescript
// Designer avalia retirada
// Body: { reviewerId, decision: 'storage' | 'disposal', disposalJustification? }
// Resposta: FurnitureRemovalRequest
```

**`PUT /make-server-46b247d8/api/furniture-removals/:id/receive`**
```typescript
// Almoxarifado confirma recebimento
// Body: { receiverId }
// Resposta: FurnitureRemovalRequest
```

#### **Entregas**

**`GET /make-server-46b247d8/api/delivery-batches`**
```typescript
// Lista todos os lotes de entrega
// Resposta: DeliveryBatch[]
```

**`POST /make-server-46b247d8/api/delivery-batches`**
```typescript
// Cria lote de entrega
// Body: { driverId, requestIds: string[] }
// Resposta: DeliveryBatch
```

**`PUT /make-server-46b247d8/api/delivery-batches/:id/confirm`**
```typescript
// Confirma entrega via QR Code
// Body: { confirmationCode, receiverId }
// Resposta: DeliveryBatch
```

#### **Estoque de Móveis**

**`GET /make-server-46b247d8/api/furniture-stock`**
```typescript
// Lista estoque de móveis
// Resposta: FurnitureStock[]
```

**`PUT /make-server-46b247d8/api/furniture-stock`**
```typescript
// Atualiza estoque de móvel
// Body: { unitId, itemId, quantity }
// Resposta: FurnitureStock
```

**Middleware:**
```typescript
// CORS
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization']
}));

// Logger
app.use('*', logger(console.log));

// Error Handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({ error: err.message }, 500);
});
```

---

### `kv_store.tsx`
**Arquivo:** `/supabase/functions/server/kv_store.tsx`

**⚠️ ARQUIVO PROTEGIDO - NÃO MODIFICAR**

**Propósito:** Utilitário para interação com a tabela key-value.

**Funções disponíveis:**

**`get<T>(key: string): Promise<T | null>`**
```typescript
// Busca valor por chave
const users = await kv.get<User[]>('users');
```

**`set<T>(key: string, value: T): Promise<void>`**
```typescript
// Define valor para chave
await kv.set('users', updatedUsers);
```

**`del(key: string): Promise<void>`**
```typescript
// Deleta chave
await kv.del('old_key');
```

**`mget<T>(keys: string[]): Promise<T[]>`**
```typescript
// Busca múltiplas chaves
const [users, items] = await kv.mget<[User[], Item[]]>(['users', 'items']);
```

**`mset(entries: Record<string, any>): Promise<void>`**
```typescript
// Define múltiplas chaves
await kv.mset({
  users: updatedUsers,
  items: updatedItems
});
```

**`getByPrefix<T>(prefix: string): Promise<T[]>`**
```typescript
// Busca todas as chaves que começam com prefixo
const allStocks = await kv.getByPrefix<UnitStock[]>('stock_');
```

**Implementação interna:**
```typescript
// Usa tabela kv_store_46b247d8
// Schema: { key: TEXT, value: JSONB }
// Operações SQL diretas via Supabase Client
```

---

## 📘 Tipos e Interfaces

### `types/index.ts`
**Arquivo:** `/types/index.ts`

**Propósito:** Definições TypeScript de todos os tipos do sistema.

**Tipos principais:**

#### **User**
```typescript
type UserRole = 'admin' | 'controller' | 'warehouse' | 'designer' | 'requester' | 'developer';

interface User {
  id: string;
  name: string;
  email: string;
  password: string;      // Hash SHA-256
  role: UserRole;
  unitId?: string;       // Obrigatório para solicitantes
  createdAt: Date;
  lastLogin?: Date;
}
```

#### **Unit**
```typescript
interface Unit {
  id: string;            // UUID
  name: string;          // Ex: "Paulista 302"
  address: string;       // Endereço completo
  createdAt: Date;
}
```

#### **Floor**
```typescript
interface Floor {
  id: string;            // UUID
  unitId: string;        // FK para units
  name: string;          // Ex: "1º Andar", "Térreo"
  createdAt: Date;
}
```

#### **Item**
```typescript
type ItemType = 'material' | 'furniture';
type ItemCategory = 'escritorio' | 'limpeza' | 'eletronicos' | 'outros';

interface Item {
  id: string;
  name: string;
  description?: string;
  category: ItemCategory;
  type: ItemType;        // 'material' ou 'furniture'
  createdAt: Date;
}
```

#### **Movement**
```typescript
type MovementType = 'in' | 'out';

interface Movement {
  id: string;
  itemId: string;        // FK para items
  unitId: string;        // FK para units
  userId: string;        // Quem fez a movimentação
  type: MovementType;    // 'in' = entrada, 'out' = saída
  quantity: number;      // Positivo para in, negativo para out
  reason: string;        // Motivo da movimentação
  movementDate: Date;
  createdAt: Date;
}
```

#### **Request**
```typescript
type RequestStatus = 
  | 'pending'           // Aguardando aprovação
  | 'approved'          // Aprovada pelo admin
  | 'rejected'          // Rejeitada
  | 'processing'        // Em preparação (almoxarifado)
  | 'awaiting_pickup'   // Aguardando coleta
  | 'in_transit'        // Em transporte
  | 'delivered'         // Entregue
  | 'awaiting_confirmation'; // Pendente de confirmação

interface Request {
  id: string;
  itemId: string;
  quantity: number;
  requestingUnitId: string;
  floorId: string;
  requestedByUserId: string;
  approvedByUserId?: string;
  status: RequestStatus;
  rejectionReason?: string;
  createdAt: Date;
  approvedAt?: Date;
  deliveredAt?: Date;
}
```

#### **FurnitureTransfer**
```typescript
interface FurnitureTransfer {
  id: string;
  itemId: string;
  quantity: number;
  fromUnitId: string;
  toUnitId: string;
  requestedByUserId: string;
  approvedByUserId?: string;
  status: RequestStatus;
  createdAt: Date;
  approvedAt?: Date;
  completedAt?: Date;
}
```

#### **FurnitureRemovalRequest**
```typescript
type RemovalStatus =
  | 'pending_designer'      // Aguardando avaliação do designer
  | 'approved_storage'      // Aprovado para armazenagem
  | 'approved_disposal'     // Aprovado para descarte
  | 'rejected_designer'     // Rejeitado pelo designer
  | 'completed';            // Recebido pelo almoxarifado

interface FurnitureRemovalRequest {
  id: string;
  itemId: string;
  quantity: number;
  unitId: string;
  floorId?: string;
  reason: string;                    // Motivo da retirada
  requestedByUserId: string;
  reviewedByUserId?: string;         // Designer que avaliou
  receivedByUserId?: string;         // Almoxarifado que recebeu
  status: RemovalStatus;
  disposalJustification?: string;    // Justificativa para descarte
  createdAt: Date;
  reviewedAt?: Date;
  receivedAt?: Date;
}
```

#### **DeliveryBatch**
```typescript
interface DeliveryBatch {
  id: string;
  driverId: string;
  requestIds: string[];      // IDs das solicitações no lote
  status: 'pending' | 'delivered';
  qrCode: string;            // QR Code único do lote
  createdAt: Date;
  deliveredAt?: Date;
}
```

#### **DeliveryConfirmation**
```typescript
interface DeliveryConfirmation {
  id: string;
  requestId: string;
  confirmedByUserId: string;
  confirmationCode: string;  // Código do QR scaneado
  confirmedAt: Date;
}
```

#### **FurnitureStock**
```typescript
interface FurnitureStock {
  id: string;
  unitId: string;
  itemId: string;
  quantity: number;
  updatedAt: Date;
}
```

#### **UnitStock**
```typescript
interface UnitStock {
  id: string;
  unitId: string;
  itemId: string;
  quantity: number;
  updatedAt: Date;
}
```

---

## 🔄 Fluxos de Dados

### Fluxo 1: Solicitação de Móvel
```
1. Solicitante abre RequestItemsPanel
   └─> Seleciona item, quantidade, andar
   └─> Clica "Solicitar"
   
2. Frontend chama createRequest()
   └─> POST /api/requests
   └─> Body: { itemId, quantity, requestingUnitId, floorId, requestedByUserId }
   
3. Backend salva no KV store
   └─> Status: 'pending'
   └─> Retorna Request criada
   
4. AppContext atualiza estado
   └─> Adiciona à lista de requests
   └─> Toast de sucesso
   
5. Admin vê solicitação em FurnitureRequestsPanel
   └─> Clica "Aprovar"
   
6. Frontend chama approveRequest(requestId, adminId)
   └─> PUT /api/requests/:id/approve
   
7. Backend atualiza status
   └─> Status: 'approved'
   └─> approvedByUserId: adminId
   └─> approvedAt: now()
   
8. Almoxarifado vê em solicitações aprovadas
   └─> Cria entrega
   
9. Frontend chama createDeliveryBatch()
   └─> POST /api/delivery-batches
   └─> Body: { driverId, requestIds: [requestId] }
   
10. Backend cria lote
    └─> Gera QR Code único
    └─> Status: 'pending'
    └─> Atualiza request: status = 'in_transit'
    
11. Motorista vê entrega em DriverDashboard
    └─> Abre scanner QR
    └─> Escaneia código do recebedor
    
12. Frontend valida código
    └─> generateDailyCode(receiverId) === scannedCode
    └─> Se válido, chama confirmDelivery()
    
13. Backend confirma entrega
    └─> PUT /api/delivery-batches/:id/confirm
    └─> Atualiza batch: status = 'delivered'
    └─> Atualiza request: status = 'delivered', deliveredAt = now()
    └─> Cria DeliveryConfirmation
    
14. Log de auditoria registra todas as etapas
    └─> Solicitação criada
    └─> Solicitação aprovada
    └─> Entrega criada
    └─> Entrega confirmada
```

### Fluxo 2: Retirada de Móvel
```
1. Solicitante abre FurnitureRemovalDialog
   └─> Seleciona móvel, quantidade, motivo
   └─> Clica "Solicitar Retirada"
   
2. Frontend chama createFurnitureRemoval()
   └─> POST /api/furniture-removals
   └─> Body: { itemId, quantity, unitId, reason, requestedByUserId }
   
3. Backend salva
   └─> Status: 'pending_designer'
   └─> Retorna FurnitureRemovalRequest
   
4. Designer vê em DesignerDashboard
   └─> Analisa móvel e motivo
   └─> Decide: Armazenar / Descartar / Rejeitar
   
5a. Se ARMAZENAR:
    └─> Clica "Aprovar para Armazenagem"
    └─> Frontend chama reviewFurnitureRemoval(id, designerId, 'storage')
    └─> Backend: status = 'approved_storage'
    
5b. Se DESCARTAR:
    └─> Clica "Aprovar para Descarte"
    └─> Modal pede justificativa
    └─> Frontend chama reviewFurnitureRemoval(id, designerId, 'disposal', justification)
    └─> Backend: status = 'approved_disposal'
    
5c. Se REJEITAR:
    └─> Clica "Rejeitar"
    └─> Backend: status = 'rejected_designer'
    └─> Móvel permanece na unidade
    └─> FIM
    
6. Almoxarifado vê retirada aprovada
   └─> Agenda coleta
   └─> Recebe móvel fisicamente
   └─> Clica "Confirmar Recebimento"
   
7. Frontend chama confirmFurnitureRemovalReceipt(id, warehouseId)
   └─> PUT /api/furniture-removals/:id/receive
   
8. Backend finaliza
   └─> Status: 'completed'
   └─> receivedByUserId: warehouseId
   └─> receivedAt: now()
   
9a. Se era STORAGE:
    └─> Backend adiciona ao estoque do almoxarifado
    └─> updateFurnitureStock(warehouseUnitId, itemId, +quantity)
    
9b. Se era DISPOSAL:
    └─> Não adiciona ao estoque
    └─> Móvel descartado
    
10. Log de auditoria registra
    └─> Retirada solicitada
    └─> Retirada avaliada (storage/disposal)
    └─> Retirada recebida
```

### Fluxo 3: Transferência entre Unidades
```
1. Admin/Controller abre AdminWarehouseDashboard
   └─> Seleciona unidade de origem
   └─> Clica "Transferir" em um móvel
   
2. Dialog abre
   └─> Seleciona unidade de destino
   └─> Define quantidade
   
3. Frontend chama createFurnitureTransfer()
   └─> POST /api/furniture-transfers
   └─> Body: { itemId, quantity, fromUnitId, toUnitId, requestedByUserId }
   
4. Backend salva
   └─> Status: 'pending'
   └─> Retorna FurnitureTransfer
   
5. Admin vê transferência em "Transferências" tab
   └─> Clica "Aprovar"
   
6. Frontend chama approveFurnitureTransfer(transferId, adminId)
   └─> PUT /api/furniture-transfers/:id/approve
   
7. Backend processa
   └─> Status: 'approved'
   └─> approvedByUserId: adminId
   └─> approvedAt: now()
   
8. Sistema aguarda transporte físico
   └─> Status: 'awaiting_pickup'
   
9. Quando móvel chega no destino
   └─> Almoxarifado confirma
   └─> Frontend chama completeFurnitureTransfer(transferId)
   
10. Backend finaliza
    └─> Status: 'completed'
    └─> completedAt: now()
    └─> Atualiza estoque origem: quantity - X
    └─> Atualiza estoque destino: quantity + X
    
11. Log registra
    └─> Transferência solicitada
    └─> Transferência aprovada
    └─> Transferência concluída
```

---

## 🛒 Módulo Sistema de Compras

### Visão Geral

Módulo completo de Sistema de Compras integrado ao NetworkGo (GoWork). Persistência via Supabase. Integrações externas: Omie ERP (pedidos e NFs) e N8N (automações e notificações).

---

### Estrutura de Pastas

```
/components/purchases/
  /admin/          ← Dashboards admin/controller/diretoria
  /buyer/          ← Dashboards comprador
  /manager/        ← Dashboards gestor (aprovação 1ª camada)
  /requester/      ← Dashboards solicitante
  /warehouse/      ← Recebimento almoxarifado
  /financial/      ← Dashboards financeiro
  /shared/         ← Componentes compartilhados do módulo compras
```

---

### Navegação e Abas

**Nova aba principal:** "Compras" no menu do DeveloperDashboard e AdminDashboard.

**Subabas por perfil:**

| Perfil | Subabas |
|--------|---------|
| Admin/Controller/Diretoria | Cadastros, Solicitações Pendentes, Cotações, Pedidos, Relatórios |
| Manager (Gestor) | Solicitações da Minha Área, Histórico de Aprovações |
| Buyer (Comprador) | Solicitações Aprovadas, Cotações, Pedidos, Fornecedores |
| Requester (Solicitante) | Nova Solicitação, Minhas Solicitações |
| Warehouse (Almoxarifado) | Recebimentos Pendentes, Confirmar Recebimento |
| Financial (Financeiro) | Dashboard Contratos, Centros de Custo, Relatórios |

---

### Entidades e Estrutura de Dados

#### Cadastros Base

**Supplier (Fornecedor)**  
`id`, `razaoSocial`, `cnpj`, `contato`, `email`, `telefone`, `categoriaId`, `endereco`, `dadosBancarios` (banco, agencia, conta, pix), `status` (ativo/inativo), `createdAt`, `updatedAt`

**SupplierCategory (Categoria Fornecedor)**  
`id`, `nome`, `descricao`, `status` (ativo/inativo)

**CostCenter (Centro de Custo)**  
`id`, `codigo`, `nome`, `descricao`, `status` (ativo/inativo)

**Contract (Contrato)**  
`id`, `numero`, `nome`, `cnpjCliente`, `valorTotal`, `valorConsumido` (calculado), `saldo` (calculado), `dataInicio`, `dataFim`, `centroCustoId`, `status` (ativo/encerrado/suspenso), `createdAt`, `updatedAt`

Cálculos: `valorConsumido` = soma de valores de NFs vinculadas; `saldo` = `valorTotal` - `valorConsumido`

**Currency (Moeda)**  
`id`, `codigo` (BRL/USD/EUR), `simbolo` (R$/$/€), `nome`, `status` (ativo/inativo)

#### Fluxo de Compras

**PurchaseRequest (Solicitação de Compra)**  
`id`, `solicitanteId`, `unidadeId`, `centroCustoId`, `cnpjSolicitante`, `contratoId` (opcional), `justificativa`, `status`, `itens[]`, `aprovacoes[]`, `createdAt`, `updatedAt`

**Status do fluxo:**  
`pending_manager` → `approved_manager` / `rejected_manager` → `pending_director` → `approved_director` / `rejected_director` → `in_quotation` → `quotation_completed` → `in_purchase` → `completed`

**PurchaseRequestItem**  
`id`, `solicitacaoId`, `descricao`, `quantidade`, `unidadeMedida`, `observacao`

**Approval (Histórico de Aprovação)**  
`id`, `userId`, `userName`, `role` (manager/director), `action` (approved/rejected), `justificativa` (obrigatória se rejected), `timestamp`

**Quotation (Cotação)**  
`id`, `solicitacaoId`, `fornecedorId`, `moedaId`, `formaPagamento`, `condicoesPagamento`, `prazoEntrega` (dias), `observacoes`, `status`, `itens[]`, `linkPreenchimento` (URL única para fornecedor), `enviadoEm`, `respondidoEm`, `createdAt`, `updatedAt`

Status: `draft` → `sent` → `responded` → `approved` / `rejected`

**QuotationItem**  
`id`, `cotacaoId`, `itemSolicitacaoId`, `descricao`, `quantidade`, `unidadeMedida`, `precoUnitario`, `valorTotal` (calculado), `observacoes`

**PurchaseOrder (Pedido)**  
`id`, `cotacaoId`, `numeroOmie`, `valorTotal`, `status`, `notasFiscais[]`, `observacoes`, `createdAt`, `updatedAt`

Status: `created` → `awaiting_nf` → `nf_issued` → `in_transit` → `partially_received` → `fully_received`

**InvoiceInfo (Nota Fiscal)**  
`numero`, `valor`, `dataEmissao`, `chaveAcesso`

**Receiving (Recebimento)**  
`id`, `pedidoId`, `itemId`, `quantidadeEsperada`, `quantidadeRecebida`, `responsavelId`, `dataRecebimento`, `localEntrega`, `status` (pending/partially_received/fully_received), `observacoes`, `createdAt`

---

### Regras de Negócio

#### Aprovações (Duas Camadas)

**1ª Camada - Manager (Gestor):**
- Aprova/rejeita solicitações da sua unidade/centro de custo
- Não pode aprovar própria solicitação
- Justificativa obrigatória em rejeições
- Notificação via N8N ao solicitante

**2ª Camada - Director (Diretoria):**
- Aprova/rejeita apenas solicitações já aprovadas por gestor
- Validação de saldo de contrato antes de aprovar
- Se saldo contrato < valor solicitação → bloqueio automático
- Notificação via N8N ao comprador quando aprovado

**Histórico:** Array `aprovacoes[]` registra todas as ações (userId, userName, role, action, justificativa, timestamp).

#### Contratos

- Validação antes de aprovar: se contrato vinculado e saldo < valor_solicitacao → rejeitar automaticamente e notificar financeiro via N8N
- Alerta amarelo no dashboard quando `valorConsumido` >= 80% do `valorTotal`
- Bloqueio total quando `valorConsumido` >= 100%
- `valorConsumido` recalculado ao vincular cada NF ao pedido

#### Cotações

- Suporte a 3–5 fornecedores simultâneos por solicitação
- Link único para fornecedor: token `crypto.randomUUID()`, URL `https://app.com/quotation/:token`, expiração 7 dias
- Interface pública sem autenticação para preenchimento pelo fornecedor
- Fallback: comprador preenche manualmente se fornecedor não responder
- Campo moeda pré-preenchido conforme cadastro do fornecedor; conversão automática para BRL no comparativo

#### Recebimento

- Parcial permitido: registrar item por item; `quantidadeRecebida` <= `quantidadeEsperada`
- Status do pedido: `partially_received` se algum item < esperado; `fully_received` quando todos completos
- Qualquer usuário autorizado do almoxarifado pode registrar
- NF obrigatória antes de permitir recebimento; local de entrega obrigatório

---

### Integrações

**Omie ERP:**
- Criar pedido ao aprovar cotação
- Sincronizar NFs via webhook ou polling (ex.: a cada 6h)
- Campos mapeados: `numeroOmie`, `chaveAcesso`, `valor`, `dataEmissao`
- Fallback manual se API falhar

**N8N (Automações):**
- Solicitação criada → Gestor
- Aprovada gestor → Diretoria
- Aprovada diretoria → Comprador
- Cotação enviada → Fornecedor (com link)
- Cotação respondida → Comprador
- Pedido criado → Solicitante
- NF emitida → Solicitante + Almoxarifado
- Recebimento completo → Solicitante
- Contrato 80% → Financeiro
- Contrato 100% → Financeiro (urgente)
- Verificação diária de contratos próximos ao limite
- Lembrete cotações não respondidas (3 dias)
- Alerta itens não recebidos (prazo + 7 dias)

---

### Portal do Fornecedor

- Interface pública sem autenticação em `quotation/:token`
- Exibe: solicitante (empresa), itens, quantidades, especificações
- Formulário: preço unitário, prazo entrega, condições pagamento, observações
- Validações: preço > 0, prazo >= 0
- Token único, não reutilizável; expiração 7 dias; rate limit: 5 tentativas/hora

---

### Dashboards e Relatórios

**Dashboard Geral (Admin/Buyer):** KPIs (total por status, valor em cotação, pedidos em trânsito); gráficos (solicitações por mês, distribuição por status); top 5 fornecedores por volume.

**Dashboard Financeiro:** Gastos por centro de custo; evolução mensal; contratos com saldo, % consumido e alertas; filtros por período, centro custo, contrato.

**Dashboard Fornecedores:** Volume de compras; prazo médio de entrega; taxa de resposta a cotações; entregas no prazo vs atrasadas.

**Exportação CSV:** Log de solicitações, cotações, pedidos, recebimentos, gastos por centro custo/contrato; BOM UTF-8 para acentos.

---

### Controle de Acesso

| Funcionalidade | Admin | Manager | Buyer | Requester | Warehouse | Financial |
|----------------|-------|---------|-------|-----------|------------|-----------|
| Criar cadastros base | ✅ | ❌ | ⚠️ (só fornecedores) | ❌ | ❌ | ❌ |
| Criar solicitação | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Aprovar 1ª camada (gestor) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Aprovar 2ª camada (diretoria) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Criar cotações | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Criar pedidos Omie | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Registrar recebimento | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Visualizar contratos | ✅ | ⚠️ (só sua área) | ✅ | ❌ | ❌ | ✅ |
| Exportar relatórios | ✅ | ⚠️ (só sua área) | ✅ | ❌ | ❌ | ✅ |

Manager só aprova solicitações de sua unidade/centro de custo e não pode aprovar própria solicitação. Requester cria apenas para sua unidade e vê apenas próprias solicitações. Warehouse acessa apenas pedidos com status `nf_issued` ou `in_transit` e não vê valores financeiros.

---

### Logs de Auditoria

Estrutura: `id`, `timestamp`, `type`, `action`, `userId`, `userName`, `userRole`, `entityId`, `details` (previousStatus, newStatus, justification, changes).

Eventos: solicitação criada/aprovada/rejeitada; cotação criada/enviada/respondida/aprovada/rejeitada; pedido criado; NF vinculada; recebimento registrado; contrato 80%/100%; edições em cadastros base.

Painel Analytics com filtros: período, tipo, usuário, ação; busca em tempo real; exportação CSV.

---

### Componentes do Módulo

**Admin/Controller:** SupplierManagementPanel, CostCenterManagementPanel, ContractManagementPanel, PurchaseRequestApprovalPanel, PurchaseOrdersPanel.

**Manager:** ManagerPurchaseRequestsPanel, ManagerApprovalHistoryPanel.

**Buyer:** ApprovedRequestsPanel, QuotationManagementPanel, QuotationComparisonPanel, CreatePurchaseOrderDialog.

**Requester:** CreatePurchaseRequestPanel, MyPurchaseRequestsPanel.

**Warehouse:** PendingReceivingsPanel, ReceiveItemsDialog.

**Financial:** ContractsDashboard, CostCenterAnalytics, PurchaseReportsPanel.

**Shared:** PurchaseRequestStatusBadge, ContractProgressBar, QuotationComparisonTable, ApprovalTimeline.

---

### Padrões do Módulo

- Estado global via AppContext (padrão `createRequest`, `approveRequest`)
- Persistência via Supabase
- Rotas API: `/api/purchase-requests`, `/api/suppliers`, `/api/quotations`, `/api/contracts`, etc.
- Componentes UI base: Card, Button, Dialog, Table, Badge, Input, Tabs, Select
- Toast notifications em todas as ações
- Loading states obrigatórios em operações assíncronas
- Naming: PurchaseRequestPanel.tsx, createPurchaseRequest(), etc.

---

## 🔐 Segurança e Validações

### Validações de Frontend

**Solicitações:**
- ✅ Quantidade > 0
- ✅ Item selecionado
- ✅ Andar selecionado
- ✅ Usuário autenticado

**Transferências:**
- ✅ Unidade origem ≠ unidade destino
- ✅ Quantidade disponível em estoque
- ✅ Quantidade > 0

**Retiradas:**
- ✅ Motivo obrigatório (mínimo 10 caracteres)
- ✅ Quantidade disponível na unidade
- ✅ Justificativa obrigatória para descarte

**Entregas:**
- ✅ QR Code válido (formato correto)
- ✅ Código do dia atual
- ✅ Usuário correspondente

### Validações de Backend

**Autenticação:**
```typescript
// Todas as rotas verificam token
const token = req.headers.authorization?.split(' ')[1];
if (!token) return res.status(401).json({ error: 'Unauthorized' });

const userId = verifyToken(token);
if (!userId) return res.status(401).json({ error: 'Invalid token' });
```

**Permissões:**
```typescript
// Apenas admins podem aprovar
if (user.role !== 'admin' && user.role !== 'controller') {
  return res.status(403).json({ error: 'Forbidden' });
}

// Apenas designers podem avaliar retiradas
if (user.role !== 'designer') {
  return res.status(403).json({ error: 'Forbidden' });
}
```

**Estoque:**
```typescript
// Validar quantidade disponível
const currentStock = await getFurnitureStock(unitId, itemId);
if (currentStock.quantity < requestedQuantity) {
  return res.status(400).json({ error: 'Insufficient stock' });
}
```

**QR Code:**
```typescript
// Validar código do dia
const expectedCode = generateDailyCode(userId);
if (scannedCode !== expectedCode) {
  return res.status(400).json({ error: 'Invalid or expired code' });
}
```

---

## 📊 Performance e Otimização

### Carregamento Inicial
```typescript
// AppContext carrega todos os dados na inicialização
useEffect(() => {
  async function loadData() {
    setLoading(true);
    
    // Carrega em paralelo
    await Promise.all([
      loadUsers(),
      loadUnits(),
      loadFloors(),
      loadItems(),
      loadMovements(),
      loadRequests(),
      loadFurnitureTransfers(),
      loadFurnitureRemovals(),
      loadDeliveryBatches(),
      loadFurnitureStock(),
    ]);
    
    setLoading(false);
  }
  
  loadData();
}, []);
```

### Cache e Memoização
```typescript
// useMemo para cálculos pesados
const filteredRequests = useMemo(() => {
  return requests.filter(r => r.status === 'pending');
}, [requests]);

// useCallback para funções
const handleApprove = useCallback((id: string) => {
  approveRequest(id, currentUser.id);
}, [approveRequest, currentUser]);
```

### Lazy Loading
```typescript
// Componentes lazy
const AdminAnalytics = lazy(() => import('./components/AdminAnalytics'));

// Uso com Suspense
<Suspense fallback={<LoadingSpinner />}>
  <AdminAnalytics />
</Suspense>
```

---

## 🎨 Customização e Temas

### Dark Mode
```typescript
// Implementado via Tailwind CSS
// Classes: dark:bg-gray-900 dark:text-white

// Toggle em AppHeader
function toggleTheme() {
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
}
```

### Cores Brandbook
```css
/* globals.css */
:root {
  --festival-da-opera: #3F76FF;
  --pelourinho: #00C5E9;
  --cinza-profundo: #606060;
}

/* Uso em componentes */
.btn-primary {
  background-color: var(--festival-da-opera);
}
```

---

## 📱 Responsividade

### Breakpoints Tailwind
```css
sm: 640px   /* Tablets pequenos */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Desktops grandes */
```

### Mobile First
```tsx
// Exemplo de componente responsivo
<div className="
  flex flex-col         /* Mobile: coluna */
  md:flex-row          /* Tablet+: linha */
  gap-4                /* Espaçamento */
  p-4 md:p-6 lg:p-8    /* Padding responsivo */
">
  <Card className="w-full md:w-1/2 lg:w-1/3">
    Conteúdo
  </Card>
</div>
```

---

## ✅ Checklist de Funcionalidades

### Autenticação ✅
- [x] Login com email/senha
- [x] Logout
- [x] Logout automático por inatividade
- [x] Reset de senha (admin)
- [x] Sessões persistentes

### Usuários ✅
- [x] Criar usuário
- [x] Editar usuário
- [x] Listar usuários
- [x] 6 perfis distintos
- [x] Permissões por perfil

### Unidades e Andares ✅
- [x] Criar unidade
- [x] Editar unidade
- [x] Criar andares
- [x] Editar andares
- [x] Deletar andares
- [x] Vinculação unidade-andar

### Itens ✅
- [x] Criar item
- [x] Editar item
- [x] Categorias
- [x] Tipos (material/móvel)
- [x] Busca de itens

### Estoque ✅
- [x] Adicionar estoque
- [x] Consumir estoque
- [x] Estoque por unidade
- [x] Estoque de móveis
- [x] Timeline de movimentações
- [x] Histórico completo

### Solicitações ✅
- [x] Criar solicitação
- [x] Aprovar solicitação
- [x] Rejeitar solicitação
- [x] Status tracking
- [x] Notificações

### Transferências ✅
- [x] Criar transferência
- [x] Aprovar transferência
- [x] Rejeitar transferência
- [x] Atualização de estoque
- [x] Tracking completo

### Retiradas ✅
- [x] Solicitar retirada
- [x] Avaliação designer
- [x] Aprovação armazenagem
- [x] Aprovação descarte
- [x] Rejeição
- [x] Recebimento almoxarifado

### Entregas ✅
- [x] Criar entrega individual
- [x] Criar lote de entrega
- [x] QR Code de lote
- [x] QR Code pessoal (código do dia)
- [x] Confirmação via QR
- [x] Entrega pendente
- [x] Timeline de entrega

### Analytics ✅
- [x] Log master completo
- [x] Filtros por período
- [x] Filtros por tipo
- [x] Busca em tempo real
- [x] Gráficos de distribuição
- [x] KPIs principais
- [x] Exportação CSV

### UI/UX ✅
- [x] Dark mode
- [x] Responsivo mobile
- [x] Toast notifications
- [x] Loading states
- [x] Error handling
- [x] Componentes reutilizáveis

---

## 🚀 Próximos Passos (Sugestões)

### Melhorias Futuras
- [ ] Notificações push
- [ ] Integração com WhatsApp
- [ ] Relatórios PDF
- [ ] Dashboard de KPIs executivos
- [ ] Sistema de alertas de estoque baixo
- [ ] Previsão de demanda (IA)
- [ ] App mobile nativo
- [ ] Impressão de etiquetas com QR Code
- [ ] Chat interno entre perfis
- [ ] Agendamento de entregas

### Escalabilidade
- [ ] Suporte a 11 unidades
- [ ] Multi-tenancy
- [ ] Backup automatizado
- [ ] Disaster recovery
- [ ] Monitoramento de performance
- [ ] Logs estruturados (ELK Stack)

---

## 💰 Perfil Financeiro (Financial)

### Visão Geral

Perfil estratégico/gerencial voltado para o departamento Financeiro/Controladoria. Responsável por monitorar contratos, centros de custo, análise financeira, relatórios e alertas do módulo de compras.

**Role:** `financial`  
**Tipo:** Perfil dedicado ao módulo de compras (não opera no sistema de estoque)  
**Componente principal:** `FinancialDashboard.tsx`

### Seções de Navegação

| Seção | Ícone | Descrição |
|-------|-------|-----------|
| Visão Executiva | BarChart3 | Dashboard consolidado com KPIs, gráficos e alertas |
| Gestão de Contratos | FileText | Lista detalhada de contratos com filtros e ordenação |
| Centros de Custo | Landmark | Análise por centro de custo com gráfico comparativo |
| Alertas | Bell | Alertas categorizados por severidade |
| Relatórios | Download | Exportação CSV e resumo executivo |

### Componentes e Funcionalidades

#### 1. Visão Executiva (`OverviewSection`)
- **KPIs:** Valor total, consumido, saldo disponível, alertas ativos
- **Consumo geral:** Barra de progresso consolidada
- **Gráfico pizza:** Distribuição de gastos por centro de custo (Recharts)
- **Atenção imediata:** Contratos bloqueados, críticos e a vencer
- **Mini KPIs:** Solicitações pendentes, pedidos em andamento, contratos a vencer

#### 2. Gestão de Contratos (`ContractsSection`)
- **Filtros:** Status (ativo, encerrado, suspenso)
- **Ordenação:** Maior consumo, maior valor, vencimento
- **Cards detalhados:** Número, nome, valores, centro de custo, datas, CNPJ
- **Badges visuais:** Status, alertas de consumo ≥80%, vencimento ≤30d
- **Barra de progresso:** Por contrato individual

#### 3. Centros de Custo (`CostCentersSection`)
- **Gráfico de barras horizontal:** Consumido vs. Saldo por CC (ChartContainer + Recharts)
- **Cards por CC:** Total, consumido, saldo, contratos ativos, alertas
- **Barra de progresso:** Por centro de custo consolidado

#### 4. Alertas e Notificações (`AlertsSection`)
- **Severidades categorizadas:**
  - 🔴 Bloqueados (100%) — saldo esgotado
  - 🔴 Vencidos — data de vigência expirada
  - 🟡 Críticos (≥80%) — risco de bloqueio iminente
  - 🔵 A vencer (60 dias) — avaliar renovação
  - ⚪ Atenção (≥60%) — monitorar evolução
- **AlertGroup:** Componente reutilizável com card por contrato

#### 5. Relatórios e Exportações (`ReportsSection`)
- **Exportação CSV (UTF-8 com BOM):**
  - Contratos completos
  - Centros de custo consolidados
  - Relatório de alertas
  - Solicitações de compra
- **Resumo executivo:** Dados consolidados com data/hora de geração

### Limiares de Alerta

| Faixa | Cor | Classificação |
|-------|-----|---------------|
| ≥100% | Vermelho | Bloqueado/Esgotado |
| ≥80% | Âmbar | Crítico |
| ≥60% | Amarelo | Atenção |
| <60% | Verde | Normal |
| ≤30d vencimento | Azul | A vencer |
| <0d vencimento | Vermelho | Vencido |

### Dados Consumidos (PurchaseContext)

- `contracts` — Lista de contratos
- `costCenters` — Lista de centros de custo
- `purchaseRequests` — Solicitações de compra
- `purchaseOrders` — Pedidos de compra
- `isLoadingPurchases` — Estado de carregamento

### Componentes Auxiliares

| Componente | Descrição |
|------------|-----------|
| `KpiCard` | Card de KPI com ícone, valor, subtítulo e cor |
| `MiniKpi` | KPI compacto para métricas secundárias |
| `ContractStatusBadge` | Badge de status baseado no percentual |
| `AlertItem` | Item de alerta compacto (bloqueado/crítico/a vencer) |
| `AlertGroup` | Grupo de alertas por severidade |
| `ReportExportCard` | Card de exportação com botão CSV |
| `SummaryItem` | Item do resumo executivo |

### Integração no Sistema

- **App.tsx:** Rota `financial` → `<FinancialDashboard />`
- **AppSidebar.tsx:** Label "Financeiro" no ROLE_LABELS
- **ViewAsPanel.tsx:** Developer pode simular visão financeira
- **DeveloperModeSelector.tsx:** Ícone UserCog, cor emerald-600
- **PurchaseProvider:** Envolve o dashboard com dados de compras

## 👔 Funcionalidades de Gestor (Manager) — Integrado ao Perfil Admin

### Visão Geral

As funcionalidades de gestor estão **integradas ao perfil `admin`** (não é um role separado). O admin atua como gestor de área na 1ª camada de aprovação de solicitações de compra, além de suas responsabilidades administrativas existentes.

**Role:** `admin` (com funcionalidades de gestor adicionadas)  
**Componente:** `AdminUnitsDashboard.tsx` (seção Compras expandida)

### Novas Seções no Menu Compras

| Seção | Ícone | Descrição |
|-------|-------|-----------|
| Aprovações Gestor | CheckSquare | Aprovação 1ª camada de solicitações da área (badge com pendências) |
| Aprovações Diretoria | ClipboardList | Aprovação 2ª camada (já existente) |
| Histórico Aprovações | History | Decisões tomadas pelo gestor com timeline |
| Acompanhamento | Search | Rastreamento completo de todas as solicitações |
| Fornecedores | Building2 | Gestão de fornecedores (já existente) |
| Centros de Custo | Landmark | Gestão de centros de custo (já existente) |
| Contratos | FileText | Gestão de contratos (já existente) |

### Componentes Utilizados

#### `ManagerPurchaseRequestsPanel` (reutilizado)
- Filtra solicitações `pending_manager` da unidade do admin
- Exclui solicitações feitas pelo próprio admin
- Botões de Aprovar/Rejeitar com dialog de confirmação
- Rejeição exige justificativa (mínimo 10 caracteres)
- Aprovação envia para 2ª camada (`pending_director`)

#### `ManagerApprovalHistoryPanel` (reutilizado)
- Lista solicitações onde o admin participou como aprovador
- Ordenação por data de atualização (mais recentes primeiro)
- Timeline de aprovação com ícones visuais

#### `AdminRequestTrackingPanel` (novo)
- **KPIs clicáveis:** Total, Pendentes, Em Andamento, Concluídas, Rejeitadas
- Funciona como filtro rápido ao clicar nos cards
- **Lista detalhada** de cada solicitação com:
  - Status badge colorido
  - Dados do solicitante, unidade, centro de custo
  - Itens solicitados (quantidade e unidade de medida)
  - Contrato associado com barra de progresso
  - Timeline completa de aprovações

### Fluxo de Aprovação em 2 Camadas

```
Solicitante cria solicitação
        ↓
  [pending_manager]
        ↓
  Admin/Gestor aprova (1ª camada)  →  Rejeita → [rejected_manager]
        ↓
  [pending_director]
        ↓
  Diretoria aprova (2ª camada)     →  Rejeita → [rejected_director]
        ↓
  [in_quotation] → [quotation_completed] → [in_purchase] → [completed]
```

### Badge de Pendências

O menu "Aprovações Gestor" exibe um badge com a contagem de solicitações pendentes da unidade do admin, facilitando identificação rápida de demandas.

## 📝 Requester — Funcionalidades de Compras Expandidas

### Visão Geral

O perfil `requester` já existia no sistema de estoque. Suas funcionalidades de compras foram expandidas para cobrir todo o ciclo: criação, acompanhamento detalhado, e visibilidade sobre cotações e pedidos.

**Role:** `requester` (existente)  
**Componente principal:** `RequesterDashboard.tsx`

### Seções de Navegação (Compras)

| Seção | Componente | Descrição |
|-------|-----------|-----------|
| Nova Solicitação | `CreatePurchaseRequestPanel` | Formulário com centro de custo, contrato, justificativa e itens |
| Minhas Solicitações | `MyPurchaseRequestsPanel` | Acompanhamento completo com filtros, KPIs e ciclo de vida |

### `MyPurchaseRequestsPanel` — Funcionalidades Expandidas

#### KPIs Clicáveis (filtros rápidos)
- **Pendentes** — solicitações aguardando aprovação (gestor ou diretoria)
- **Em Andamento** — em cotação, cotação concluída ou em compra
- **Concluídas** — finalizadas com sucesso
- **Rejeitadas** — rejeitadas por gestor ou diretoria

#### Detalhes por Solicitação (Accordion)
- **Status badge** colorido com label em português
- **Justificativa** da solicitação
- **Motivo da rejeição** — destacado em card vermelho quando rejeitada
- **Centro de custo e contrato** — informações vinculadas
- **Saldo do contrato** — barra de progresso com valores (consumido/saldo)
- **Itens solicitados** — lista com quantidade e unidade de medida
- **Progresso visual** — `RequestFlowProgress` com 6 etapas:
  1. Criada → 2. Gestor → 3. Diretoria → 4. Cotação → 5. Compra → 6. Concluída
  - Etapas concluídas em azul, rejeitadas em vermelho, pendentes em cinza
- **Cotações vinculadas** — status, prazo de entrega, valores por item
- **Pedidos de compra** — número Omie, valor total, notas fiscais
- **Timeline de aprovações** — histórico de decisões com datas

#### Dados Consumidos (PurchaseContext)
- `purchaseRequests` — solicitações do usuário
- `quotations` — cotações vinculadas via `solicitacaoId`
- `purchaseOrders` — pedidos vinculados via `cotacaoId`
- `contracts` — barra de progresso do contrato
- `costCenters` — nome do centro de custo

### `CreatePurchaseRequestPanel` — Já existente

- Formulário com campos: Centro de Custo, Contrato (opcional), Justificativa
- Itens dinâmicos: descrição, quantidade, unidade de medida, observação
- Validações: justificativa mín. 10 caracteres, ao menos 1 item válido
- Status inicial: `pending_manager`

---

**Documentação gerada em:** 10/12/2024  
**Versão do sistema:** 1.0.0 - Produção  
**Última atualização:** 25/02/2026

---

*Módulo Sistema de Compras documentado em 24/02/2025. Perfil Financeiro documentado em 25/02/2026. Gestor integrado ao Admin em 25/02/2026. Requester expandido em 25/02/2026. Stack: React + TypeScript + Supabase. Integrações: Omie ERP + N8N.*
