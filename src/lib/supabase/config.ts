/**
 * Credenciais públicas do Supabase.
 *
 * A URL e a chave "publishable" são públicas por design — elas vão no bundle do
 * navegador e a segurança dos dados é feita pelo RLS no banco. Por isso podem
 * ficar como padrão aqui, garantindo que o build funcione mesmo sem variáveis de
 * ambiente configuradas. Em desenvolvimento, o .env.local tem prioridade.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://iuzemkdubvmyvdbprjpp.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_Qt9MIUmGmFG6-nqfV4AfOw_4p9yuZ-x";
