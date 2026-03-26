/**
 * GOWORK - Sistema de Controle de Estoque
 * Backend API Server
 * 
 * Estrutura:
 * - Hono web framework rodando no Supabase Edge Functions
 * - Todas as rotas prefixadas com /make-server-46b247d8
 * - Autenticação via Bearer token no header Authorization
 * - Supabase Client com service role (bypassa RLS)
 * 
 * Principais Endpoints:
 * - /users, /units, /categories, /items - CRUD básico
 * - /unit-stocks - Gerenciamento de estoque por unidade
 * - /movements - Histórico de movimentações (atualiza stock automaticamente)
 * - /requests - Solicitações de materiais do almoxarifado
 * - /furniture-* - Endpoints específicos para móveis
 * - /delivery-* - Sistema de entregas e confirmações
 * 
 * Lógica de Negócio:
 * - Almoxarifado Central: única unidade onde materiais regulares são cadastrados
 * - Móveis: cadastrados por unidade, podem ser transferidos
 * - Movimentos atualizam automaticamente o unit_stock correspondente
 * - Sistema de códigos únicos diários para confirmações
 */

import { Hono } from "npm:hono";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

// Create Supabase client with service role (bypasses RLS)
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});

// Enable logger
app.use('*', logger(console.log));

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// CORS hardening: responde preflight e injeta headers em TODAS as respostas
app.use("*", async (c, next) => {
  if (c.req.method === "OPTIONS") {
    return c.newResponse(null, 204, corsHeaders);
  }
  await next();
  Object.entries(corsHeaders).forEach(([key, value]) => c.header(key, value));
});

// ========== HELPER FUNCTIONS FOR CASE CONVERSION ==========
// Parse floors field from database (handles JSON string or array)
function parseFloors(floors: any): string[] {
  if (!floors) return [];
  if (Array.isArray(floors)) return floors;
  if (typeof floors === 'string') {
    try {
      const parsed = JSON.parse(floors);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** GET listagem compras: falha no banco → 200 + [] (não quebra o front). */
function purchasesListResponse(c: { json: (b: unknown) => Response }, label: string, error: unknown, rows: unknown[] | null) {
  if (error) {
    const e = error as Record<string, unknown>;
    console.error(`[${label}] GET list — erro (retornando []):`, e?.code, e?.message ?? JSON.stringify(error));
    return c.json([]);
  }
  return c.json(rows ?? []);
}

// Convert snake_case to camelCase for user objects
function userDbToApi(user: any) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    primaryUnitId: user.primary_unit_id,
    additionalUnitIds: user.additional_unit_ids,
    departmentId: user.department_id ?? null,
    warehouseType: user.warehouse_type,
    adminType: user.admin_type,
    jobTitle: user.job_title,
    createdAt: user.created_at,
  };
}

// Health check endpoint
app.get("/make-server-46b247d8/health", (c) => {
  return c.json({ status: "ok" });
});

// ========== SCHEMA INITIALIZATION ==========
app.post("/make-server-46b247d8/init-schema", async (c) => {
  try {
    // Create units table
    const { error: unitsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS units (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          address TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active',
          floors JSONB DEFAULT '[]'::jsonb,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });
    
    if (unitsError) {
      // If RPC doesn't exist, try direct SQL (may not work in all environments)
      console.log("RPC exec_sql not available, tables may need to be created manually");
    }

    // Create floors table
    const { error: floorsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS floors (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          "order" INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_floors_unit_id ON floors(unit_id);
      `
    });
    
    if (floorsError) {
      console.log("Could not create floors table via RPC");
    }

    // Check if floors column exists, if not add it
    const { data: columns } = await supabase
      .from('org_units')
      .select('*')
      .limit(0);
    
    // If we can query, the table exists
    // Try to add floors column if it doesn't exist (will fail silently if it does)
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE units 
        ADD COLUMN IF NOT EXISTS floors JSONB DEFAULT '[]'::jsonb;
      `
    });
    
    if (alterError) {
      console.log("Could not add floors column via RPC");
    }

    // Add admin_type column to users table
    const { error: adminTypeError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS admin_type TEXT;
      `
    });
    
    if (adminTypeError) {
      console.log("Could not add admin_type column via RPC (might already exist)");
    }

    return c.json({ 
      message: "Schema initialization attempted",
      note: "If tables don't exist, please create them manually in Supabase dashboard"
    });
  } catch (error) {
    console.error("Schema initialization error:", error);
    return c.json({ 
      error: "Schema initialization failed", 
      details: error.message,
      note: "Please ensure tables are created in Supabase dashboard"
    }, 500);
  }
});

// ========== SEED DATA ==========
// Initialize database with demo data
app.post("/make-server-46b247d8/seed", async (c) => {
  try {
    // Check if already seeded
    const { data: existingUnits } = await supabase.from('org_units').select('id').limit(1);
    if (existingUnits && existingUnits.length > 0) {
      return c.json({ message: "Database already seeded" });
    }

    // Seed Units
    const units = [
      { name: "Almoxarifado Central", address: "Rua do Estoque, 100", status: "active", floors: ["Térreo"] },
      { name: "Paulista 302", address: "Av. Paulista, 302", status: "active", floors: [] },
      { name: "Paulista 475", address: "Av. Paulista, 475", status: "active", floors: [] },
      { name: "Campus 1", address: "Campus 1 - Endereço", status: "active", floors: [] },
      { name: "Campus 2", address: "Campus 2 - Endereço", status: "active", floors: [] },
      { name: "Consolação", address: "Rua da Consolação", status: "active", floors: [] },
      { name: "Pinheiros 2", address: "Pinheiros 2 - Endereço", status: "active", floors: [] },
      { name: "Joaquim Antunes", address: "Rua Joaquim Antunes", status: "active", floors: [] },
      { name: "Amauri 1", address: "Rua Amauri - Unidade 1", status: "active", floors: [] },
      { name: "Amauri 2", address: "Rua Amauri - Unidade 2", status: "active", floors: [] },
      { name: "Funchal", address: "Rua Funchal", status: "active", floors: [] },
    ];

    // Seed Categories
    const categories = [
      { name: "Acessórios", description: "Cabos, adaptadores e acessórios diversos" },
      { name: "Áudio/Vídeo", description: "Equipamentos de áudio e vídeo" },
      { name: "Ferramentas", description: "Ferramentas e equipamentos" },
      { name: "Limpeza", description: "Produtos e itens de limpeza" },
      { name: "Consumíveis", description: "Café, açúcar, copos e outros itens de consumo diário" },
      { name: "Elétrica", description: "Materiais elétricos e iluminação" },
      { name: "Hidráulica", description: "Materiais para manutenção hidráulica" },
      { name: "Escritório", description: "Material de escritório e papelaria" },
      { name: "Móveis", description: "Cadeiras, mesas, armários e outros móveis" },
    ];

    const { error: unitsError } = await supabase.from('org_units').insert(units);
    if (unitsError) throw unitsError;

    const { error: categoriesError } = await supabase.from('stock_categories').insert(categories);
    if (categoriesError) throw categoriesError;

    // Create initial users in auth.users and public.users
    const initialUsers = [
      {
        email: 'dev@gowork.com',
        password: 'dev123456',
        name: 'Developer Gowork',
        role: 'developer',
        primaryUnitId: null, // Volante - sem unidade fixa
      },
      {
        email: 'admin@gowork.com',
        password: 'admin123456',
        name: 'Admin Gowork',
        role: 'admin',
        primaryUnitId: null,
      },
    ];

    let usersCreated = 0;
    for (const userData of initialUsers) {
      try {
        // Create in auth.users
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
          user_metadata: { 
            name: userData.name, 
            role: userData.role,
          },
        });

        if (authError) {
          console.error(`Error creating auth user ${userData.email}:`, authError);
          continue;
        }

        // Create in public.users
        const { error: userError } = await supabase.from('users').insert({
          id: authData.user.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          primary_unit_id: userData.primaryUnitId,
        });

        if (userError) {
          console.error(`Error creating user in database ${userData.email}:`, userError);
          continue;
        }

        usersCreated++;
      } catch (error) {
        console.error(`Error processing user ${userData.email}:`, error);
      }
    }

    return c.json({ 
      message: "Database seeded successfully", 
      units: units.length,
      categories: categories.length,
      users: usersCreated
    }, 201);
  } catch (error) {
    console.error("Error seeding database:", error);
    return c.json({ error: "Failed to seed database" }, 500);
  }
});

/**
 * POST /migrate-unit-stocks
 * Migração única para corrigir unit_id dos stocks do almoxarifado
 * 
 * Histórico:
 * - Stocks antigos tinham unit_id como string "unit-warehouse"
 * - Precisam ser atualizados para o UUID real do Almoxarifado Central
 * 
 * Este endpoint pode ser executado múltiplas vezes sem problemas (idempotente)
 */
app.post("/make-server-46b247d8/migrate-unit-stocks", async (c) => {
  try {
    console.log('🔧 Iniciando migração de unit_stocks...');
    
    // 1. Buscar o UUID real da unidade "Almoxarifado Central"
    const { data: warehouseUnit, error: warehouseError } = await supabase
      .from('org_units')
      .select('id, name')
      .eq('name', 'Almoxarifado Central')
      .single();
    
    if (warehouseError || !warehouseUnit) {
      console.error('❌ Erro ao buscar Almoxarifado Central:', warehouseError);
      return c.json({ error: 'Almoxarifado Central não encontrado' }, 404);
    }
    
    console.log('✅ Almoxarifado Central encontrado:', warehouseUnit.id);
    
    // 2. Buscar TODOS os unit_stocks (não podemos filtrar por 'unit-warehouse' porque a coluna é UUID)
    const { data: allStocks, error: fetchError } = await supabase
      .from('stock_unit_stocks')
      .select('*');
    
    if (fetchError) {
      console.error('❌ Erro ao buscar stocks:', fetchError);
      console.error('❌ Código do erro:', fetchError.code);
      console.error('❌ Mensagem do erro:', fetchError.message);
      console.error('❌ Detalhes do erro:', fetchError.details);
      return c.json({ 
        error: 'Erro ao buscar stocks',
        details: fetchError.message,
        code: fetchError.code 
      }, 500);
    }
    
    // Filtrar stocks que NÃO são UUIDs válidos (provavelmente são strings hardcoded)
    // Um UUID válido tem formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const invalidStocks = (allStocks || []).filter(stock => {
      // Se unit_id não é um UUID válido OU se for exatamente 'unit-warehouse'
      return !uuidRegex.test(stock.unit_id) || stock.unit_id === 'unit-warehouse';
    });
    
    console.log(`📦 Total de stocks: ${allStocks?.length || 0}`);
    console.log(`📦 Stocks com unit_id inválido: ${invalidStocks.length}`);
    
    if (!invalidStocks || invalidStocks.length === 0) {
      return c.json({ 
        message: 'Nenhum stock precisa de migração',
        updated: 0
      });
    }
    
    // 3. Atualizar cada stock com o UUID correto
    let updated = 0;
    for (const stock of invalidStocks) {
      const { error: updateError } = await supabase
        .from('stock_unit_stocks')
        .update({ unit_id: warehouseUnit.id })
        .eq('id', stock.id);
      
      if (updateError) {
        console.error(`❌ Erro ao atualizar stock ${stock.id}:`, updateError);
      } else {
        updated++;
        console.log(`✅ Stock ${stock.id} atualizado`);
      }
    }
    
    console.log(`✅ Migração concluída: ${updated} stocks atualizados`);
    
    return c.json({ 
      message: 'Migração concluída com sucesso',
      warehouseUnitId: warehouseUnit.id,
      totalFound: invalidStocks.length,
      updated: updated
    }, 200);
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    return c.json({ error: 'Erro na migração' }, 500);
  }
});

/**
 * POST /migrate-text-to-uuid
 * Migração para converter colunas id de TEXT para UUID nas tabelas units e floors
 * 
 * ATENÇÃO: Esta migração é irreversível e requer que:
 * 1. Todas as strings de id sejam UUIDs válidos
 * 2. Não haja foreign keys que impeçam a alteração
 * 
 * Esta migração deve ser executada APÓS corrigir todos os IDs não-UUID
 */
app.post("/make-server-46b247d8/migrate-text-to-uuid", async (c) => {
  try {
    console.log('🔧 Iniciando migração de TEXT para UUID...');
    
    // Verificar se todas as units têm IDs em formato UUID
    const { data: units, error: unitsError } = await supabase
      .from('org_units')
      .select('id, name');
    
    if (unitsError) {
      return c.json({ error: 'Erro ao buscar units', details: unitsError.message }, 500);
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const invalidUnits = (units || []).filter(unit => !uuidRegex.test(unit.id));
    
    if (invalidUnits.length > 0) {
      return c.json({ 
        error: 'Algumas units têm IDs que não são UUIDs válidos. Execute a migração de dados primeiro.',
        invalidUnits: invalidUnits.map(u => ({ id: u.id, name: u.name }))
      }, 400);
    }
    
    // Verificar floors
    const { data: floors, error: floorsError } = await supabase
      .from('floors')
      .select('id, name, unit_id');
    
    if (floorsError) {
      return c.json({ error: 'Erro ao buscar floors', details: floorsError.message }, 500);
    }
    
    const invalidFloors = (floors || []).filter(floor => 
      !uuidRegex.test(floor.id) || !uuidRegex.test(floor.unit_id)
    );
    
    if (invalidFloors.length > 0) {
      return c.json({ 
        error: 'Alguns floors têm IDs que não são UUIDs válidos. Execute a migração de dados primeiro.',
        invalidFloors: invalidFloors.map(f => ({ id: f.id, name: f.name, unit_id: f.unit_id }))
      }, 400);
    }
    
    console.log('✅ Todos os IDs já são UUIDs válidos');
    console.log('🔄 Alterando tipo das colunas...');
    
    // Nota: Esta migração precisa ser executada manualmente no SQL editor do Supabase
    // porque requer privilégios DDL que não estão disponíveis via RPC
    
    const migrationSQL = `
      -- Converter coluna id da tabela units
      ALTER TABLE units 
        ALTER COLUMN id TYPE UUID USING id::uuid;
      
      -- Converter coluna id e unit_id da tabela floors
      ALTER TABLE floors 
        ALTER COLUMN id TYPE UUID USING id::uuid,
        ALTER COLUMN unit_id TYPE UUID USING unit_id::uuid;
      
      -- Recriar foreign key se necessário
      -- ALTER TABLE floors DROP CONSTRAINT IF EXISTS floors_unit_id_fkey;
      -- ALTER TABLE floors ADD CONSTRAINT floors_unit_id_fkey 
      --   FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE;
    `;
    
    return c.json({ 
      message: 'Validação concluída com sucesso',
      note: 'Execute o SQL abaixo manualmente no Supabase SQL Editor',
      sql: migrationSQL,
      unitsChecked: units?.length || 0,
      floorsChecked: floors?.length || 0
    });
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    return c.json({ error: 'Erro na migração', details: error.message }, 500);
  }
});

// Add admin_type column to users table (for existing databases)
app.post("/make-server-46b247d8/add-admin-type-column", async (c) => {
  try {
    console.log('🔧 Adicionando coluna admin_type à tabela users...');
    
    // Try using RPC
    const { error: rpcError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_type TEXT;`
    });
    
    if (rpcError) {
      console.log('RPC não disponível, tentando método alternativo...');
      
      // Try alternative: Insert a dummy record to force schema update
      // This won't work but will help us understand the error
      return c.json({ 
        message: 'Por favor, execute o seguinte SQL manualmente no Supabase SQL Editor',
        sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_type TEXT;',
        note: 'Após executar, a coluna admin_type será adicionada à tabela users'
      });
    }
    
    return c.json({ 
      message: 'Coluna admin_type adicionada com sucesso!',
      sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_type TEXT;'
    });
  } catch (error) {
    console.error('❌ Erro ao adicionar coluna:', error);
    return c.json({ 
      error: 'Erro ao adicionar coluna',
      message: 'Por favor, execute o seguinte SQL manualmente no Supabase SQL Editor',
      sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_type TEXT;'
    }, 500);
  }
});

