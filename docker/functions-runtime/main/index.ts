// Bootstrap "main service" cho edge-runtime TỰ HOST.
//
// Sao y mẫu chính thức supabase/docker (volumes/functions/main/index.ts), đơn
// giản hoá: self-host dùng JWT đối xứng HS256 nên chỉ cần nhánh legacy. Mỗi
// request /functions/v1/<tên> được strip prefix bởi Kong (docker/kong.yml) rồi
// dispatch vào user worker đúng function trong supabase/functions/.
//
// File này nằm ở docker/ (KHÔNG nằm trong supabase/functions/) để CLI
// `supabase functions deploy` của bản cloud không nhầm nó là một function.

const JWT_SECRET = Deno.env.get('JWT_SECRET')
const VERIFY_JWT = Deno.env.get('VERIFY_JWT') === 'true'

console.log('main function started')

type AuthFailure = { code: string; message?: string }

function getAuthToken(req: Request): string | AuthFailure {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return { code: 'UNAUTHORIZED_NO_AUTH_HEADER', message: 'Missing authorization header' }
  }
  const tokenParts = authHeader.trim().split(/\s+/)
  const [bearer, token] = tokenParts
  if (bearer.toLowerCase() !== 'bearer' || tokenParts.length !== 2 || !token) {
    return { code: 'UNAUTHORIZED_INVALID_JWT_FORMAT', message: 'Invalid JWT format' }
  }
  return token
}

async function verify(jwt: string): Promise<AuthFailure | null> {
  if (!JWT_SECRET) {
    return { code: 'UNAUTHORIZED_LEGACY_JWT', message: 'JWT_SECRET not configured' }
  }
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  const parts = jwt.split('.')
  if (parts.length !== 3) {
    return { code: 'UNAUTHORIZED_INVALID_JWT_FORMAT', message: 'Invalid JWT format' }
  }
  // HS256: base64url(header).base64url(payload).base64url(HMAC-SHA256)
  const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  let sigBytes: Uint8Array
  try {
    const b64 = parts[2].replace(/-/g, '+').replace(/_/g, '/')
    const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
    sigBytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  } catch {
    return { code: 'UNAUTHORIZED_INVALID_JWT_FORMAT', message: 'Invalid JWT signature encoding' }
  }
  const ok = await crypto.subtle.verify('HMAC', key, sigBytes, data)
  return ok ? null : { code: 'UNAUTHORIZED_LEGACY_JWT', message: 'Invalid JWT' }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  if (VERIFY_JWT) {
    const token = getAuthToken(req)
    if (typeof token !== 'string') {
      return Response.json(token, {
        status: 401,
        headers: { 'sb-error-code': token.code, 'Access-Control-Expose-Headers': 'sb-error-code' },
      })
    }
    const failure = await verify(token)
    if (failure) {
      return Response.json(failure, {
        status: 401,
        headers: {
          'sb-error-code': failure.code,
          'Access-Control-Expose-Headers': 'sb-error-code',
        },
      })
    }
  }

  const url = new URL(req.url)
  const { pathname } = url
  const service_name = pathname.split('/')[1]

  if (!service_name) {
    return Response.json({ msg: 'missing function name in request' }, { status: 400 })
  }

  // Function Splitz nằm ở /home/deno/functions (ro); bootstrap + import map
  // mount RIÊNG ở /main và /deno.jsonc — không lồng mount vào mount read-only.
  const servicePath = `/home/deno/functions/${service_name}`
  console.error(`serving the request with ${servicePath}`)

  const memoryLimitMb = 150
  const workerTimeoutMs = 1 * 60 * 1000
  const noModuleCache = false
  const importMapPath = '/deno.jsonc'
  const envVarsObj = { ...Deno.env.toObject(), SUPABASE_FUNCTION_SLUG: service_name }
  const envVars = Object.keys(envVarsObj).map((k) => [k, envVarsObj[k]])

  try {
    const worker = await EdgeRuntime.userWorkers.create({
      servicePath,
      memoryLimitMb,
      workerTimeoutMs,
      noModuleCache,
      importMapPath,
      envVars,
    })
    return await worker.fetch(req)
  } catch (e) {
    return Response.json({ msg: e.toString() }, { status: 500 })
  }
})
