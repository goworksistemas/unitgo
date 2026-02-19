import { projectId, publicAnonKey, functionSlug } from './supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/${functionSlug}`;

// Helper to get auth token
// NOTA: Por enquanto, usar sempre publicAnonKey pois o backend não valida JWT customizado
const getAuthToken = () => {
  // Para as rotas de autenticação específicas, usar o token armazenado
  // Para outras rotas, usar o publicAnonKey
  return publicAnonKey;
};

// ✅ Helper to convert camelCase to snake_case
function toSnakeCase(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase);
  }

  if (obj instanceof Date) {
    return obj.toISOString(); // ✅ Convert Date to ISO string
  }

  const snakeCased: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      // Convert camelCase to snake_case
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      const value = obj[key];
      
      // Recursively convert nested objects, but convert Dates to ISO strings
      if (value instanceof Date) {
        snakeCased[snakeKey] = value.toISOString(); // ✅ Convert Date to ISO string
      } else if (value !== null && value !== undefined && typeof value === 'object') {
        snakeCased[snakeKey] = toSnakeCase(value);
      } else {
        snakeCased[snakeKey] = value;
      }
    }
  }
  return snakeCased;
}

// ✅ Helper to convert snake_case to camelCase
function toCamelCase(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }

  const camelCased: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      // Convert snake_case to camelCase
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      camelCased[camelKey] = toCamelCase(obj[key]);
    }
  }
  return camelCased;
}

// Helper to make API requests
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  
  // ✅ Convert body to snake_case before sending
  let body = options.body;
  if (body && typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);
      const snakeCased = toSnakeCase(parsed);
      body = JSON.stringify(snakeCased);
    } catch (e) {
      // If not JSON, keep as is
    }
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    body,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    console.error('❌ API Error Response:', errorData);
    console.error('❌ Status:', response.status);
    console.error('❌ Endpoint:', endpoint);
    
    // Throw error with detailed message
    const errorMessage = errorData.details || errorData.message || errorData.error || `HTTP error! status: ${response.status}`;
    const error = new Error(errorMessage);
    // Attach full error data for debugging
    (error as any).details = errorData;
    throw error;
  }

  // ✅ Convert response back to camelCase
  const data = await response.json();
  return toCamelCase(data);
}

// Exportar api como objeto para manter compatibilidade
export const api = {
  // ========== USERS ==========
  users: {
    getAll: () => apiRequest('/users'),
    create: (user: any) => apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(user),
    }),
    update: (id: string, updates: any) => apiRequest(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  },

  // ========== UNITS ==========
  units: {
    getAll: () => apiRequest('/units'),
    create: (unit: any) => apiRequest('/units', {
      method: 'POST',
      body: JSON.stringify(unit),
    }),
  },

  // ========== CATEGORIES ==========
  categories: {
    getAll: () => apiRequest('/categories'),
    create: (category: any) => apiRequest('/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    }),
  },

  // ========== FLOORS ==========
  floors: {
    getAll: () => apiRequest('/floors'),
    create: (floor: any) => apiRequest('/floors', {
      method: 'POST',
      body: JSON.stringify(floor),
    }),
    update: (id: string, updates: any) => apiRequest(`/floors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
    delete: (id: string) => apiRequest(`/floors/${id}`, {
      method: 'DELETE',
    }),
  },

  // ========== ITEMS ==========
  items: {
    getAll: () => apiRequest('/items'),
    create: (item: any) => apiRequest('/items', {
      method: 'POST',
      body: JSON.stringify(item),
    }),
    update: (id: string, updates: any) => apiRequest(`/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  },

  // ========== UNIT STOCKS ==========
  unitStocks: {
    getAll: () => apiRequest('/unit-stocks'),
    create: (stock: any) => apiRequest('/unit-stocks', {
      method: 'POST',
      body: JSON.stringify(stock),
    }),
    update: (id: string, updates: any) => apiRequest(`/unit-stocks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  },

  // ========== REQUESTS ==========
  requests: {
    getAll: () => apiRequest('/requests'),
    create: (request: any) => apiRequest('/requests', {
      method: 'POST',
      body: JSON.stringify(request),
    }),
    update: (id: string, updates: any) => apiRequest(`/requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  },

  // ========== MOVEMENTS ==========
  movements: {
    getAll: () => apiRequest('/movements'),
    create: (movement: any) => apiRequest('/movements', {
      method: 'POST',
      body: JSON.stringify(movement),
    }),
  },

  // ========== LOANS ==========
  loans: {
    getAll: () => apiRequest('/loans'),
    create: (loan: any) => apiRequest('/loans', {
      method: 'POST',
      body: JSON.stringify(loan),
    }),
    update: (id: string, updates: any) => apiRequest(`/loans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  },

  // ========== FURNITURE TRANSFERS ==========
  furnitureTransfers: {
    getAll: () => apiRequest('/furniture-transfers'),
    create: (transfer: any) => apiRequest('/furniture-transfers', {
      method: 'POST',
      body: JSON.stringify(transfer),
    }),
    update: (id: string, updates: any) => apiRequest(`/furniture-transfers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  },

  // ========== FURNITURE REMOVAL REQUESTS ==========
  furnitureRemovalRequests: {
    getAll: () => apiRequest('/furniture-removal-requests'),
    create: (request: any) => apiRequest('/furniture-removal-requests', {
      method: 'POST',
      body: JSON.stringify(request),
    }),
    update: (id: string, updates: any) => apiRequest(`/furniture-removal-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  },

  // ========== FURNITURE REQUESTS TO DESIGNER ==========
  furnitureRequestsToDesigner: {
    getAll: () => apiRequest('/furniture-requests-to-designer'),
    create: (request: any) => apiRequest('/furniture-requests-to-designer', {
      method: 'POST',
      body: JSON.stringify(request),
    }),
    update: (id: string, updates: any) => apiRequest(`/furniture-requests-to-designer/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  },

  // ========== DELIVERY BATCHES ==========
  deliveryBatches: {
    getAll: () => apiRequest('/delivery-batches'),
    create: (batch: any) => apiRequest('/delivery-batches', {
      method: 'POST',
      body: JSON.stringify(batch),
    }),
    update: (id: string, updates: any) => apiRequest(`/delivery-batches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  },

  // ========== DELIVERY CONFIRMATIONS ==========
  deliveryConfirmations: {
    getAll: () => apiRequest('/delivery-confirmations'),
    create: (confirmation: any) => apiRequest('/delivery-confirmations', {
      method: 'POST',
      body: JSON.stringify(confirmation),
    }),
  },

  // ========== INDIVIDUAL ITEMS ==========
  individualItems: {
    getAll: () => apiRequest('/individual-items'),
    create: (item: any) => apiRequest('/individual-items', {
      method: 'POST',
      body: JSON.stringify(item),
    }),
    update: (id: string, updates: any) => apiRequest(`/individual-items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  },
};

// Manter exports separados para compatibilidade com código existente
export const usersApi = api.users;
export const unitsApi = api.units;
export const categoriesApi = api.categories;
export const itemsApi = api.items;
export const unitStocksApi = api.unitStocks;
export const requestsApi = api.requests;
export const movementsApi = api.movements;
export const loansApi = api.loans;
export const furnitureTransfersApi = api.furnitureTransfers;
export const furnitureRemovalRequestsApi = api.furnitureRemovalRequests;
export const furnitureRequestsToDesignerApi = api.furnitureRequestsToDesigner;
export const deliveryBatchesApi = api.deliveryBatches;
export const deliveryConfirmationsApi = api.deliveryConfirmations;
export const individualItemsApi = api.individualItems;