// ========== AUTHENTICATION ==========
// Sign up - Create new user with Supabase Auth
app.post("/make-server-46b247d8/auth/signup", async (c) => {
  try {
    const { email, password, name, role, primaryUnitId, additionalUnitIds, warehouseType, adminType, jobTitle } = await c.req.json();
    
    if (!email || !password || !name || !role) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // Check if user already exists in public.users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return c.json({ error: "User already exists" }, 400);
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role, primaryUnitId, additionalUnitIds, warehouseType, adminType, jobTitle },
    });

    if (authError) {
      console.error("Error creating auth user:", authError);
      
      // If user already exists in auth.users, try to retrieve it and sync to public.users
      if (authError.message?.includes('email_exists') || authError.code === 'email_exists') {
        console.log("User exists in auth.users, attempting to sync...");
        
        // Try to sign in to get the user ID
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (signInError || !signInData.user) {
          return c.json({ error: "User exists but password doesn't match. Please use a different email or reset your password." }, 400);
        }
        
        // Create user in database with the existing auth ID
        const { data: userData, error: userError } = await supabase.from('users').insert({
          id: signInData.user.id,
          email,
          name,
          role,
          primary_unit_id: primaryUnitId || null,
          additional_unit_ids: additionalUnitIds || null,
          warehouse_type: warehouseType || null,
          admin_type: adminType || null,
          job_title: jobTitle || null,
        }).select().single();

        if (userError) {
          console.error("Error syncing user to database:", userError);
          return c.json({ error: "User exists in auth but failed to sync to database" }, 400);
        }

        return c.json({ user: userData, message: "User synced successfully" }, 201);
      }
      
      return c.json({ error: authError.message }, 400);
    }

    // Create user in database
    const { data: userData, error: userError } = await supabase.from('users').insert({
      id: authData.user.id,
      email,
      name,
      role,
      primary_unit_id: primaryUnitId || null,
      additional_unit_ids: additionalUnitIds || null,
      warehouse_type: warehouseType || null,
      admin_type: adminType || null,
      job_title: jobTitle || null,
    }).select().single();

    if (userError) {
      console.error("Error creating user in database:", userError);
      return c.json({ error: userError.message }, 400);
    }

    return c.json({ user: userData, message: "User created successfully" }, 201);
  } catch (error) {
    console.error("Error during signup:", error);
    return c.json({ error: "Failed to create user" }, 500);
  }
});

// Sign in - Authenticate user
app.post("/make-server-46b247d8/auth/signin", async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: "Email e senha são obrigatórios" }, 400);
    }

    // Authenticate with Supabase Auth (auth.users table)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Log com mais contexto mas sem logar todo o erro (pode conter informações sensíveis)
      console.error("❌ Error signing in - Code:", error.code, "- User:", email);
      
      // Return specific error messages based on error code
      if (error.message.includes('Invalid login credentials') || error.code === 'invalid_credentials') {
        return c.json({ error: "Email ou senha incorretos" }, 401);
      }
      if (error.message.includes('Email not confirmed')) {
        return c.json({ error: "Email não confirmado" }, 401);
      }
      if (error.message.includes('User not found')) {
        return c.json({ error: "Usuário não encontrado" }, 401);
      }
      
      return c.json({ error: error.message || "Erro ao fazer login. Verifique suas credenciais." }, 401);
    }

    if (!data.session || !data.user) {
      return c.json({ error: "Não foi possível criar a sessão" }, 401);
    }

    // Get user data from public.users table (support table)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    if (userError) {
      console.error("Error fetching user from database:", userError);
      return c.json({ error: "Failed to fetch user data: " + userError.message }, 500);
    }

    // If user doesn't exist in public.users, create it automatically (migration/sync)
    if (!userData) {
      console.log("User exists in auth.users but not in public.users, creating record...");
      const metadata = data.user.user_metadata || {};
      
      const newUserData = {
        id: data.user.id,
        email: data.user.email || email,
        name: metadata.name || data.user.email?.split('@')[0] || 'User',
        role: metadata.role || 'requester',
        primary_unit_id: metadata.primaryUnitId || null,
        warehouse_type: metadata.warehouseType || null,
      };

      const { data: createdUser, error: createError } = await supabase
        .from('users')
        .insert(newUserData)
        .select()
        .maybeSingle();

      if (createError) {
        console.error("Error creating user in public.users:", createError);
        // Even if fails to create in public.users, return basic auth data
        return c.json({ 
          user: userDbToApi(newUserData),
          session: {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          },
          warning: "User authenticated but failed to sync with database"
        });
      }
      
      console.log("User successfully synced to public.users");
      return c.json({ 
        user: userDbToApi(createdUser || newUserData),
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        },
      });
    }

    // User found in both tables, return normally with camelCase transformation
    return c.json({ 
      user: userDbToApi(userData),
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
    });
  } catch (error) {
    console.error("Error during signin:", error);
    return c.json({ error: "Failed to sign in" }, 500);
  }
});

// Get current user session
app.get("/make-server-46b247d8/auth/session", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "No authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error) {
      return c.json({ error: error.message }, 401);
    }

    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    return c.json({ user: userDbToApi(userData), session: { access_token: token } });
  } catch (error) {
    console.error("Error getting session:", error);
    return c.json({ error: "Failed to get session" }, 500);
  }
});

// Sign out
app.post("/make-server-46b247d8/auth/signout", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ message: "Already signed out" });
    }

    const token = authHeader.replace("Bearer ", "");
    
    await supabase.auth.admin.signOut(token);

    return c.json({ message: "Signed out successfully" });
  } catch (error) {
    console.error("Error signing out:", error);
    return c.json({ error: "Failed to sign out" }, 500);
  }
});

// Update password - for forced password changes
app.post("/make-server-46b247d8/auth/update-password", async (c) => {
  try {
    const { userId, newPassword } = await c.req.json();
    
    if (!userId || !newPassword) {
      return c.json({ error: "userId e newPassword são obrigatórios" }, 400);
    }

    if (newPassword.length < 6) {
      return c.json({ error: "A senha deve ter no mínimo 6 caracteres" }, 400);
    }

    // Update password in auth.users
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return c.json({ error: updateError.message }, 400);
    }

    // Clear the requirePasswordChange flag in public.users
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({ 
        require_password_change: false,
        first_login: false 
      })
      .eq('id', userId);

    if (userUpdateError) {
      console.error("Error clearing password change flag:", userUpdateError);
      // Don't fail the request if this fails - password was already changed
    }

    return c.json({ 
      message: "Senha atualizada com sucesso",
      user: updateData.user 
    });
  } catch (error) {
    console.error("Error during password update:", error);
    return c.json({ error: "Erro ao atualizar senha" }, 500);
  }
});

// Clear password change flags (called after Supabase Auth password reset)
app.post("/make-server-46b247d8/auth/clear-password-flags", async (c) => {
  try {
    const { userId } = await c.req.json();
    
    if (!userId) {
      return c.json({ error: "userId é obrigatório" }, 400);
    }

    // Clear the password change flags in public.users
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({ 
        require_password_change: false,
        first_login: false,
        reset_token: null,
        reset_token_expiry: null
      })
      .eq('id', userId);

    if (userUpdateError) {
      console.error("Error clearing password flags:", userUpdateError);
      return c.json({ error: "Erro ao limpar flags de senha" }, 500);
    }

    return c.json({ 
      message: "Flags de senha limpos com sucesso"
    });
  } catch (error) {
    console.error("Error clearing password flags:", error);
    return c.json({ error: "Erro ao limpar flags" }, 500);
  }
});

// Request password reset - generates a reset token
app.post("/make-server-46b247d8/auth/request-password-reset", async (c) => {
  try {
    const { email } = await c.req.json();
    
    if (!email) {
      return c.json({ error: "Email é obrigatório" }, 400);
    }

    // Find user by email in public.users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (userError) {
      console.error("Error finding user:", userError);
      return c.json({ error: "Erro ao buscar usuário" }, 500);
    }

    if (!userData) {
      // Don't reveal if email exists or not for security
      return c.json({ error: "Se o email estiver cadastrado, um link de recuperação será gerado" }, 404);
    }

    // Generate a UUID token for the reset link
    const resetToken = crypto.randomUUID();
    const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Store reset token in public.users
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        reset_token: resetToken,
        reset_token_expiry: resetTokenExpiry.toISOString()
      })
      .eq('id', userData.id);

    if (updateError) {
      console.error("Error storing reset token:", updateError);
      return c.json({ error: "Erro ao gerar link de recuperação" }, 500);
    }

    return c.json({ 
      message: "Link de recuperação gerado",
      resetToken,
      userId: userData.id,
      expiresAt: resetTokenExpiry.toISOString()
    });
  } catch (error) {
    console.error("Error during password reset request:", error);
    return c.json({ error: "Erro ao solicitar recuperação de senha" }, 500);
  }
});

// Validate reset token
app.post("/make-server-46b247d8/auth/validate-reset-token", async (c) => {
  try {
    const { token } = await c.req.json();
    
    if (!token) {
      return c.json({ error: "Token é obrigatório" }, 400);
    }

    // Find user with this token
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('reset_token', token)
      .maybeSingle();

    if (userError) {
      console.error("Error finding user:", userError);
      return c.json({ error: "Erro ao validar token" }, 500);
    }

    if (!userData) {
      return c.json({ error: "Token inválido" }, 400);
    }

    // Check if token is expired
    const tokenExpiry = new Date(userData.reset_token_expiry);
    if (tokenExpiry < new Date()) {
      return c.json({ error: "Token expirado. Solicite um novo link de recuperação." }, 400);
    }

    return c.json({ 
      message: "Token válido",
      email: userData.email,
      userId: userData.id
    });
  } catch (error) {
    console.error("Error validating token:", error);
    return c.json({ error: "Erro ao validar token" }, 500);
  }
});

// Reset password using token
app.post("/make-server-46b247d8/auth/reset-password-with-token", async (c) => {
  try {
    const { token, newPassword } = await c.req.json();
    
    if (!token || !newPassword) {
      return c.json({ error: "Token e nova senha são obrigatórios" }, 400);
    }

    if (newPassword.length < 6) {
      return c.json({ error: "A senha deve ter no mínimo 6 caracteres" }, 400);
    }

    // Find user and verify token
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('reset_token', token)
      .maybeSingle();

    if (userError) {
      console.error("Error finding user:", userError);
      return c.json({ error: "Erro ao buscar usuário" }, 500);
    }

    if (!userData) {
      return c.json({ error: "Token inválido" }, 400);
    }

    // Check if token is expired
    const tokenExpiry = new Date(userData.reset_token_expiry);
    if (tokenExpiry < new Date()) {
      return c.json({ error: "Token expirado. Solicite um novo link de recuperação." }, 400);
    }

    // Update password in auth.users
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userData.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return c.json({ error: updateError.message }, 400);
    }

    // Clear reset token and flags
    const { error: clearError } = await supabase
      .from('users')
      .update({ 
        reset_token: null,
        reset_token_expiry: null,
        require_password_change: false,
        first_login: false
      })
      .eq('id', userData.id);

    if (clearError) {
      console.error("Error clearing reset token:", clearError);
      // Don't fail - password was already updated
    }

    return c.json({ 
      message: "Senha redefinida com sucesso"
    });
  } catch (error) {
    console.error("Error during password reset:", error);
    return c.json({ error: "Erro ao redefinir senha" }, 500);
  }
});

// Reset password using token (deprecated - kept for compatibility)
app.post("/make-server-46b247d8/auth/reset-password", async (c) => {
  try {
    const { email, resetToken, newPassword } = await c.req.json();
    
    if (!email || !resetToken || !newPassword) {
      return c.json({ error: "Email, código e nova senha são obrigatórios" }, 400);
    }

    if (newPassword.length < 6) {
      return c.json({ error: "A senha deve ter no mínimo 6 caracteres" }, 400);
    }

    // Find user and verify token
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('reset_token', resetToken)
      .maybeSingle();

    if (userError) {
      console.error("Error finding user:", userError);
      return c.json({ error: "Erro ao buscar usuário" }, 500);
    }

    if (!userData) {
      return c.json({ error: "Código de recuperação inválido" }, 400);
    }

    // Check if token is expired
    const tokenExpiry = new Date(userData.reset_token_expiry);
    if (tokenExpiry < new Date()) {
      return c.json({ error: "Código de recuperação expirado. Solicite um novo código." }, 400);
    }

    // Update password in auth.users
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userData.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return c.json({ error: updateError.message }, 400);
    }

    // Clear reset token and flags
    const { error: clearError } = await supabase
      .from('users')
      .update({ 
        reset_token: null,
        reset_token_expiry: null,
        require_password_change: false,
        first_login: false
      })
      .eq('id', userData.id);

    if (clearError) {
      console.error("Error clearing reset token:", clearError);
      // Don't fail - password was already updated
    }

    return c.json({ 
      message: "Senha redefinida com sucesso"
    });
  } catch (error) {
    console.error("Error during password reset:", error);
    return c.json({ error: "Erro ao redefinir senha" }, 500);
  }
});

// ========== USERS ==========
app.get("/make-server-46b247d8/users", async (c) => {
  try {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    // Transform snake_case to camelCase
    const transformedData = (data || []).map(userDbToApi);
    return c.json(transformedData);
  } catch (error) {
    console.error("Error fetching users:", error);
    return c.json({ error: "Failed to fetch users" }, 500);
  }
});

app.post("/make-server-46b247d8/users", async (c) => {
  try {
    const newUser = await c.req.json();
    // Remove temporary ID from frontend before inserting
    const { id, ...userData } = newUser;
    const { data, error } = await supabase.from('users').insert(userData).select().single();
    if (error) throw error;
    return c.json(userDbToApi(data), 201);
  } catch (error) {
    console.error("Error creating user:", error);
    return c.json({ error: "Failed to create user" }, 500);
  }
});

