// CORS dùng chung cho Edge Functions. Cho phép origin của app (cấu hình qua
// biến môi trường APP_ORIGINS — danh sách phân tách bằng dấu phẩy). Mặc định '*'
// chỉ nên dùng khi phát triển.
const ALLOWED = (Deno.env.get('APP_ORIGINS') ?? '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

export function corsHeaders(origin: string | null): Record<string, string> {
  const allowAll = ALLOWED.includes('*')
  const allow = allowAll ? '*' : ALLOWED.includes(origin ?? '') ? (origin as string) : ALLOWED[0] ?? '*'
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}
