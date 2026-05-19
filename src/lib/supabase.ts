import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórios no .env')
}

/**
 * Lock no-op para o GoTrue.
 *
 * Por padrão o Supabase JS usa `navigator.locks` para sincronizar o refresh
 * de token entre abas. Quando uma aba antiga (ou um getSession() pendente)
 * mantém o lock, TODAS as queries de TODAS as abas ficam pendurando
 * indefinidamente até esse lock liberar (foi o que travou o app — refresh
 * estava demorando ~7s e bloqueando todas as RPCs). Como o app já lida bem
 * com sessão inválida (reage em `onAuthStateChange` e o failsafe do
 * AuthContext), é seguro desligar a fila global e deixar cada aba
 * refrescar o seu próprio token sem disputa entre abas.
 */
async function noopLock<R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
  return fn()
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: noopLock,
    lockAcquireTimeout: 0,
  },
})