app.put("/make-server-46b247d8/users/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    // Aceitar snake_case (enviado pelo api.ts) ou camelCase
    const name = body.name;
    const email = body.email;
    const role = body.role;
    const primaryUnitId = body.primary_unit_id ?? body.primaryUnitId;
    const additionalUnitIds = body.additional_unit_ids ?? body.additionalUnitIds;
    const warehouseType = body.warehouse_type ?? body.warehouseType;
    const adminType = body.admin_type ?? body.adminType;
    const jobTitle = body.job_title ?? body.jobTitle;
    const password = body.password;
    const dailyCode = body.daily_code ?? body.dailyCode;
    const dailyCodeGeneratedAt = body.daily_code_generated_at ?? body.dailyCodeGeneratedAt;

    const uuidOrNull = (v: unknown) =>
      typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
    const departmentIdInBody = 'department_id' in body || 'departmentId' in body;
    const departmentIdRaw = body.department_id ?? body.departmentId;
    const primaryUnitIdForDb =
      primaryUnitId !== undefined ? uuidOrNull(primaryUnitId) : undefined;
    const additionalUnitIdsForDb =
      additionalUnitIds !== undefined
        ? Array.isArray(additionalUnitIds)
          ? additionalUnitIds.filter((id: string) => id && String(id).trim() !== '')
          : additionalUnitIds
        : undefined;

    const dbUpdates: any = {};
    if (name !== undefined) dbUpdates.name = name;
    if (email !== undefined) dbUpdates.email = email;
    if (role !== undefined) dbUpdates.role = role;
    if (primaryUnitIdForDb !== undefined) dbUpdates.primary_unit_id = primaryUnitIdForDb;
    if (additionalUnitIdsForDb !== undefined) dbUpdates.additional_unit_ids = additionalUnitIdsForDb;
    if (warehouseType !== undefined) dbUpdates.warehouse_type = warehouseType;
    if (adminType !== undefined) dbUpdates.admin_type = adminType;
    if (jobTitle !== undefined) dbUpdates.job_title = jobTitle;
    if (dailyCode !== undefined) dbUpdates.daily_code = dailyCode;
    if (dailyCodeGeneratedAt !== undefined) dbUpdates.daily_code_generated_at = dailyCodeGeneratedAt;
    if (departmentIdInBody) dbUpdates.department_id = uuidOrNull(departmentIdRaw);

    if (Object.keys(dbUpdates).length === 0) {
      return c.json({ error: "Nenhum campo para atualizar" }, 400);
    }

    const { data: userData, error: dbError } = await supabase
      .from('users')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .maybeSingle();
    
    if (dbError) {
      console.error("Error updating user in database:", dbError);
      return c.json({ error: dbError.message }, 500);
    }
    if (!userData) {
      return c.json({ error: "Usuário não encontrado" }, 404);
    }

    // Update auth.users metadata and password
    const authUpdates: any = {
      user_metadata: {
        name: name || userData.name,
        role: role || userData.role,
        primaryUnitId: primaryUnitIdForDb !== undefined ? primaryUnitIdForDb : userData.primary_unit_id,
        additionalUnitIds: additionalUnitIdsForDb !== undefined ? additionalUnitIdsForDb : userData.additional_unit_ids,
        warehouseType: warehouseType !== undefined ? warehouseType : userData.warehouse_type,
        adminType: adminType !== undefined ? adminType : userData.admin_type,
        jobTitle: jobTitle || null,
        departmentId: userData.department_id ?? null,
      }
    };
    
    // Update email if provided
    if (email && email !== userData.email) {
      authUpdates.email = email;
      authUpdates.email_confirm = true; // Auto-confirm since we don't have email server
    }
    
    // Update password if provided
    if (password) {
      authUpdates.password = password;
    }
    
    const { error: authError } = await supabase.auth.admin.updateUserById(id, authUpdates);
    
    if (authError) {
      console.error("Error updating user auth metadata:", authError);
      // Don't fail the request if metadata update fails, just log it
      return c.json({ 
        ...userDbToApi(userData), 
        warning: "User updated but auth metadata sync failed" 
      });
    }
    
    return c.json({ 
      ...userDbToApi(userData), 
      message: "User updated successfully" 
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return c.json({ error: "Failed to update user" }, 500);
  }
});

app.delete("/make-server-46b247d8/users/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    // Delete from auth.users first (this will cascade to public.users if FK is set properly)
    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    if (authError) {
      console.error("Error deleting user from auth.users:", authError);
      // Continue anyway to try deleting from public.users
    }
    
    // Delete from public.users
    const { error: dbError } = await supabase.from('users').delete().eq('id', id);
    if (dbError) {
      console.error("Error deleting user from public.users:", dbError);
      return c.json({ error: "Failed to delete user from database" }, 500);
    }
    
    return c.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return c.json({ error: "Failed to delete user" }, 500);
  }
});

// Change password (authenticated user)
app.post("/make-server-46b247d8/auth/change-password", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "No authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { newPassword } = await c.req.json();
    
    if (!newPassword || newPassword.length < 6) {
      return c.json({ error: "Password must be at least 6 characters" }, 400);
    }

    // Update password for the authenticated user
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (error) {
      console.error("Error changing password:", error);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error during password change:", error);
    return c.json({ error: "Failed to change password" }, 500);
  }
});

// Admin: Reset user password directly
app.post("/make-server-46b247d8/auth/admin-reset-password", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "No authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: adminUser }, error: adminError } = await supabase.auth.getUser(token);
    
    if (adminError || !adminUser) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Check if user is admin or developer
    const { data: adminData } = await supabase
      .from('users')
      .select('role')
      .eq('id', adminUser.id)
      .single();

    if (!adminData || !['admin', 'developer'].includes(adminData.role)) {
      return c.json({ error: "Forbidden: Admin or Developer role required" }, 403);
    }

    const { userId, newPassword } = await c.req.json();
    
    if (!userId || !newPassword || newPassword.length < 6) {
      return c.json({ error: "User ID and password (min 6 chars) required" }, 400);
    }

    // Update password for specified user
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      console.error("Error resetting user password:", error);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error during admin password reset:", error);
    return c.json({ error: "Failed to reset password" }, 500);
  }
});

// ========== UNITS ==========
app.get("/make-server-46b247d8/units", async (c) => {
  try {
    const { data, error } = await supabase.from('org_units').select('*');
    if (error) throw error;
    
    // Parse floors (handles JSON string or array)
    const unitsWithFloors = (data || []).map(unit => ({
      ...unit,
      floors: parseFloors(unit.floors)
    }));
    
    return c.json(unitsWithFloors);
  } catch (error) {
    console.error("Error fetching units:", error);
    return c.json({ error: "Failed to fetch units" }, 500);
  }
});

app.post("/make-server-46b247d8/units", async (c) => {
  try {
    const newUnit = await c.req.json();
    
    // Remove temporary ID from frontend before inserting
    const { id, ...unitData } = newUnit;
    
    // Ensure floors is an array
    const unitToInsert = {
      ...unitData,
      floors: Array.isArray(unitData.floors) ? unitData.floors : []
    };
    
    const { data, error } = await supabase.from('org_units').insert(unitToInsert).select().single();
    if (error) throw error;
    
    // Parse floors from database response
    const responseData = {
      ...data,
      floors: parseFloors(data.floors)
    };
    
    return c.json(responseData, 201);
  } catch (error) {
    console.error("Error creating unit:", error);
    return c.json({ error: "Failed to create unit" }, 500);
  }
});

app.put("/make-server-46b247d8/units/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    
    // Ensure floors is an array if it's being updated
    const updatesToApply = {
      ...updates,
      ...(updates.floors !== undefined && { floors: Array.isArray(updates.floors) ? updates.floors : [] })
    };
    
    const { data, error } = await supabase
      .from('org_units')
      .update(updatesToApply)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Parse floors from database response
    const responseData = {
      ...data,
      floors: parseFloors(data.floors)
    };
    
    return c.json(responseData);
  } catch (error) {
    console.error("Error updating unit:", error);
    return c.json({ error: "Failed to update unit" }, 500);
  }
});

// ========== CATEGORIES ==========
app.get("/make-server-46b247d8/categories", async (c) => {
  try {
    const { data, error } = await supabase.from('stock_categories').select('*');
    if (error) throw error;
    return c.json(data || []);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return c.json({ error: "Failed to fetch categories" }, 500);
  }
});

app.post("/make-server-46b247d8/categories", async (c) => {
  try {
    const newCategory = await c.req.json();
    // Remove temporary ID from frontend before inserting
    const { id, ...categoryData } = newCategory;
    const { data, error } = await supabase.from('stock_categories').insert(categoryData).select().single();
    if (error) throw error;
    return c.json(data, 201);
  } catch (error) {
    console.error("Error creating category:", error);
    return c.json({ error: "Failed to create category" }, 500);
  }
});

// ========== FLOORS ==========
app.get("/make-server-46b247d8/floors", async (c) => {
  try {
    const { data, error } = await supabase.from('floors').select('*').order('order', { ascending: true });
    if (error) throw error;
    return c.json(data || []);
  } catch (error) {
    console.error("Error fetching floors:", error);
    return c.json({ error: "Failed to fetch floors" }, 500);
  }
});

app.post("/make-server-46b247d8/floors", async (c) => {
  try {
    const newFloor = await c.req.json();
    // Remove temporary ID from frontend before inserting
    const { id, ...floorData } = newFloor;
    const { data, error } = await supabase.from('floors').insert(floorData).select().single();
    if (error) throw error;
    return c.json(data, 201);
  } catch (error) {
    console.error("Error creating floor:", error);
    return c.json({ error: "Failed to create floor", details: error.message }, 500);
  }
});

app.put("/make-server-46b247d8/floors/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    const { data, error } = await supabase
      .from('floors')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    console.error("Error updating floor:", error);
    return c.json({ error: "Failed to update floor" }, 500);
  }
});

app.delete("/make-server-46b247d8/floors/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const { error } = await supabase.from('floors').delete().eq('id', id);
    if (error) throw error;
    return c.json({ message: "Floor deleted successfully" });
  } catch (error) {
    console.error("Error deleting floor:", error);
    return c.json({ error: "Failed to delete floor" }, 500);
  }
});

// ========== ITEMS ==========
app.get("/make-server-46b247d8/items", async (c) => {
  try {
    const { data, error } = await supabase.from('stock_items').select('*');
    if (error) throw error;
    console.log(`✅ Retornando ${data?.length || 0} items`);
    return c.json(data || []);
  } catch (error) {
    console.error("Error fetching items:", error);
    return c.json({ error: "Failed to fetch items" }, 500);
  }
});

app.post("/make-server-46b247d8/items", async (c) => {
  try {
    const newItem = await c.req.json();
    console.log('📦 POST /items - Item recebido:', JSON.stringify(newItem, null, 2));
    console.log('📦 Chaves do objeto:', Object.keys(newItem));
    // Remove temporary ID from frontend before inserting
    const { id, ...itemData } = newItem;
    const { data, error } = await supabase.from('stock_items').insert(itemData).select().single();
    if (error) {
      console.error("❌ Error creating item:", error);
      throw error;
    }
    console.log('✅ Item criado com sucesso:', data.id);
    return c.json(data, 201);
  } catch (error) {
    console.error("Error creating item:", error);
    return c.json({ error: "Failed to create item" }, 500);
  }
});

app.put("/make-server-46b247d8/items/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    const { data, error } = await supabase.from('stock_items').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    console.error("Error updating item:", error);
    return c.json({ error: "Failed to update item" }, 500);
  }
});

// ========== UNIT STOCKS ==========
app.get("/make-server-46b247d8/unit-stocks", async (c) => {
  try {
    console.log('📦 GET /unit-stocks - Buscando todos os stocks...');
    const { data, error } = await supabase.from('stock_unit_stocks').select('*');
    if (error) throw error;
    
    // Transformar snake_case para camelCase
    const transformedData = (data || []).map(stock => ({
      id: stock.id,
      itemId: stock.item_id,
      unitId: stock.unit_id,
      quantity: stock.quantity,
      minimumQuantity: stock.minimum_quantity,
      location: stock.location,
    }));
    
    console.log(`✅ Retornando ${transformedData.length} stocks transformados`);
    console.log('📦 Exemplo de stock transformado:', transformedData[0]);
    return c.json(transformedData);
  } catch (error) {
    console.error("Error fetching unit stocks:", error);
    return c.json({ error: "Failed to fetch unit stocks" }, 500);
  }
});

app.post("/make-server-46b247d8/unit-stocks", async (c) => {
  try {
    const newStock = await c.req.json();
    
    console.log('📦 POST /unit-stocks - Stock recebido:', JSON.stringify(newStock, null, 2));
    console.log('📦 Chaves do objeto:', Object.keys(newStock));
    
    // ✅ Aceitar tanto camelCase quanto snake_case
    // Remove temporary ID from frontend before inserting
    const itemId = newStock.item_id || newStock.itemId;
    const unitId = newStock.unit_id || newStock.unitId;
    
    // Validar campos obrigatórios
    if (!itemId || itemId === 'undefined' || itemId === 'null') {
      console.error('❌ item_id inválido:', itemId);
      throw new Error('item_id é obrigatório e deve ser um UUID válido');
    }
    
    if (!unitId || unitId === 'undefined' || unitId === 'null') {
      console.error('❌ unit_id inválido:', unitId);
      throw new Error('unit_id é obrigatório e deve ser um UUID válido');
    }
    
    const dbStock = {
      item_id: itemId,
      unit_id: unitId,
      quantity: newStock.quantity || 0,
      minimum_quantity: newStock.minimum_quantity || newStock.minimumQuantity || 0,
      location: newStock.location || '',
    };
    
    console.log('📦 Stock no formato DB (final):', JSON.stringify(dbStock, null, 2));
    
    const { data, error } = await supabase.from('stock_unit_stocks').insert(dbStock).select().single();
    if (error) {
      console.error('❌ Erro do Supabase ao inserir stock:', error);
      throw error;
    }
    
    console.log('✅ Stock criado com sucesso:', data);
    
    // Transformar de volta para camelCase
    const transformedData = {
      id: data.id,
      itemId: data.item_id,
      unitId: data.unit_id,
      quantity: data.quantity,
      minimumQuantity: data.minimum_quantity,
      location: data.location,
    };
    
    return c.json(transformedData, 201);
  } catch (error) {
    console.error("❌ Error creating unit stock:", error);
    return c.json({ 
      error: "Failed to create unit stock",
      details: error.message || String(error)
    }, 500);
  }
});

app.put("/make-server-46b247d8/unit-stocks/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    
    // Data is already in snake_case from api.ts toSnakeCase() helper
    // Accept both formats for compatibility
    const dbUpdates: any = {};
    if (updates.item_id !== undefined) dbUpdates.item_id = updates.item_id;
    else if (updates.itemId !== undefined) dbUpdates.item_id = updates.itemId;
    
    if (updates.unit_id !== undefined) dbUpdates.unit_id = updates.unit_id;
    else if (updates.unitId !== undefined) dbUpdates.unit_id = updates.unitId;
    
    if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
    
    if (updates.minimum_quantity !== undefined) dbUpdates.minimum_quantity = updates.minimum_quantity;
    else if (updates.minimumQuantity !== undefined) dbUpdates.minimum_quantity = updates.minimumQuantity;
    
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    
    const { data, error } = await supabase.from('stock_unit_stocks').update(dbUpdates).eq('id', id).select().single();
    if (error) throw error;
    
    // Transformar de volta para camelCase
    const transformedData = {
      id: data.id,
      itemId: data.item_id,
      unitId: data.unit_id,
      quantity: data.quantity,
      minimumQuantity: data.minimum_quantity,
      location: data.location,
    };
    
    return c.json(transformedData);
  } catch (error) {
    console.error("Error updating unit stock:", error);
    return c.json({ error: "Failed to update unit stock" }, 500);
  }
});

// ========== REQUESTS ==========
app.get("/make-server-46b247d8/requests", async (c) => {
  try {
    const { data, error } = await supabase.from('stock_requests').select('*');
    if (error) throw error;
    
    // Transform snake_case to camelCase for frontend
    const transformedData = (data || []).map((row: any) => ({
      id: row.id,
      itemId: row.item_id,
      requestingUnitId: row.requesting_unit_id,
      requestedByUserId: row.requested_by_user_id,
      quantity: row.quantity,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
      approvedByUserId: row.approved_by_user_id,
      approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
      pickupReadyByUserId: row.pickup_ready_by_user_id,
      pickupReadyAt: row.pickup_ready_at ? new Date(row.pickup_ready_at) : undefined,
      pickedUpByUserId: row.picked_up_by_user_id,
      pickedUpAt: row.picked_up_at ? new Date(row.picked_up_at) : undefined,
      completedByUserId: row.completed_by_user_id,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      rejectedReason: row.rejected_reason,
      observations: row.observations,
      urgency: row.urgency,
    }));
    
    return c.json(transformedData);
  } catch (error) {
    console.error("Error fetching requests:", error);
    return c.json({ error: "Failed to fetch requests" }, 500);
  }
});

