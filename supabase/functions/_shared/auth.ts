// Validação flexível de Authorization header em Edge Functions:
//
// Aceita 2 modos:
//   A) Bearer <SUPABASE_SERVICE_ROLE_KEY>         → identidade de sistema (webhook, cron)
//   B) Bearer <user_jwt>                           → JWT de usuário do Supabase Auth.
//      Nesse caso, valida que o usuário existe e tem role compatível (default:
//      admin/comprador/diretor).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

export type AuthOk =
  | { tipo: 'service' }
  | { tipo: 'user'; userId: string; role: string }

export interface ValidaAuthOpts {
  rolesPermitidos?: string[]
}

export async function validaAuth(
  req: Request,
  opts: ValidaAuthOpts = {},
): Promise<AuthOk | Response> {
  const auth = req.headers.get('Authorization') ?? ''
  if (!auth.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    })
  }
  const token = auth.slice(7)

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  if (token === serviceKey) return { tipo: 'service' }

  // Validação como JWT de usuário
  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const supa = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: auth } },
  })

  const { data: userData, error: userErr } = await supa.auth.getUser(token)
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: 'invalid_token' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    })
  }

  const { data: profile } = await supa
    .from('profiles')
    .select('role, ativo')
    .eq('id', userData.user.id)
    .maybeSingle()

  const roles = opts.rolesPermitidos ?? ['admin', 'comprador', 'diretor']
  if (!profile || !profile.ativo || !roles.includes(profile.role as string)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    })
  }

  return { tipo: 'user', userId: userData.user.id, role: profile.role as string }
}