app.post("/make-server-46b247d8/requests", async (c) => {
  try {
    const requestData = await c.req.json();
    console.log("📝 Creating new request - RAW DATA:", JSON.stringify(requestData, null, 2));
    
    // Data is already in snake_case from api.ts toSnakeCase() helper
    // Just use it directly, ensuring required fields are present
    const dbRequest = {
      item_id: requestData.item_id,
      requesting_unit_id: requestData.requesting_unit_id,
      requested_by_user_id: requestData.requested_by_user_id,
      quantity: requestData.quantity,
      status: requestData.status || 'pending',
      urgency: requestData.urgency || 'medium',
      observations: requestData.observations,
      // Don't send created_at or updated_at - database will auto-generate
    };
    
    console.log("📝 Prepared for DB insert:", JSON.stringify(dbRequest, null, 2));
    
    const { data, error } = await supabase.from('stock_requests').insert(dbRequest).select().single();
    
    if (error) {
      console.error("❌ Supabase error creating request:", error);
      console.error("❌ Error message:", error.message);
      console.error("❌ Error code:", error.code);
      console.error("❌ Error details:", JSON.stringify(error, null, 2));
      throw error;
    }
    
    console.log("✅ Request created successfully in DB:", data.id);
    
    // Transform response back to camelCase
    const transformedData = {
      id: data.id,
      itemId: data.item_id,
      requestingUnitId: data.requesting_unit_id,
      requestedByUserId: data.requested_by_user_id,
      quantity: data.quantity,
      status: data.status,
      createdAt: new Date(data.created_at),
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
      approvedByUserId: data.approved_by_user_id,
      approvedAt: data.approved_at ? new Date(data.approved_at) : undefined,
      pickupReadyByUserId: data.pickup_ready_by_user_id,
      pickupReadyAt: data.pickup_ready_at ? new Date(data.pickup_ready_at) : undefined,
      pickedUpByUserId: data.picked_up_by_user_id,
      pickedUpAt: data.picked_up_at ? new Date(data.picked_up_at) : undefined,
      completedByUserId: data.completed_by_user_id,
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      rejectedReason: data.rejected_reason,
      observations: data.observations,
      urgency: data.urgency,
    };
    
    console.log("✅ Returning transformed request to frontend:", transformedData.id);
    return c.json(transformedData, 201);
  } catch (error) {
    console.error("❌ Error creating request:", error);
    console.error("❌ Error message:", error.message);
    console.error("❌ Error stack:", error.stack);
    return c.json({ 
      error: "Failed to create request",
      details: error.message,
      hint: error.hint || "Check server logs for more details"
    }, 500);
  }
});

app.put("/make-server-46b247d8/requests/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    
    // Data is already in snake_case from api.ts toSnakeCase() helper
    // Accept both formats for compatibility
    const dbUpdates: any = {};
    
    // Accept both snake_case (from API) and camelCase (legacy)
    if (updates.item_id !== undefined) dbUpdates.item_id = updates.item_id;
    else if (updates.itemId !== undefined) dbUpdates.item_id = updates.itemId;
    
    if (updates.requesting_unit_id !== undefined) dbUpdates.requesting_unit_id = updates.requesting_unit_id;
    else if (updates.requestingUnitId !== undefined) dbUpdates.requesting_unit_id = updates.requestingUnitId;
    
    if (updates.requested_by_user_id !== undefined) dbUpdates.requested_by_user_id = updates.requested_by_user_id;
    else if (updates.requestedByUserId !== undefined) dbUpdates.requested_by_user_id = updates.requestedByUserId;
    
    if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.urgency !== undefined) dbUpdates.urgency = updates.urgency;
    if (updates.observations !== undefined) dbUpdates.observations = updates.observations;
    
    if (updates.approved_by_user_id !== undefined) dbUpdates.approved_by_user_id = updates.approved_by_user_id;
    else if (updates.approvedByUserId !== undefined) dbUpdates.approved_by_user_id = updates.approvedByUserId;
    
    if (updates.approved_at !== undefined) dbUpdates.approved_at = updates.approved_at;
    else if (updates.approvedAt !== undefined) dbUpdates.approved_at = updates.approvedAt;
    
    if (updates.pickup_ready_by_user_id !== undefined) dbUpdates.pickup_ready_by_user_id = updates.pickup_ready_by_user_id;
    else if (updates.pickupReadyByUserId !== undefined) dbUpdates.pickup_ready_by_user_id = updates.pickupReadyByUserId;
    
    if (updates.pickup_ready_at !== undefined) dbUpdates.pickup_ready_at = updates.pickup_ready_at;
    else if (updates.pickupReadyAt !== undefined) dbUpdates.pickup_ready_at = updates.pickupReadyAt;
    
    if (updates.picked_up_by_user_id !== undefined) dbUpdates.picked_up_by_user_id = updates.picked_up_by_user_id;
    else if (updates.pickedUpByUserId !== undefined) dbUpdates.picked_up_by_user_id = updates.pickedUpByUserId;
    
    if (updates.picked_up_at !== undefined) dbUpdates.picked_up_at = updates.picked_up_at;
    else if (updates.pickedUpAt !== undefined) dbUpdates.picked_up_at = updates.pickedUpAt;
    
    if (updates.completed_by_user_id !== undefined) dbUpdates.completed_by_user_id = updates.completed_by_user_id;
    else if (updates.completedByUserId !== undefined) dbUpdates.completed_by_user_id = updates.completedByUserId;
    
    if (updates.completed_at !== undefined) dbUpdates.completed_at = updates.completed_at;
    else if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;
    
    if (updates.rejected_reason !== undefined) dbUpdates.rejected_reason = updates.rejected_reason;
    else if (updates.rejectedReason !== undefined) dbUpdates.rejected_reason = updates.rejectedReason;
    
    const { data, error } = await supabase.from('stock_requests').update(dbUpdates).eq('id', id).select().single();
    if (error) throw error;
    
    // Transform response back to camelCase
    const transformedData = {
      id: data.id,
      itemId: data.item_id,
      requestingUnitId: data.requesting_unit_id,
      requestedByUserId: data.requested_by_user_id,
      quantity: data.quantity,
      status: data.status,
      createdAt: new Date(data.created_at),
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
      approvedByUserId: data.approved_by_user_id,
      approvedAt: data.approved_at ? new Date(data.approved_at) : undefined,
      pickupReadyByUserId: data.pickup_ready_by_user_id,
      pickupReadyAt: data.pickup_ready_at ? new Date(data.pickup_ready_at) : undefined,
      pickedUpByUserId: data.picked_up_by_user_id,
      pickedUpAt: data.picked_up_at ? new Date(data.picked_up_at) : undefined,
      completedByUserId: data.completed_by_user_id,
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      rejectedReason: data.rejected_reason,
      observations: data.observations,
      urgency: data.urgency,
    };
    
    return c.json(transformedData);
  } catch (error) {
    console.error("Error updating request:", error);
    return c.json({ error: "Failed to update request" }, 500);
  }
});

// ========== MOVEMENTS ==========
app.get("/make-server-46b247d8/movements", async (c) => {
  try {
    console.log('📝 GET /movements - Buscando todos os movements...');
    const { data, error } = await supabase.from('stock_simple_movements').select('*');
    if (error) throw error;
    
    // Map database columns to frontend fields
    const mappedData = (data || []).map(row => ({
      id: row.id,
      type: row.type,
      itemId: row.item_id,
      unitId: row.unit_id,
      userId: row.user_id,
      quantity: row.quantity,
      timestamp: new Date(row.timestamp),
      notes: row.notes,
      createdAt: new Date(row.created_at),
    }));
    
    console.log(`✅ Retornando ${mappedData.length} movements`);
    return c.json(mappedData);
  } catch (error) {
    console.error("Error fetching movements:", error);
    return c.json({ error: "Failed to fetch movements" }, 500);
  }
});

/**
 * POST /movements
 * Cria um movimento de estoque e atualiza a quantidade correspondente
 * 
 * Tipos de movimento:
 * - ENTRADA (aumenta estoque): 'entry', 'return'
 * - SAÍDA (diminui estoque): 'consumption', 'loan'
 * 
 * Fluxo:
 * 1. Buscar ou criar unit_stock para item+unidade
 * 2. Calcular nova quantidade baseado no tipo de movimento
 * 3. Validar que não fique negativo
 * 4. Atualizar unit_stock
 * 5. Registrar movimento no histórico
 */
app.post("/make-server-46b247d8/movements", async (c) => {
  try {
    const newMovement = await c.req.json();
    console.log('📥 Recebido movimento:', JSON.stringify(newMovement, null, 2));
    
    // Data is already in snake_case from api.ts toSnakeCase() helper
    const itemId = newMovement.item_id;
    const unitId = newMovement.unit_id;
    const userId = newMovement.user_id;
    
    // Validar campos obrigatórios
    if (!itemId || itemId === 'undefined' || itemId === 'null') {
      console.error('❌ item_id inválido:', itemId);
      return c.json({ error: 'item_id é obrigatório e deve ser um UUID válido' }, 400);
    }
    
    if (!unitId || unitId === 'undefined' || unitId === 'null') {
      console.error('❌ unit_id inválido:', unitId);
      return c.json({ error: 'unit_id é obrigatório e deve ser um UUID válido' }, 400);
    }
    
    // 1. Verificar se existe unit_stock para este item+unidade
    let { data: existingStock, error: findError } = await supabase
      .from('stock_unit_stocks')
      .select('*')
      .eq('item_id', itemId)
      .eq('unit_id', unitId)
      .maybeSingle();
    
    if (findError) {
      console.error('❌ Erro ao buscar stock:', findError);
    }
    
    // 2. Se não existir, criar com quantidade 0
    if (!existingStock) {
      console.log('📦 Criando novo stock para item_id:', itemId, 'unit_id:', unitId);
      const { data: newStock, error: createStockError } = await supabase
        .from('stock_unit_stocks')
        .insert({
          item_id: itemId,
          unit_id: unitId,
          quantity: 0,
          minimum_quantity: 0,
          location: ''
        })
        .select()
        .single();
      
      if (createStockError) {
        console.error('❌ Erro ao criar stock:', createStockError);
        return c.json({ error: 'Erro ao criar estoque', details: createStockError.message }, 500);
      }
      
      existingStock = newStock;
      console.log('✅ Stock criado com sucesso');
    }
    
    // 3. Calcular nova quantidade
    const currentQuantity = existingStock.quantity || 0;
    // Tipos de ENTRADA (soma): 'entry', 'return'
    // Tipos de SAÍDA (subtrai): 'consumption', 'loan'
    const isAddition = newMovement.type === 'entry' || newMovement.type === 'return';
    const quantityChange = isAddition ? newMovement.quantity : -newMovement.quantity;
    const newQuantity = currentQuantity + quantityChange;
    
    console.log('📊 Calculando nova quantidade:');
    console.log('   ├─ Quantidade ATUAL:', currentQuantity);
    console.log('   ├─ Tipo de movimento:', newMovement.type);
    console.log('   ├─ É adição?:', isAddition);
    console.log('   ├─ Mudança:', quantityChange);
    console.log('   └─ Quantidade NOVA:', newQuantity);
    
    // Validar quantidade negativa
    if (newQuantity < 0) {
      console.error('❌ ESTOQUE INSUFICIENTE!');
      return c.json({ 
        error: 'Estoque insuficiente', 
        details: `Não é possível realizar esta operação. Estoque atual: ${currentQuantity}, quantidade solicitada: ${newMovement.quantity}` 
      }, 400);
    }
    
    // 4. Atualizar a quantidade no unit_stock ANTES de criar o movimento
    const { error: updateError, data: updatedStock } = await supabase
      .from('stock_unit_stocks')
      .update({ quantity: newQuantity })
      .eq('item_id', itemId)
      .eq('unit_id', unitId)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Erro ao atualizar estoque:', updateError);
      return c.json({ error: 'Erro ao atualizar estoque', details: updateError.message }, 500);
    }
    
    console.log('✅ Stock atualizado:', JSON.stringify(updatedStock, null, 2));
    
    // 5. Criar o movimento
    const dbMovement = {
      type: newMovement.type,
      item_id: itemId,
      unit_id: unitId,
      user_id: userId,
      quantity: newMovement.quantity,
      timestamp: newMovement.timestamp || new Date().toISOString(),
      notes: newMovement.notes || null,
    };
    
    const { data, error } = await supabase.from('stock_simple_movements').insert(dbMovement).select().single();
    
    if (error) {
      console.error("❌ Erro ao criar movimento:", error);
      return c.json({ error: "Failed to create movement", details: error.message }, 500);
    }
    
    console.log('✅ Movimento criado e estoque atualizado');
    
    return c.json({
      id: data.id,
      type: data.type,
      itemId: data.item_id,
      unitId: data.unit_id,
      userId: data.user_id,
      quantity: data.quantity,
      timestamp: new Date(data.timestamp),
      notes: data.notes,
      createdAt: new Date(data.created_at),
    }, 201);
  } catch (error) {
    console.error("❌ Erro ao criar movimento:", error);
    return c.json({ error: "Failed to create movement" }, 500);
  }
});

// ========== LOANS ==========
app.get("/make-server-46b247d8/loans", async (c) => {
  try {
    const { data, error } = await supabase.from('stock_loans').select('*');
    if (error) throw error;
    
    // Transform snake_case to camelCase
    const transformedData = (data || []).map(loan => ({
      id: loan.id,
      itemId: loan.item_id,
      unitId: loan.unit_id,
      responsibleUserId: loan.responsible_user_id,
      withdrawalDate: loan.withdrawal_date,
      expectedReturnDate: loan.expected_return_date,
      returnDate: loan.return_date,
      status: loan.status,
      observations: loan.observations,
      serialNumber: loan.serial_number,
      quantity: loan.quantity,
    }));
    
    return c.json(transformedData);
  } catch (error) {
    console.error("Error fetching loans:", error);
    return c.json({ error: "Failed to fetch loans" }, 500);
  }
});

app.post("/make-server-46b247d8/loans", async (c) => {
  try {
    const newLoan = await c.req.json();
    console.log("📝 Creating loan with data:", JSON.stringify(newLoan, null, 2));
    
    // Accept both camelCase and snake_case
    const itemId = newLoan.itemId || newLoan.item_id;
    const unitId = newLoan.unitId || newLoan.unit_id;
    const responsibleUserId = newLoan.responsibleUserId || newLoan.responsible_user_id;
    const withdrawalDate = newLoan.withdrawalDate || newLoan.withdrawal_date;
    const expectedReturnDate = newLoan.expectedReturnDate || newLoan.expected_return_date;
    const returnDate = newLoan.returnDate || newLoan.return_date;
    const serialNumber = newLoan.serialNumber || newLoan.serial_number;
    const quantity = newLoan.quantity;
    
    // Validate required fields
    if (!itemId) {
      console.error("❌ Missing item_id in loan data");
      return c.json({ error: "item_id is required" }, 400);
    }
    if (!unitId) {
      console.error("❌ Missing unit_id in loan data");
      return c.json({ error: "unit_id is required" }, 400);
    }
    if (!responsibleUserId) {
      console.error("❌ Missing responsible_user_id in loan data");
      return c.json({ error: "responsible_user_id is required" }, 400);
    }
    
    // Convert to snake_case for Postgres
    const dbLoan = {
      item_id: itemId,
      unit_id: unitId,
      responsible_user_id: responsibleUserId,
      withdrawal_date: withdrawalDate,
      expected_return_date: expectedReturnDate,
      return_date: returnDate || null,
      status: newLoan.status,
      observations: newLoan.observations || null,
      serial_number: serialNumber || null,
      quantity: quantity || 1,
    };
    
    console.log("📝 DB loan (snake_case):", JSON.stringify(dbLoan, null, 2));
    
    const { data, error } = await supabase.from('stock_loans').insert(dbLoan).select().single();
    if (error) {
      console.error("❌ Supabase error creating loan:", error);
      return c.json({ 
        error: "Failed to create loan",
        details: error.message,
        code: error.code
      }, 500);
    }
    
    console.log("✅ Loan created successfully:", data);
    
    // Convert snake_case back to camelCase for response
    const responseLoan = {
      id: data.id,
      itemId: data.item_id,
      unitId: data.unit_id,
      responsibleUserId: data.responsible_user_id,
      withdrawalDate: data.withdrawal_date,
      expectedReturnDate: data.expected_return_date,
      returnDate: data.return_date,
      status: data.status,
      observations: data.observations,
      serialNumber: data.serial_number,
      quantity: data.quantity,
    };
    
    return c.json(responseLoan, 201);
  } catch (error) {
    console.error("❌ Error creating loan:", error);
    console.error("❌ Error details:", JSON.stringify(error, null, 2));
    return c.json({ 
      error: "Failed to create loan",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

app.put("/make-server-46b247d8/loans/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    
    console.log("📝 Updating loan with data:", JSON.stringify(updates, null, 2));
    
    // Accept both camelCase and snake_case
    const dbUpdates: any = {};
    
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.returnDate !== undefined || updates.return_date !== undefined) {
      dbUpdates.return_date = updates.returnDate || updates.return_date;
    }
    if (updates.observations !== undefined) dbUpdates.observations = updates.observations;
    if (updates.expectedReturnDate !== undefined || updates.expected_return_date !== undefined) {
      dbUpdates.expected_return_date = updates.expectedReturnDate || updates.expected_return_date;
    }
    
    console.log("📝 DB updates (snake_case):", JSON.stringify(dbUpdates, null, 2));
    
    const { data, error } = await supabase.from('stock_loans').update(dbUpdates).eq('id', id).select().single();
    if (error) {
      console.error("❌ Supabase error updating loan:", error);
      throw error;
    }
    
    console.log("✅ Loan updated successfully:", data);
    
    // Convert snake_case back to camelCase for response
    const responseLoan = {
      id: data.id,
      itemId: data.item_id,
      unitId: data.unit_id,
      responsibleUserId: data.responsible_user_id,
      withdrawalDate: data.withdrawal_date,
      expectedReturnDate: data.expected_return_date,
      returnDate: data.return_date,
      status: data.status,
      observations: data.observations,
      serialNumber: data.serial_number,
      quantity: data.quantity,
    };
    
    return c.json(responseLoan);
  } catch (error) {
    console.error("❌ Error updating loan:", error);
    return c.json({ 
      error: "Failed to update loan",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// ========== FURNITURE TRANSFERS ==========
app.get("/make-server-46b247d8/furniture-transfers", async (c) => {
  try {
    const { data, error } = await supabase.from('furniture_transfers').select('*');
    if (error) throw error;
    return c.json(data || []);
  } catch (error) {
    console.error("Error fetching furniture transfers:", error);
    return c.json({ error: "Failed to fetch furniture transfers" }, 500);
  }
});

app.post("/make-server-46b247d8/furniture-transfers", async (c) => {
  try {
    const newTransfer = await c.req.json();
    // Remove temporary ID from frontend before inserting
    const { id, ...transferData } = newTransfer;
    const { data, error } = await supabase.from('furniture_transfers').insert(transferData).select().single();
    if (error) throw error;
    return c.json(data, 201);
  } catch (error) {
    console.error("Error creating furniture transfer:", error);
    return c.json({ error: "Failed to create furniture transfer" }, 500);
  }
});

app.put("/make-server-46b247d8/furniture-transfers/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    const { data, error } = await supabase.from('furniture_transfers').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    console.error("Error updating furniture transfer:", error);
    return c.json({ error: "Failed to update furniture transfer" }, 500);
  }
});

// ========== FURNITURE REMOVAL REQUESTS ==========
app.get("/make-server-46b247d8/furniture-removal-requests", async (c) => {
  try {
    const { data, error } = await supabase.from('furniture_removal_requests').select('*');
    if (error) throw error;
    return c.json(data || []);
  } catch (error) {
    console.error("Error fetching furniture removal requests:", error);
    return c.json({ error: "Failed to fetch furniture removal requests" }, 500);
  }
});

app.post("/make-server-46b247d8/furniture-removal-requests", async (c) => {
  try {
    const newRequest = await c.req.json();
    // Remove temporary ID from frontend before inserting
    const { id, ...requestData } = newRequest;
    const { data, error } = await supabase.from('furniture_removal_requests').insert(requestData).select().single();
    if (error) throw error;
    return c.json(data, 201);
  } catch (error) {
    console.error("Error creating furniture removal request:", error);
    return c.json({ error: "Failed to create furniture removal request" }, 500);
  }
});

app.put("/make-server-46b247d8/furniture-removal-requests/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    const { data, error } = await supabase.from('furniture_removal_requests').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    console.error("Error updating furniture removal request:", error);
    return c.json({ error: "Failed to update furniture removal request" }, 500);
  }
});

// ========== FURNITURE REQUESTS TO DESIGNER ==========
app.get("/make-server-46b247d8/furniture-requests-to-designer", async (c) => {
  try {
    const { data, error } = await supabase.from('furniture_requests_to_designer').select('*');
    if (error) throw error;
    return c.json(data || []);
  } catch (error) {
    console.error("Error fetching furniture requests to designer:", error);
    return c.json({ error: "Failed to fetch furniture requests to designer" }, 500);
  }
});

app.post("/make-server-46b247d8/furniture-requests-to-designer", async (c) => {
  try {
    const newRequest = await c.req.json();
    console.log('📥 Creating furniture request to designer - RAW DATA:', JSON.stringify(newRequest, null, 2));
    
    // Remove temporary ID from frontend before inserting
    const { id, ...requestData } = newRequest;
    
    // Data may come in camelCase from frontend, convert to snake_case
    const dbRequest: any = {
      item_id: requestData.item_id || requestData.itemId,
      requesting_unit_id: requestData.requesting_unit_id || requestData.requestingUnitId,
      requested_by_user_id: requestData.requested_by_user_id || requestData.requestedByUserId,
      quantity: requestData.quantity,
      location: requestData.location,
      justification: requestData.justification,
      status: requestData.status || 'pending_designer',
      observations: requestData.observations
    };
    
    // Remove undefined values
    Object.keys(dbRequest).forEach(key => {
      if (dbRequest[key] === undefined) delete dbRequest[key];
    });
    
    console.log('💾 Inserting into DB:', JSON.stringify(dbRequest, null, 2));
    
    const { data, error } = await supabase.from('furniture_requests_to_designer').insert(dbRequest).select().single();
    if (error) {
      console.error('❌ Database error:', error);
      throw error;
    }
    console.log('✅ Created successfully:', data);
    return c.json(data, 201);
  } catch (error) {
    console.error("Error creating furniture request to designer:", error);
    return c.json({ error: "Failed to create furniture request to designer" }, 500);
  }
});

app.put("/make-server-46b247d8/furniture-requests-to-designer/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    
    // Data may come in camelCase from frontend, convert to snake_case
    // Accept both formats for compatibility
    const dbUpdates: any = {};
    
    // Basic fields
    if (updates.item_id !== undefined) dbUpdates.item_id = updates.item_id;
    else if (updates.itemId !== undefined) dbUpdates.item_id = updates.itemId;
    
    if (updates.requesting_unit_id !== undefined) dbUpdates.requesting_unit_id = updates.requesting_unit_id;
    else if (updates.requestingUnitId !== undefined) dbUpdates.requesting_unit_id = updates.requestingUnitId;
    
    if (updates.requested_by_user_id !== undefined) dbUpdates.requested_by_user_id = updates.requested_by_user_id;
    else if (updates.requestedByUserId !== undefined) dbUpdates.requested_by_user_id = updates.requestedByUserId;
    
    if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.justification !== undefined) dbUpdates.justification = updates.justification;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    
    // Gerar QR Code único quando status mudar para in_transit
    if (updates.status === 'in_transit' || updates.qr_code !== undefined || updates.qrCode !== undefined) {
      if (updates.qr_code !== undefined) dbUpdates.qr_code = updates.qr_code;
      else if (updates.qrCode !== undefined) dbUpdates.qr_code = updates.qrCode;
      else if (updates.status === 'in_transit') {
        // Gerar QR Code se não foi fornecido
        dbUpdates.qr_code = `FUR-${Date.now().toString().slice(-6)}`;
      }
    }
    
    // Designer review fields
    if (updates.reviewed_by_designer_id !== undefined) dbUpdates.reviewed_by_designer_id = updates.reviewed_by_designer_id;
    else if (updates.reviewedByDesignerId !== undefined) dbUpdates.reviewed_by_designer_id = updates.reviewedByDesignerId;
    
    if (updates.reviewed_at !== undefined) dbUpdates.reviewed_at = updates.reviewed_at instanceof Date ? updates.reviewed_at.toISOString() : updates.reviewed_at;
    else if (updates.reviewedAt !== undefined) dbUpdates.reviewed_at = updates.reviewedAt instanceof Date ? updates.reviewedAt.toISOString() : updates.reviewedAt;
    
    // Storage approval fields
    if (updates.approved_by_storage_user_id !== undefined) dbUpdates.approved_by_storage_user_id = updates.approved_by_storage_user_id;
    else if (updates.approvedByStorageUserId !== undefined) dbUpdates.approved_by_storage_user_id = updates.approvedByStorageUserId;
    
    if (updates.approved_by_storage_at !== undefined) dbUpdates.approved_by_storage_at = updates.approved_by_storage_at instanceof Date ? updates.approved_by_storage_at.toISOString() : updates.approved_by_storage_at;
    else if (updates.approvedByStorageAt !== undefined) dbUpdates.approved_by_storage_at = updates.approvedByStorageAt instanceof Date ? updates.approvedByStorageAt.toISOString() : updates.approvedByStorageAt;
    
    // Separation fields
    if (updates.separated_by_user_id !== undefined) dbUpdates.separated_by_user_id = updates.separated_by_user_id;
    else if (updates.separatedByUserId !== undefined) dbUpdates.separated_by_user_id = updates.separatedByUserId;
    
    if (updates.separated_at !== undefined) dbUpdates.separated_at = updates.separated_at instanceof Date ? updates.separated_at.toISOString() : updates.separated_at;
    else if (updates.separatedAt !== undefined) dbUpdates.separated_at = updates.separatedAt instanceof Date ? updates.separatedAt.toISOString() : updates.separatedAt;
    
    // Warehouse assignment fields
    if (updates.assigned_to_warehouse_user_id !== undefined) dbUpdates.assigned_to_warehouse_user_id = updates.assigned_to_warehouse_user_id;
    else if (updates.assignedToWarehouseUserId !== undefined) dbUpdates.assigned_to_warehouse_user_id = updates.assignedToWarehouseUserId;
    
    if (updates.assigned_at !== undefined) dbUpdates.assigned_at = updates.assigned_at instanceof Date ? updates.assigned_at.toISOString() : updates.assigned_at;
    else if (updates.assignedAt !== undefined) dbUpdates.assigned_at = updates.assignedAt instanceof Date ? updates.assignedAt.toISOString() : updates.assignedAt;
    
    // Delivery fields
    if (updates.delivered_by_user_id !== undefined) dbUpdates.delivered_by_user_id = updates.delivered_by_user_id;
    else if (updates.deliveredByUserId !== undefined) dbUpdates.delivered_by_user_id = updates.deliveredByUserId;
    
    if (updates.delivered_at !== undefined) dbUpdates.delivered_at = updates.delivered_at instanceof Date ? updates.delivered_at.toISOString() : updates.delivered_at;
    else if (updates.deliveredAt !== undefined) dbUpdates.delivered_at = updates.deliveredAt instanceof Date ? updates.deliveredAt.toISOString() : updates.deliveredAt;
    
    // Completion field
    if (updates.completed_at !== undefined) dbUpdates.completed_at = updates.completed_at instanceof Date ? updates.completed_at.toISOString() : updates.completed_at;
    else if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt instanceof Date ? updates.completedAt.toISOString() : updates.completedAt;
    
    // Additional fields
    if (updates.rejection_reason !== undefined) dbUpdates.rejection_reason = updates.rejection_reason;
    else if (updates.rejectionReason !== undefined) dbUpdates.rejection_reason = updates.rejectionReason;
    
    if (updates.observations !== undefined) dbUpdates.observations = updates.observations;
    
    console.log('🔄 Updating furniture request to designer:', id, 'with:', dbUpdates);
    
    const { data, error } = await supabase.from('furniture_requests_to_designer').update(dbUpdates).eq('id', id).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    console.error("Error updating furniture request to designer:", error);
    return c.json({ error: "Failed to update furniture request to designer" }, 500);
  }
});

// ========== UNIQUE PRODUCT INSTANCES ==========
app.get("/make-server-46b247d8/individual-items", async (c) => {
  try {
    const { data, error } = await supabase.from('stock_unique_product_instances').select('*');
    if (error) throw error;
    return c.json(data || []);
  } catch (error) {
    console.error("Error fetching individual items:", error);
    return c.json({ error: "Failed to fetch individual items" }, 500);
  }
});

app.post("/make-server-46b247d8/individual-items", async (c) => {
  try {
    const newItem = await c.req.json();
    // Remove temporary ID from frontend before inserting
    const { id, ...itemData } = newItem;
    const { data, error } = await supabase.from('stock_unique_product_instances').insert(itemData).select().single();
    if (error) throw error;
    return c.json(data, 201);
  } catch (error) {
    console.error("Error creating individual item:", error);
    return c.json({ error: "Failed to create individual item" }, 500);
  }
});

app.put("/make-server-46b247d8/individual-items/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    const { data, error } = await supabase.from('stock_unique_product_instances').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    console.error("Error updating individual item:", error);
    return c.json({ error: "Failed to update individual item" }, 500);
  }
});

// ========== DELIVERY BATCHES ==========
app.get("/make-server-46b247d8/delivery-batches", async (c) => {
  try {
    const { data, error } = await supabase
      .from("purchase_delivery_batches")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Convert dates from strings to Date objects
    const batches = data.map(batch => ({
      ...batch,
      requestIds: batch.request_ids || [],
      furnitureRequestIds: batch.furniture_request_ids || [],
      targetUnitId: batch.target_unit_id,
      driverUserId: batch.driver_user_id,
      qrCode: batch.qr_code,
      createdAt: new Date(batch.created_at),
      dispatchedAt: batch.dispatched_at ? new Date(batch.dispatched_at) : undefined,
      deliveryConfirmedAt: batch.delivery_confirmed_at ? new Date(batch.delivery_confirmed_at) : undefined,
      receivedConfirmedAt: batch.received_confirmed_at ? new Date(batch.received_confirmed_at) : undefined,
      completedAt: batch.completed_at ? new Date(batch.completed_at) : undefined,
      confirmedByRequesterAt: batch.confirmed_by_requester_at ? new Date(batch.confirmed_by_requester_at) : undefined,
    }));

    return c.json(batches);
  } catch (error) {
    console.error("Error fetching delivery batches:", error);
    return c.json({ error: "Failed to fetch delivery batches" }, 500);
  }
});

app.post("/make-server-46b247d8/delivery-batches", async (c) => {
  try {
    const body = await c.req.json();
    console.log('📦 Recebido delivery batch:', JSON.stringify(body, null, 2));
    
    // Data comes in snake_case from api.ts
    const requestIds = body.request_ids || [];
    const furnitureRequestIds = body.furniture_request_ids || [];
    const targetUnitId = body.target_unit_id;
    const driverUserId = body.driver_user_id;
    const qrCode = body.qr_code;
    
    // Validar campos obrigatórios
    if (!targetUnitId || targetUnitId === 'undefined' || targetUnitId === 'null') {
      console.error('❌ target_unit_id inválido:', targetUnitId);
      return c.json({ error: 'target_unit_id é obrigatório e deve ser um UUID válido' }, 400);
    }
    
    if (!driverUserId || driverUserId === 'undefined' || driverUserId === 'null') {
      console.error('❌ driver_user_id inválido:', driverUserId);
      return c.json({ error: 'driver_user_id é obrigatório e deve ser um UUID válido' }, 400);
    }
    
    // 🔧 GERAR ID MANUALMENTE ao invés de depender do banco
    const batchId = crypto.randomUUID();
    
    const { data, error } = await supabase
      .from("purchase_delivery_batches")
      .insert({
        id: batchId,
        request_ids: requestIds,
        furniture_request_ids: furnitureRequestIds,
        target_unit_id: targetUnitId,
        driver_user_id: driverUserId,
        qr_code: qrCode || `BATCH-${Date.now()}`,
        status: body.status || 'pending',
        notes: body.notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar delivery batch:', error);
      throw error;
    }
    
    console.log('✅ Delivery batch criado:', data.id);
    return c.json(data);
  } catch (error) {
    console.error("Error creating delivery batch:", error);
    return c.json({ error: "Failed to create delivery batch", details: error }, 500);
  }
});

app.put("/make-server-46b247d8/delivery-batches/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    
    // Primeiro, tenta buscar o lote existente
    const { data: existing } = await supabase
      .from("purchase_delivery_batches")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      // Se não existe, cria um novo (migração automática do localStorage)
      console.log(`⚠️ Lote ${id} não encontrado, criando automaticamente...`);
      
      const { data: created, error: createError } = await supabase
        .from("purchase_delivery_batches")
        .insert({
          id: id,
          request_ids: body.requestIds || [],
          furniture_request_ids: body.furnitureRequestIds || [],
          target_unit_id: body.targetUnitId || '',
          driver_user_id: body.driverUserId || '',
          qr_code: body.qrCode || id,
          status: body.status || 'pending',
          created_at: body.createdAt || new Date().toISOString(),
          notes: body.notes,
          dispatched_at: body.dispatchedAt,
          delivery_confirmed_at: body.deliveryConfirmedAt,
          received_confirmed_at: body.receivedConfirmedAt,
          completed_at: body.completedAt,
          confirmed_by_requester_at: body.confirmedByRequesterAt,
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating delivery batch on-the-fly:", createError);
        throw createError;
      }
      
      console.log(`✅ Lote ${id} criado automaticamente durante update`);
      return c.json(created);
    }

    // Se existe, atualiza normalmente
    const updates: any = {};
    if (body.status !== undefined) updates.status = body.status;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.dispatchedAt !== undefined) updates.dispatched_at = body.dispatchedAt;
    if (body.deliveryConfirmedAt !== undefined) updates.delivery_confirmed_at = body.deliveryConfirmedAt;
    if (body.receivedConfirmedAt !== undefined) updates.received_confirmed_at = body.receivedConfirmedAt;
    if (body.completedAt !== undefined) updates.completed_at = body.completedAt;
    if (body.confirmedByRequesterAt !== undefined) updates.confirmed_by_requester_at = body.confirmedByRequesterAt;

    const { data, error } = await supabase
      .from("purchase_delivery_batches")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    
    console.log(`✅ Lote ${id} atualizado: status=${body.status}`);
    return c.json(data);
  } catch (error) {
    console.error("Error updating delivery batch:", error);
    return c.json({ error: "Failed to update delivery batch", details: error }, 500);
  }
});

// ========== DELIVERY CONFIRMATIONS ==========
app.get("/make-server-46b247d8/delivery-confirmations", async (c) => {
  try {
    const { data, error } = await supabase
      .from("purchase_delivery_confirmations")
      .select("*")
      .order("timestamp", { ascending: false });

    if (error) {
      console.error("Error fetching delivery confirmations:", error);
      throw error;
    }

    // Convert dates and parse JSON fields
    const confirmations = (data || []).map(conf => {
      let location = undefined;
      if (conf.location) {
        try {
          location = typeof conf.location === 'string' ? JSON.parse(conf.location) : conf.location;
        } catch {
          location = undefined;
        }
      }
      return {
        ...conf,
        batchId: conf.batch_id,
        furnitureRequestId: conf.furniture_request_id,
        confirmedByUserId: conf.confirmed_by_user_id,
        receivedByUserId: conf.received_by_user_id,
        photoUrl: conf.photo_url,
        timestamp: new Date(conf.timestamp),
        location,
      };
    });

    return c.json(confirmations);
  } catch (error) {
    console.error("Error fetching delivery confirmations:", error);
    return c.json({ error: "Failed to fetch delivery confirmations" }, 500);
  }
});

app.post("/make-server-46b247d8/delivery-confirmations", async (c) => {
  try {
    const body = await c.req.json();
    
    console.log('📦 Criando confirmação de entrega:', JSON.stringify(body, null, 2));
    
    // Data comes in snake_case from api.ts
    const batchId = body.batch_id;
    const furnitureRequestId = body.furniture_request_id;
    const confirmedByUserId = body.confirmed_by_user_id;
    const receivedByUserId = body.received_by_user_id;
    
    // Validar campos obrigatórios - precisa ter batch_id OU furniture_request_id
    if ((!batchId || batchId === 'undefined' || batchId === 'null') && 
        (!furnitureRequestId || furnitureRequestId === 'undefined' || furnitureRequestId === 'null')) {
      console.error('❌ batch_id ou furniture_request_id é obrigatório');
      return c.json({ error: 'batch_id ou furniture_request_id é obrigatório' }, 400);
    }
    
    // 🔧 GERAR ID MANUALMENTE ao invés de depender do banco
    const confirmationId = crypto.randomUUID();
    
    const { data, error } = await supabase
      .from("purchase_delivery_confirmations")
      .insert({
        id: confirmationId,
        batch_id: batchId || null,
        furniture_request_id: furnitureRequestId || null,
        type: body.type || 'receipt',
        confirmed_by_user_id: confirmedByUserId || null,
        received_by_user_id: receivedByUserId || null,
        photo_url: body.photo_url || '',
        timestamp: body.timestamp || new Date().toISOString(),
        location: body.location ? JSON.stringify(body.location) : null,
        signature: body.signature || null,
        notes: body.notes || null,
        daily_code: body.daily_code || null,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erro do Supabase ao criar confirmação:', error);
      throw error;
    }
    
    console.log('✅ Confirmação criada com sucesso:', data);
    return c.json(data);
  } catch (error) {
    console.error("❌ Error creating delivery confirmation:", error);
    return c.json({ 
      error: "Failed to create delivery confirmation", 
      details: error.message || error 
    }, 500);
  }
});

// ========== FIX DELIVERY TABLES SCHEMA ==========
app.post("/make-server-46b247d8/fix-delivery-tables", async (c) => {
  try {
    console.log('🔧 Gerando SQL para corrigir tabelas de delivery...');
    
    const sqlToRun = `-- Corrigir tabelas purchase_delivery_batches e purchase_delivery_confirmations
-- Execute este SQL no Supabase Dashboard > SQL Editor

-- Adicionar DEFAULT gen_random_uuid() nas colunas id (se aplicável ao tipo da coluna no seu banco)
ALTER TABLE purchase_delivery_batches 
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE purchase_delivery_confirmations 
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Se as tabelas não existem, criar do zero:
CREATE TABLE IF NOT EXISTS purchase_delivery_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_ids UUID[] DEFAULT '{}',
  furniture_request_ids UUID[] DEFAULT '{}',
  target_unit_id UUID NOT NULL,
  driver_user_id UUID,
  qr_code TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  dispatched_at TIMESTAMPTZ,
  delivery_confirmed_at TIMESTAMPTZ,
  received_confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  confirmed_by_requester_at TIMESTAMPTZ,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS purchase_delivery_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id TEXT,
  furniture_request_id UUID,
  type TEXT NOT NULL,
  confirmed_by_user_id UUID,
  received_by_user_id UUID,
  photo_url TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  location JSONB,
  signature TEXT,
  notes TEXT,
  daily_code TEXT
);

CREATE INDEX IF NOT EXISTS idx_delivery_batches_status ON purchase_delivery_batches(status);
CREATE INDEX IF NOT EXISTS idx_delivery_batches_target_unit ON purchase_delivery_batches(target_unit_id);
CREATE INDEX IF NOT EXISTS idx_delivery_confirmations_batch ON purchase_delivery_confirmations(batch_id);`;
    
    console.log('📋 SQL gerado com sucesso');
    
    return c.json({
      message: '⚠️ AÇÃO MANUAL NECESSÁRIA - Execute o SQL no Supabase Dashboard',
      sqlToExecute: sqlToRun,
      instructions: [
        '1. Copie o SQL retornado em "sqlToExecute"',
        '2. Vá para Supabase Dashboard > SQL Editor',
        '3. Cole e execute o SQL',
        '4. As tabelas purchase_delivery_batches e purchase_delivery_confirmations terão o DEFAULT corrigido',
        '5. Tente criar novos lotes/confirmações novamente'
      ],
      reason: 'As colunas id nas tabelas purchase_delivery_batches e purchase_delivery_confirmations não têm DEFAULT gen_random_uuid(), causando erro de constraint violation'
    });
  } catch (error) {
    console.error('Erro ao gerar SQL de correção:', error);
    return c.json({ 
      error: 'Falha ao gerar SQL de correção', 
      details: error.message || error 
    }, 500);
  }
});

// ========== IMAGE UPLOAD ==========
// Create bucket on first upload if it doesn't exist
const ensureBucketExists = async () => {
  const bucketName = 'make-46b247d8-items';
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
  
  if (!bucketExists) {
    const { error } = await supabase.storage.createBucket(bucketName, {
      public: true, // Make bucket public so images are accessible
    });
    if (error) {
      console.error('Error creating bucket:', error);
      throw error;
    }
  }
  return bucketName;
};

app.post("/make-server-46b247d8/upload-image", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    // Ensure bucket exists
    const bucketName = await ensureBucketExists();

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `items/${fileName}`;

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, uint8Array, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('Error uploading file:', error);
      return c.json({ error: 'Failed to upload file' }, 500);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return c.json({ url: publicUrl }, 201);
  } catch (error) {
    console.error('Error in upload-image:', error);
    return c.json({ error: 'Failed to upload image' }, 500);
  }
});

// ========== UPLOAD ANEXOS COTAÇÕES ==========
const COTACOES_BUCKET = 'cotacoes-anexos';
const ensureCotacoesBucketExists = async () => {
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some((b) => b.name === COTACOES_BUCKET);
  if (!bucketExists) {
    const { error } = await supabase.storage.createBucket(COTACOES_BUCKET, { public: true });
    if (error) throw error;
  }
  return COTACOES_BUCKET;
};

app.post("/make-server-46b247d8/upload-quotation-attachment", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    if (!file) return c.json({ error: 'No file provided' }, 400);
    const bucketName = await ensureCotacoesBucketExists();
    const fileExt = file.name.split('.').pop() || 'bin';
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `anexos/${fileName}`;
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const { error } = await supabase.storage.from(bucketName).upload(filePath, uint8Array, {
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      console.error('Error uploading quotation attachment:', error);
      return c.json({ error: 'Failed to upload' }, 500);
    }
    const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    return c.json({ url: publicUrl }, 201);
  } catch (error) {
    console.error('Error in upload-quotation-attachment:', error);
    return c.json({ error: 'Failed to upload attachment' }, 500);
  }
});

// ========== DEVELOPER DIAGNOSTICS ==========
app.get("/make-server-46b247d8/developer/check-furniture-table", async (c) => {
  try {
    // Get sample data to see actual structure
    const { data: sampleData, error: sampleError } = await supabase
      .from('furniture_requests_to_designer')
      .select('*')
      .limit(1);
    
    return c.json({ 
      sampleData: sampleData || [],
      sampleError: sampleError?.message,
      hint: 'Check if table exists and what data it contains'
    });
  } catch (error) {
    console.error("Error checking furniture table:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// ========== MÓDULO DE COMPRAS ==========

// --- Seed Purchase Mock Data ---
app.post("/make-server-46b247d8/seed-purchases", async (c) => {
  try {
    // Verificar se tabelas existem
    const { error: tableCheck } = await supabase.from('purchase_supplier_categories').select('id').limit(1);
    if (tableCheck?.code === '42P01') {
      return c.json({ error: "Tabelas de compras não existem. Execute SQL-MODULO-COMPRAS.sql no Supabase SQL Editor primeiro." }, 400);
    }

    // Obter primeiro usuário e unidade para solicitante_id e unidade_id
    const { data: firstUser } = await supabase.from('users').select('id').limit(1).single();
    const { data: firstUnit } = await supabase.from('org_units').select('id').limit(1).single();
    const solicitanteId = firstUser?.id ?? '00000000-0000-0000-0000-000000000001';
    const unidadeId = firstUnit?.id ?? '00000000-0000-0000-0000-000000000002';
    const responsavelId = firstUser?.id ?? solicitanteId;

    // 1. Categorias de fornecedor
    const cats = [
      { nome: 'Material de Escritório', descricao: 'Fornecedores de papelaria', status: 'active' },
      { nome: 'Tecnologia', descricao: 'Equipamentos de TI', status: 'active' },
      { nome: 'Limpeza', descricao: 'Produtos de limpeza', status: 'active' },
    ];
    const catIds = [];
    for (const cat of cats) {
      const { data: existing } = await supabase.from('purchase_supplier_categories').select('id').eq('nome', cat.nome).limit(1).maybeSingle();
      if (existing) {
        catIds.push(existing.id);
      } else {
        const { data: inserted } = await supabase.from('purchase_supplier_categories').insert(cat).select('id').single();
        catIds.push(inserted?.id);
      }
    }
    const [catMatId, catTechId, catLimpezaId] = catIds;
    if (!catMatId) return c.json({ error: "Erro ao criar categorias" }, 500);

    // 2. Fornecedores
    const suppliersToInsert = [
      { razao_social: 'Papelaria Central Ltda', cnpj: '12.345.678/0001-90', contato: 'João Silva', email: 'vendas@papelaria.com', telefone: '(11) 3333-4444', categoria_id: catMatId, endereco: 'Rua das Flores, 100', dados_bancarios: {}, status: 'active' },
      { razao_social: 'Tech Solutions S.A.', cnpj: '98.765.432/0001-10', contato: 'Maria Santos', email: 'compras@tech.com', telefone: '(11) 5555-6666', categoria_id: catTechId, endereco: 'Av. Paulista, 1000', dados_bancarios: {}, status: 'active' },
      { razao_social: 'Limpeza Pro Ltda', cnpj: '11.222.333/0001-44', contato: 'Pedro Oliveira', email: 'contato@limpeza.com', telefone: '(11) 7777-8888', categoria_id: catLimpezaId, endereco: 'Rua Augusta, 500', status: 'active' },
    ];
    for (const s of suppliersToInsert) {
      const { data: existing } = await supabase.from('purchase_suppliers').select('id').eq('cnpj', s.cnpj).maybeSingle();
      if (!existing) {
        await supabase.from('purchase_suppliers').insert(s);
      }
    }
    let supplier1Id = (await supabase.from('purchase_suppliers').select('id').eq('cnpj', '12.345.678/0001-90').maybeSingle()).data?.id;
    if (!supplier1Id) {
      const { data: anySupplier } = await supabase.from('purchase_suppliers').select('id').limit(1).maybeSingle();
      supplier1Id = anySupplier?.id;
    }
    if (!supplier1Id) return c.json({ error: "Nenhum fornecedor encontrado. Verifique se os fornecedores foram inseridos." }, 500);

    // 3. Centros de custo
    const costCenters = [
      { codigo: 'CC-001', nome: 'Administrativo', descricao: 'Despesas administrativas', status: 'active' },
      { codigo: 'CC-002', nome: 'Operações', descricao: 'Operações gerais', status: 'active' },
      { codigo: 'CC-003', nome: 'TI', descricao: 'Tecnologia', status: 'active' },
    ];
    for (const cc of costCenters) {
      const { data: existing } = await supabase.from('org_cost_centers').select('id').eq('codigo', cc.codigo).maybeSingle();
      if (!existing) await supabase.from('org_cost_centers').insert(cc);
    }
    const { data: cc1 } = await supabase.from('org_cost_centers').select('id').eq('codigo', 'CC-001').single();
    const { data: cc3 } = await supabase.from('org_cost_centers').select('id').eq('codigo', 'CC-003').single();
    if (!cc1?.id || !cc3?.id) return c.json({ error: "Erro ao criar centros de custo" }, 500);

    // 4. Contrato
    let contratoId = (await supabase.from('purchase_contracts').select('id').eq('numero', 'CT-2025-001').maybeSingle()).data?.id;
    if (!contratoId) {
      const { data: newContrato } = await supabase.from('purchase_contracts').insert({
        numero: 'CT-2025-001', nome: 'Contrato Material Escritório', cnpj_cliente: '12.345.678/0001-99', valor_total: 80000, valor_consumido: 0, data_inicio: '2025-01-01', data_fim: '2025-12-31', centro_custo_id: cc1.id, status: 'active',
      }).select('id').single();
      contratoId = newContrato?.id;
    }

    // 5. Solicitações de compra (evitar duplicatas)
    const existingPr = (await supabase.from('purchase_requests').select('id').ilike('justificativa', '%material de escritório%').limit(1).maybeSingle()).data;
    let pr1Id = existingPr?.id;
    if (!pr1Id) {
      const itens1 = [{ id: 'item-1', solicitacao_id: '', descricao: 'Papel A4 75g 500 folhas', quantidade: 50, unidade_medida: 'resma', observacao: 'Branco' }, { id: 'item-2', solicitacao_id: '', descricao: 'Caneta esferográfica azul', quantidade: 100, unidade_medida: 'un', observacao: '' }];
      const aprovacoes1 = [{ id: 'aprov-1', user_id: 'm1', user_name: 'Gerente', role: 'manager', action: 'approved', timestamp: new Date().toISOString() }, { id: 'aprov-2', user_id: 'd1', user_name: 'Diretor', role: 'director', action: 'approved', timestamp: new Date().toISOString() }];
      const { data: pr1 } = await supabase.from('purchase_requests').insert({
        solicitante_id: solicitanteId, unidade_id: unidadeId, centro_custo_id: cc1.id, cnpj_solicitante: '12.345.678/0001-99', contrato_id: contratoId,
        justificativa: 'Necessário repor material de escritório para a equipe. Papel A4 e canetas em falta.',
        status: 'in_quotation', itens: itens1, aprovacoes: aprovacoes1,
      }).select('id').single();
      pr1Id = pr1?.id;
    }
    if (!pr1Id) return c.json({ error: "Erro ao criar solicitação" }, 500);

    const existingPr2 = (await supabase.from('purchase_requests').select('id').ilike('justificativa', '%notebooks%').limit(1).maybeSingle()).data;
    if (!existingPr2) {
      const itens2 = [{ id: 'item-3', solicitacao_id: '', descricao: 'Notebook 15 polegadas 16GB RAM', quantidade: 5, unidade_medida: 'un', observacao: 'SSD 512GB' }];
      const aprovacoes2 = [{ id: 'aprov-3', user_id: 'm1', user_name: 'Gerente TI', role: 'manager', action: 'approved', timestamp: new Date().toISOString() }];
      await supabase.from('purchase_requests').insert({
        solicitante_id: solicitanteId, unidade_id: unidadeId, centro_custo_id: cc3.id,
        justificativa: 'Aquisição de notebooks para novos colaboradores do time de TI. Total de 5 unidades.',
        status: 'pending_director', itens: itens2, aprovacoes: aprovacoes2,
      });
    }

    // 6. Cotação (evitar duplicata)
    let cotacaoId = (await supabase.from('purchase_quotations').select('id').eq('solicitacao_id', pr1Id).eq('status', 'approved').limit(1).maybeSingle()).data?.id;
    if (!cotacaoId) {
      const { data: moedaBrl } = await supabase.from('org_currencies').select('id').eq('codigo', 'BRL').limit(1).maybeSingle();
      const qItens = [{ id: 'qitem-1', cotacao_id: '', item_solicitacao_id: 'item-1', descricao: 'Papel A4 75g 500 folhas', quantidade: 50, unidade_medida: 'resma', preco_unitario: 18.90, valor_total: 945 }, { id: 'qitem-2', cotacao_id: '', item_solicitacao_id: 'item-2', descricao: 'Caneta esferográfica azul', quantidade: 100, unidade_medida: 'un', preco_unitario: 1.50, valor_total: 150 }];
      const { data: cotacao } = await supabase.from('purchase_quotations').insert({
        solicitacao_id: pr1Id, fornecedor_id: supplier1Id, moeda_id: moedaBrl?.id, forma_pagamento: 'Boleto', condicoes_pagamento: '30 dias', prazo_entrega: 5,
        status: 'approved', itens: qItens, enviado_em: new Date().toISOString(), respondido_em: new Date().toISOString(),
      }).select('id').single();
      cotacaoId = cotacao?.id;
    }
    if (!cotacaoId) return c.json({ error: "Erro ao criar cotação" }, 500);

    // 7. Pedido de compra (evitar duplicata)
    let pedidoId = (await supabase.from('purchase_orders').select('id').eq('numero_omie', 'PC-2025-001').maybeSingle()).data?.id;
    if (!pedidoId) {
      const { data: pedido } = await supabase.from('purchase_orders').insert({
        cotacao_id: cotacaoId, numero_omie: 'PC-2025-001', valor_total: 1095, status: 'fully_received',
        notas_fiscais: [{ numero: '123456', valor: 1095, data_emissao: '2025-02-25', chave_acesso: '35250212345678000199550010001234561123456789' }], observacoes: 'Entrega realizada',
      }).select('id').single();
      pedidoId = pedido?.id;
    }
    if (!pedidoId) return c.json({ error: "Erro ao criar pedido" }, 500);

    // 8. Recebimentos (evitar duplicata)
    const existingRec = (await supabase.from('purchase_receivings').select('id').eq('pedido_id', pedidoId).limit(1).maybeSingle()).data;
    if (!existingRec) {
      await supabase.from('purchase_receivings').insert([
        { pedido_id: pedidoId, item_id: 'item-1', quantidade_esperada: 50, quantidade_recebida: 50, responsavel_id: responsavelId, local_entrega: 'Recepção', status: 'fully_received' },
        { pedido_id: pedidoId, item_id: 'item-2', quantidade_esperada: 100, quantidade_recebida: 100, responsavel_id: responsavelId, local_entrega: 'Recepção', status: 'fully_received' },
      ]);
    }

    return c.json({ message: "Dados de compras populados com sucesso", solicitanteId, unidadeId }, 201);
  } catch (error) {
    console.error("Error seeding purchases:", error);
    return c.json({ error: "Failed to seed purchases", details: String(error) }, 500);
  }
});

// --- Supplier Categories ---
app.get("/make-server-46b247d8/supplier-categories", async (c) => {
  try {
    const { data, error } = await supabase.from('purchase_supplier_categories').select('*');
    if (error) throw error;
    return c.json(data || []);
  } catch (error) {
    console.error("Error fetching supplier categories:", error);
    return c.json({ error: "Failed to fetch supplier categories" }, 500);
  }
});

app.post("/make-server-46b247d8/supplier-categories", async (c) => {
  try {
    const body = await c.req.json();
    const { id, ...rest } = body;
    const { data, error } = await supabase.from('purchase_supplier_categories').insert(rest).select().single();
    if (error) throw error;
    return c.json(data, 201);
  } catch (error) {
    console.error("Error creating supplier category:", error);
    return c.json({ error: "Failed to create supplier category" }, 500);
  }
});

app.put("/make-server-46b247d8/supplier-categories/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    const { data, error } = await supabase.from('purchase_supplier_categories').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    console.error("Error updating supplier category:", error);
    return c.json({ error: "Failed to update supplier category" }, 500);
  }
});

// --- Suppliers ---
app.get("/make-server-46b247d8/suppliers", async (c) => {
  try {
    const { data, error } = await supabase.from('purchase_suppliers').select('*').order('razao_social');
    if (error) throw error;
    return c.json(data || []);
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return c.json({ error: "Failed to fetch suppliers" }, 500);
  }
});

app.post("/make-server-46b247d8/suppliers", async (c) => {
  try {
    const body = await c.req.json();
    const { id, ...rest } = body;
    const { data, error } = await supabase.from('purchase_suppliers').insert(rest).select().single();
    if (error) throw error;
    return c.json(data, 201);
  } catch (error) {
    console.error("Error creating supplier:", error);
    return c.json({ error: "Failed to create supplier", details: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.put("/make-server-46b247d8/suppliers/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    const { data, error } = await supabase.from('purchase_suppliers').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    console.error("Error updating supplier:", error);
    return c.json({ error: "Failed to update supplier" }, 500);
  }
});

app.delete("/make-server-46b247d8/suppliers/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const { error } = await supabase.from('purchase_suppliers').delete().eq('id', id);
    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    return c.json({ error: "Failed to delete supplier" }, 500);
  }
});

// --- Cost Centers ---
app.get("/make-server-46b247d8/cost-centers", async (c) => {
  try {
    const { data, error } = await supabase.from('org_cost_centers').select('*').order('codigo');
    if (error) throw error;
    return c.json(data || []);
  } catch (error) {
    console.error("Error fetching cost centers:", error);
    return c.json({ error: "Failed to fetch cost centers" }, 500);
  }
});

app.post("/make-server-46b247d8/cost-centers", async (c) => {
  try {
    const body = await c.req.json();
    const { id, ...rest } = body;
    const { data, error } = await supabase.from('org_cost_centers').insert(rest).select().single();
    if (error) throw error;
    return c.json(data, 201);
  } catch (error) {
    console.error("Error creating cost center:", error);
    return c.json({ error: "Failed to create cost center" }, 500);
  }
});

app.put("/make-server-46b247d8/cost-centers/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    const { data, error } = await supabase.from('org_cost_centers').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    console.error("Error updating cost center:", error);
    return c.json({ error: "Failed to update cost center" }, 500);
  }
});

// --- Contracts ---
app.get("/make-server-46b247d8/contracts", async (c) => {
  try {
    const { data, error } = await supabase.from('purchase_contracts').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return c.json(data || []);
  } catch (error) {
    console.error("Error fetching contracts:", error);
    return c.json({ error: "Failed to fetch contracts" }, 500);
  }
});

app.post("/make-server-46b247d8/contracts", async (c) => {
  try {
    const body = await c.req.json();
    const { id, saldo, ...rest } = body;
    const { data, error } = await supabase.from('purchase_contracts').insert(rest).select().single();
    if (error) throw error;
    return c.json(data, 201);
  } catch (error) {
    console.error("Error creating contract:", error);
    return c.json({ error: "Failed to create contract" }, 500);
  }
});

app.put("/make-server-46b247d8/contracts/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    delete updates.saldo;
    const { data, error } = await supabase.from('purchase_contracts').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    console.error("Error updating contract:", error);
    return c.json({ error: "Failed to update contract" }, 500);
  }
});

// --- Currencies ---
app.get("/make-server-46b247d8/currencies", async (c) => {
  try {
    const { data, error } = await supabase.from('org_currencies').select('*').order('codigo');
    if (error) throw error;
    return c.json(data || []);
  } catch (error) {
    console.error("Error fetching currencies:", error);
    return c.json({ error: "Failed to fetch currencies" }, 500);
  }
});

// --- Departments (lista para UI; service role) ---
app.get("/make-server-46b247d8/departments", async (c) => {
  try {
    const { data, error } = await supabase
      .from("org_departments")
      .select("id, name, is_active")
      .order("name");
    if (error) {
      console.error("[departments] GET:", (error as any)?.code, (error as any)?.message);
      return c.json([]);
    }
    return c.json(data || []);
  } catch (error) {
    console.error("Error fetching departments:", error);
    return c.json([]);
  }
});

// --- Purchase Requests ---
app.get("/make-server-46b247d8/purchase-requests", async (c) => {
  try {
    const { data, error } = await supabase.from('purchase_requests').select('*').order('created_at', { ascending: false });
    return purchasesListResponse(c, "purchase_requests", error, data as unknown[] | null);
  } catch (error) {
    console.error("purchase_requests GET catch:", error);
    return c.json([]);
  }
});

app.post("/make-server-46b247d8/purchase-requests", async (c) => {
  try {
    const body = await c.req.json();
    const { id, ...rest } = body;
    const { data, error } = await supabase.from('purchase_requests').insert(rest).select().single();
    if (error) throw error;
    return c.json(data, 201);
  } catch (error) {
    console.error("Error creating purchase request:", error);
    return c.json({ error: "Failed to create purchase request", details: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.put("/make-server-46b247d8/purchase-requests/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    const { data, error } = await supabase.from('purchase_requests').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    console.error("Error updating purchase request:", error);
    return c.json({ error: "Failed to update purchase request" }, 500);
  }
});

app.put("/make-server-46b247d8/purchase-requests/:id/approve-manager", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { data: current, error: fetchErr } = await supabase.from('purchase_requests').select('aprovacoes').eq('id', id).single();
    if (fetchErr) throw fetchErr;
    const aprovacoes = Array.isArray(current?.aprovacoes) ? current.aprovacoes : [];
    aprovacoes.push({
      id: crypto.randomUUID(),
      user_id: body.approver_id,
      user_name: body.approver_name,
      role: 'manager',
      action: 'approved',
      timestamp: new Date().toISOString(),
    });
    const { data, error } = await supabase.from('purchase_requests')
      .update({ status: 'pending_director', aprovacoes })
      .eq('id', id).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    console.error("Error approving (manager):", error);
    return c.json({ error: "Failed to approve", details: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.put("/make-server-46b247d8/purchase-requests/:id/reject-manager", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { data: current, error: fetchErr } = await supabase.from('purchase_requests').select('aprovacoes').eq('id', id).single();
    if (fetchErr) throw fetchErr;
    const aprovacoes = Array.isArray(current?.aprovacoes) ? current.aprovacoes : [];
    aprovacoes.push({
      id: crypto.randomUUID(),
      user_id: body.approver_id,
      user_name: body.approver_name,
      role: 'manager',
      action: 'rejected',
      justificativa: body.justificativa,
      timestamp: new Date().toISOString(),
    });
    const { data, error } = await supabase.from('purchase_requests')
      .update({ status: 'rejected_manager', aprovacoes })
      .eq('id', id).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    console.error("Error rejecting (manager):", error);
    return c.json({ error: "Failed to reject", details: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.put("/make-server-46b247d8/purchase-requests/:id/approve-director", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { data: current, error: fetchErr } = await supabase.from('purchase_requests').select('aprovacoes, status').eq('id', id).single();
    if (fetchErr) throw fetchErr;
    const st = current?.status;
    if (st !== 'pending_manager' && st !== 'pending_director') {
      return c.json({ error: "Apenas solicitações na 2ª ou 3ª camada podem ser aprovadas aqui", status: st }, 400);
    }
    const aprovacoes = Array.isArray(current?.aprovacoes) ? current.aprovacoes : [];
    aprovacoes.push({
      id: crypto.randomUUID(),
      user_id: body.approver_id,
      user_name: body.approver_name,
      role: 'director',
      action: 'approved',
      timestamp: new Date().toISOString(),
    });
    const { data, error } = await supabase.from('purchase_requests')
      .update({ status: 'in_quotation', aprovacoes })
      .eq('id', id).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    console.error("Error approving (director):", error);
    return c.json({ error: "Failed to approve", details: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.put("/make-server-46b247d8/purchase-requests/:id/reject-director", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { data: current, error: fetchErr } = await supabase.from('purchase_requests').select('aprovacoes, status').eq('id', id).single();
    if (fetchErr) throw fetchErr;
    const st = current?.status;
    if (st !== 'pending_manager' && st !== 'pending_director') {
      return c.json({ error: "Apenas solicitações na 2ª ou 3ª camada podem ser rejeitadas aqui", status: st }, 400);
    }
    const aprovacoes = Array.isArray(current?.aprovacoes) ? current.aprovacoes : [];
    aprovacoes.push({
      id: crypto.randomUUID(),
      user_id: body.approver_id,
      user_name: body.approver_name,
      role: 'director',
      action: 'rejected',
      justificativa: body.justificativa,
      timestamp: new Date().toISOString(),
    });
    const { data, error } = await supabase.from('purchase_requests')
      .update({ status: 'rejected_director', aprovacoes })
      .eq('id', id).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    console.error("Error rejecting (director):", error);
    return c.json({ error: "Failed to reject", details: error instanceof Error ? error.message : String(error) }, 500);
  }
});

// --- Quotations ---
app.get("/make-server-46b247d8/quotations", async (c) => {
  try {
    const { data, error } = await supabase.from('purchase_quotations').select('*').order('created_at', { ascending: false });
    return purchasesListResponse(c, "quotations", error, data as unknown[] | null);
  } catch (error) {
    console.error("quotations GET catch:", error);
    return c.json([]);
  }
});

app.post("/make-server-46b247d8/quotations", async (c) => {
  try {
    const body = await c.req.json();
    const { id, ...rest } = body;
    const { data, error } = await supabase.from('purchase_quotations').insert(rest).select().single();
    if (error) throw error;
    return c.json(data, 201);
  } catch (error) {
    console.error("Error creating quotation:", error);
    return c.json({ error: "Failed to create quotation" }, 500);
  }
});

app.put("/make-server-46b247d8/quotations/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    const { data, error } = await supabase.from('purchase_quotations').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    console.error("Error updating quotation:", error);
    return c.json({ error: "Failed to update quotation" }, 500);
  }
});

app.get("/make-server-46b247d8/purchase-audit-logs", async (c) => {
  try {
    const entityId = c.req.query("entity_id");
    const type = c.req.query("type");
    let query = supabase.from('purchase_audit_logs').select('*').order('timestamp', { ascending: false });
    if (entityId) query = query.eq('entity_id', entityId);
    if (type) query = query.eq('type', type);
    const { data, error } = await query.limit(100);
    if (error) throw error;
    return c.json(data || []);
  } catch (error) {
    console.error("Error fetching purchase audit logs:", error);
    return c.json({ error: "Failed to fetch logs" }, 500);
  }
});

// --- Purchase Orders ---
app.get("/make-server-46b247d8/purchase-orders", async (c) => {
  try {
    let { data, error } = await supabase
      .from("purchase_orders")
      .select("*, purchase_order_approvals(*)")
      .order("created_at", { ascending: false });

    if (error) {
      const retry = await supabase
        .from("purchase_orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (retry.error) {
        console.error("[purchase_orders] GET retry error → []", retry.error);
        return c.json([]);
      }
      data = retry.data;
    }

    const orders = (data || []).map((o: any) => ({
      ...o,
      approvals: o.purchase_order_approvals || [],
      purchase_order_approvals: undefined,
    }));
    return c.json(orders);
  } catch (error) {
    console.error("purchase_orders GET catch:", error);
    return c.json([]);
  }
});

app.post("/make-server-46b247d8/purchase-orders", async (c) => {
  try {
    const body = await c.req.json();
    const { id, ...rest } = body;
    const { data, error } = await supabase.from('purchase_orders').insert(rest).select().single();
    if (error) throw error;
    return c.json(data, 201);
  } catch (error) {
    console.error("Error creating purchase order:", error);
    return c.json({ error: "Failed to create purchase order" }, 500);
  }
});

app.put("/make-server-46b247d8/purchase-orders/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    const { data, error } = await supabase.from('purchase_orders').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    console.error("Error updating purchase order:", error);
    return c.json({ error: "Failed to update purchase order" }, 500);
  }
});

app.post("/make-server-46b247d8/purchase-orders/:id/approve", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { approver_id, approver_name } = body;
    const versao = (await supabase.from('purchase_orders').select('versao').eq('id', id).single()).data?.versao ?? 1;
    await supabase.from('purchase_order_approvals').insert({
      pedido_id: id,
      aprovador_id: approver_id,
      acao: 'aprovado',
      valor_referencia: (await supabase.from('purchase_orders').select('valor_total').eq('id', id).single()).data?.valor_total,
      versao,
    });
    const { data, error } = await supabase.from('purchase_orders').update({ status_aprovacao: 'aprovado' }).eq('id', id).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    console.error("Error approving purchase order:", error);
    return c.json({ error: "Failed to approve purchase order" }, 500);
  }
});

app.post("/make-server-46b247d8/purchase-orders/:id/reject", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { approver_id, approver_name, observacao } = body;
    const versao = (await supabase.from('purchase_orders').select('versao').eq('id', id).single()).data?.versao ?? 1;
    await supabase.from('purchase_order_approvals').insert({
      pedido_id: id,
      aprovador_id: approver_id,
      acao: 'reprovado',
      observacao,
      valor_referencia: (await supabase.from('purchase_orders').select('valor_total').eq('id', id).single()).data?.valor_total,
      versao,
    });
    const { data, error } = await supabase.from('purchase_orders').update({ status_aprovacao: 'reprovado' }).eq('id', id).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    console.error("Error rejecting purchase order:", error);
    return c.json({ error: "Failed to reject purchase order" }, 500);
  }
});

app.post("/make-server-46b247d8/purchase-orders/:id/resend", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { comprador_id } = body;
    const { data: order } = await supabase.from('purchase_orders').select('versao').eq('id', id).single();
    const novaVersao = (order?.versao ?? 1) + 1;
    await supabase.from('purchase_order_approvals').insert({
      pedido_id: id,
      aprovador_id: comprador_id,
      acao: 'reenviado',
      observacao: 'Pedido editado pelo comprador e reenviado para aprovação',
      versao: novaVersao,
    });
    const { data, error } = await supabase.from('purchase_orders').update({
      status_aprovacao: 'em_revisao',
      versao: novaVersao,
    }).eq('id', id).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    console.error("Error resending purchase order:", error);
    return c.json({ error: "Failed to resend purchase order" }, 500);
  }
});

// --- Grupos de acesso por aba (global) ---
app.get("/make-server-46b247d8/access-groups", async (c) => {
  try {
    const { data: groups, error } = await supabase
      .from('access_groups')
      .select('*, access_group_tabs(tab_id), access_group_members(user_id, created_at)')
      .order('nome');
    if (error) throw error;
    const userIds = new Set<string>();
    (groups || []).forEach((g: any) => (g.access_group_members || []).forEach((m: any) => userIds.add(m.user_id)));
    let usersMap: Record<string, string> = {};
    if (userIds.size > 0) {
      const { data: usersData } = await supabase.from('users').select('id, name').in('id', Array.from(userIds));
      (usersData || []).forEach((u: any) => { usersMap[u.id] = u.name; });
    }
    const result = (groups || []).map((g: any) => ({
      id: g.id,
      codigo: g.codigo,
      nome: g.nome,
      descricao: g.descricao,
      tabs: (g.access_group_tabs || []).map((t: any) => t.tab_id),
      members: (g.access_group_members || []).map((m: any) => ({
        userId: m.user_id,
        userName: usersMap[m.user_id] || '—',
        createdAt: m.created_at,
      })),
      createdAt: g.created_at,
    }));
    return c.json(result);
  } catch (error) {
    console.error("Error fetching access groups:", error);
    return c.json({ error: "Failed to fetch groups" }, 500);
  }
});

app.post("/make-server-46b247d8/access-groups", async (c) => {
  try {
    const body = await c.req.json();
    const { codigo, nome, descricao, tabs } = body;
    if (!codigo || !nome) return c.json({ error: "codigo e nome obrigatórios" }, 400);
    const { data: group, error } = await supabase.from('access_groups').insert({ codigo, nome, descricao }).select().single();
    if (error) return c.json({ error: error.message }, 400);
    if (tabs?.length) {
      const rows = tabs.map((t: string) => ({ group_id: group.id, tab_id: t }));
      await supabase.from('access_group_tabs').insert(rows);
    }
    return c.json({ id: group.id, codigo, nome, descricao, tabs: tabs || [], members: [] }, 201);
  } catch {
    return c.json({ error: "Erro ao criar grupo" }, 500);
  }
});

app.put("/make-server-46b247d8/access-groups/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { nome, descricao, tabs } = body;
    const updates: any = {};
    if (nome !== undefined) updates.nome = nome;
    if (descricao !== undefined) updates.descricao = descricao;
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from('access_groups').update(updates).eq('id', id);
      if (error) return c.json({ error: error.message }, 400);
    }
    if (tabs !== undefined) {
      await supabase.from('access_group_tabs').delete().eq('group_id', id);
      if (tabs.length > 0) {
        const rows = tabs.map((t: string) => ({ group_id: id, tab_id: t }));
        await supabase.from('access_group_tabs').insert(rows);
      }
    }
    return c.json({ success: true });
  } catch {
    return c.json({ error: "Erro ao atualizar grupo" }, 500);
  }
});

app.delete("/make-server-46b247d8/access-groups/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const { error } = await supabase.from('access_groups').delete().eq('id', id);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true });
  } catch {
    return c.json({ error: "Erro ao excluir grupo" }, 500);
  }
});

app.post("/make-server-46b247d8/access-groups/:id/members", async (c) => {
  try {
    const groupId = c.req.param("id");
    const body = await c.req.json();
    const userId = body.user_id ?? body.userId;
    if (!userId) return c.json({ error: "userId obrigatório" }, 400);
    const { data, error } = await supabase.from('access_group_members').insert({ group_id: groupId, user_id: userId }).select().single();
    if (error) return c.json({ error: error.message }, 400);
    return c.json(data, 201);
  } catch {
    return c.json({ error: "Erro ao adicionar membro" }, 500);
  }
});

app.delete("/make-server-46b247d8/access-groups/:groupId/members/:userId", async (c) => {
  try {
    const groupId = c.req.param("groupId");
    const userId = c.req.param("userId");
    const { error } = await supabase.from('access_group_members').delete().eq('group_id', groupId).eq('user_id', userId);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true });
  } catch {
    return c.json({ error: "Erro ao remover membro" }, 500);
  }
});

// Retorna grupos e abas extras do usuário (para edição)
app.get("/make-server-46b247d8/user-access/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const membersRes = await supabase.from('access_group_members').select('group_id').eq('user_id', userId);
    const groupIds = (membersRes.data || []).map((m: any) => m.group_id);
    let extraTabs: string[] = [];
    const extraRes = await supabase.from('user_extra_tabs').select('tab_id').eq('user_id', userId);
    if (!extraRes.error) extraTabs = (extraRes.data || []).map((r: any) => r.tab_id);
    return c.json({ groupIds, extraTabs });
  } catch {
    return c.json({ groupIds: [], extraTabs: [] });
  }
});

// Atualiza grupos e abas extras do usuário
app.put("/make-server-46b247d8/user-access/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const body = await c.req.json();
    const groupIdsRaw = Array.isArray(body.groupIds)
      ? body.groupIds
      : Array.isArray(body.group_ids)
        ? body.group_ids
        : [];
    const extraTabsRaw = Array.isArray(body.extraTabs)
      ? body.extraTabs
      : Array.isArray(body.extra_tabs)
        ? body.extra_tabs
        : [];
    const groupIds = groupIdsRaw.filter((gid: string) => gid != null && String(gid).trim() !== '');
    const extraTabs = extraTabsRaw.filter((tid: string) => tid != null && String(tid).trim() !== '');

    const { error: delErr } = await supabase
      .from('access_group_members')
      .delete()
      .eq('user_id', userId);
    if (delErr) return c.json({ error: delErr.message }, 400);

    if (groupIds.length > 0) {
      const rows = groupIds.map((gid: string) => ({ group_id: gid, user_id: userId }));
      const { error: insErr } = await supabase.from('access_group_members').insert(rows);
      if (insErr) return c.json({ error: insErr.message }, 400);
    }

    const { error: delExtraErr } = await supabase.from('user_extra_tabs').delete().eq('user_id', userId);
    if (delExtraErr) return c.json({ error: delExtraErr.message }, 400);
    if (extraTabs.length > 0) {
      const rows = extraTabs.map((tid: string) => ({ user_id: userId, tab_id: tid }));
      const { error: insExtraErr } = await supabase.from('user_extra_tabs').insert(rows);
      if (insExtraErr) return c.json({ error: insExtraErr.message }, 400);
    }

    return c.json({ success: true });
  } catch (e) {
    console.error("user-access PUT error:", e);
    return c.json({ error: "Erro ao atualizar acesso" }, 500);
  }
});

app.get("/make-server-46b247d8/user-allowed-tabs/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const membersRes = await supabase.from('access_group_members').select('group_id').eq('user_id', userId);
    const groupIds = (membersRes.data || []).map((m: any) => m.group_id);
    let extraTabs: string[] = [];
    const extraRes = await supabase.from('user_extra_tabs').select('tab_id').eq('user_id', userId);
    if (!extraRes.error) extraTabs = (extraRes.data || []).map((r: any) => r.tab_id);

    let tabs: string[] = [...extraTabs];
    if (groupIds.length > 0) {
      const { data: tabRows } = await supabase
        .from('access_group_tabs')
        .select('tab_id')
        .in('group_id', groupIds);
      const groupTabs = (tabRows || []).map((t: any) => t.tab_id);
      tabs = [...new Set([...tabs, ...groupTabs])];
    }
    return c.json({ allowedTabs: tabs });
  } catch {
    return c.json({ allowedTabs: [] });
  }
});

// --- Receivings ---
app.get("/make-server-46b247d8/receivings", async (c) => {
  try {
    const { data, error } = await supabase.from('purchase_receivings').select('*').order('created_at', { ascending: false });
    return purchasesListResponse(c, "receivings", error, data as unknown[] | null);
  } catch (error) {
    console.error("receivings GET catch:", error);
    return c.json([]);
  }
});

app.post("/make-server-46b247d8/receivings", async (c) => {
  try {
    const body = await c.req.json();
    const { id, ...rest } = body;
    const { data, error } = await supabase.from('purchase_receivings').insert(rest).select().single();
    if (error) throw error;
    return c.json(data, 201);
  } catch (error) {
    console.error("Error creating receiving:", error);
    return c.json({ error: "Failed to create receiving" }, 500);
  }
});

Deno.serve(app.fetch);