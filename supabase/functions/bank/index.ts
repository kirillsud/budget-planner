// Bank balance sync through Enable Banking (account information only, read-only).
// Every user brings their own Enable Banking application (id + private key); the key is kept in
// Supabase Vault and read here with the service role. The browser never receives it back.
//
// Actions (POST JSON {action, ...}):
//   save-credentials {appId, privateKey}   validate against Enable Banking and store
//   clear-credentials                      disconnect everything and wipe the key
//   aspsps {country}                       list banks
//   start {aspspName, country, redirectUrl} begin consent, returns the bank URL
//   callback {code, state}                 finish consent, pick the account or ask to choose
//   choose-account {connectionId, accountUid}
//   refresh {force?}                       user present: update the balance (throttled)
//   disconnect {connectionId}
//   cron-refresh                           background refresh, authorised by x-cron-secret
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { SignJWT, importPKCS8 } from 'npm:jose@5'

const API = 'https://api.enablebanking.com'
const REFRESH_THROTTLE_MS = 10 * 60 * 1000
const MAX_CONSENT_SECONDS = 180 * 24 * 3600
const BALANCE_PREFERENCE = ['ITAV', 'CLAV', 'XPCD', 'ITBD', 'CLBD', 'OPAV', 'OPBD']

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

const admin: SupabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

// ---------- keys and JWT ----------

function derLength(n: number): Uint8Array {
  if (n < 0x80) return new Uint8Array([n])
  const bytes: number[] = []
  while (n > 0) {
    bytes.unshift(n & 0xff)
    n >>= 8
  }
  return new Uint8Array([0x80 | bytes.length, ...bytes])
}

function der(tag: number, content: Uint8Array): Uint8Array {
  const len = derLength(content.length)
  const out = new Uint8Array(1 + len.length + content.length)
  out[0] = tag
  out.set(len, 1)
  out.set(content, 1 + len.length)
  return out
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let i = 0
  for (const p of parts) {
    out.set(p, i)
    i += p.length
  }
  return out
}

function b64(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

/** Accepts PKCS#8 ("BEGIN PRIVATE KEY") or PKCS#1 ("BEGIN RSA PRIVATE KEY") and returns PKCS#8 PEM. */
function toPkcs8(pem: string): string {
  const text = pem.trim()
  if (text.includes('BEGIN PRIVATE KEY')) return text
  if (!text.includes('BEGIN RSA PRIVATE KEY')) throw new HttpError(400, 'bad_key', 'Not a PEM private key')
  const body = text.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  const pkcs1 = Uint8Array.from(atob(body), (c) => c.charCodeAt(0))
  const version = new Uint8Array([0x02, 0x01, 0x00])
  // SEQUENCE { OID 1.2.840.113549.1.1.1 (rsaEncryption), NULL }
  const algorithm = new Uint8Array([0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00])
  const pkcs8 = der(0x30, concat(version, algorithm, der(0x04, pkcs1)))
  const lines = b64(pkcs8).match(/.{1,64}/g) ?? []
  return `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`
}

async function apiToken(appId: string, privateKeyPem: string): Promise<string> {
  let key
  try {
    key = await importPKCS8(toPkcs8(privateKeyPem), 'RS256')
  } catch (e) {
    if (e instanceof HttpError) throw e
    throw new HttpError(400, 'bad_key', 'The private key could not be read')
  }
  const now = Math.floor(Date.now() / 1000)
  return await new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: appId })
    .setIssuer('enablebanking.com')
    .setAudience('api.enablebanking.com')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key)
}

interface Creds {
  appId: string
  token: string
}

async function credsFor(userId: string): Promise<Creds> {
  const { data, error } = await admin.rpc('bank_get_credentials', { p_user: userId })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  if (!row?.app_id || !row?.private_key) throw new HttpError(409, 'no_credentials', 'Enable Banking keys are not set')
  return { appId: row.app_id, token: await apiToken(row.app_id, row.private_key) }
}

async function eb<T>(creds: Pick<Creds, 'token'>, method: string, path: string, body?: unknown, extraHeaders: Record<string, string> = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${creds.token}`, 'Content-Type': 'application/json', ...extraHeaders },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let payload: any = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = { message: text }
  }
  if (!res.ok) {
    const message = payload?.message ?? payload?.detail ?? `Enable Banking error ${res.status}`
    const code = res.status === 401 ? 'unauthorized' : payload?.error ?? `http_${res.status}`
    throw new HttpError(res.status === 401 || res.status === 403 ? res.status : 502, String(code), String(message))
  }
  return payload as T
}

// ---------- helpers ----------

/** "1234.5" -> 123450 cents; handles signs and more than two decimals by rounding. */
function toCents(amount: string): number {
  const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(amount.trim())
  if (!m) throw new Error(`Unexpected amount ${amount}`)
  const frac = (m[3] ?? '').padEnd(3, '0')
  const cents = Number(m[2]) * 100 + Number(frac.slice(0, 2)) + (Number(frac[2]) >= 5 ? 1 : 0)
  return m[1] === '-' ? -cents : cents
}

interface EbBalance {
  balance_amount: { amount: string; currency: string }
  balance_type: string
}

function pickBalance(balances: EbBalance[]): EbBalance | null {
  if (!balances?.length) return null
  for (const type of BALANCE_PREFERENCE) {
    const found = balances.find((b) => b.balance_type === type)
    if (found) return found
  }
  return balances[0]
}

/** PSU headers tell the bank the user is present. Either all headers the bank requires, or none. */
function psuHeaders(req: Request, required: string[]): Record<string, string> {
  const available: Record<string, string | null> = {
    'psu-ip-address': (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null,
    'psu-user-agent': req.headers.get('user-agent'),
    'psu-referer': req.headers.get('referer') ?? req.headers.get('origin'),
    'psu-accept': req.headers.get('accept'),
    'psu-accept-charset': req.headers.get('accept-charset'),
    'psu-accept-encoding': req.headers.get('accept-encoding'),
    'psu-accept-language': req.headers.get('accept-language'),
    'psu-geo-location': null,
  }
  const wanted = required.length ? required.map((h) => h.toLowerCase()) : ['psu-ip-address', 'psu-user-agent']
  const out: Record<string, string> = {}
  for (const h of wanted) {
    const value = available[h]
    if (!value) return {}
    out[h] = value
  }
  return out
}

function ibanTail(iban?: string | null): string | null {
  return iban ? iban.replace(/\s+/g, '').slice(-4) : null
}

async function userFrom(req: Request): Promise<string> {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) throw new HttpError(401, 'unauthorized', 'Sign in first')
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) throw new HttpError(401, 'unauthorized', 'Sign in first')
  return data.user.id
}

async function setBalance(userId: string, cents: number) {
  const { error } = await admin
    .from('settings')
    .update({ balance: cents, balance_source: 'bank', balance_updated_at: new Date().toISOString() })
    .eq('user_id', userId)
  if (error) throw error
}

async function refreshConnection(conn: any, req: Request | null): Promise<{ balance: number | null; error?: string }> {
  if (!conn.account_uid) return { balance: null }
  if (conn.valid_until && new Date(conn.valid_until).getTime() < Date.now()) {
    await admin.from('bank_connections').update({ status: 'expired' }).eq('id', conn.id)
    await admin.from('settings').update({ balance_source: 'manual' }).eq('user_id', conn.user_id)
    return { balance: null, error: 'expired' }
  }
  try {
    const creds = await credsFor(conn.user_id)
    const headers = req ? psuHeaders(req, conn.required_psu_headers ?? []) : {}
    const res = await eb<{ balances: EbBalance[] }>(creds, 'GET', `/accounts/${conn.account_uid}/balances`, undefined, headers)
    const picked = pickBalance(res.balances)
    if (!picked) throw new HttpError(502, 'no_balance', 'The bank returned no balance')
    const cents = toCents(picked.balance_amount.amount)
    await admin
      .from('bank_connections')
      .update({
        last_balance: cents,
        last_balance_at: new Date().toISOString(),
        currency: picked.balance_amount.currency,
        last_error: null,
        status: 'active',
      })
      .eq('id', conn.id)
    await setBalance(conn.user_id, cents)
    return { balance: cents }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    // the bank or Enable Banking refused the session: consent expired or was withdrawn
    const expired = e instanceof HttpError && (e.status === 401 || e.status === 403)
    await admin
      .from('bank_connections')
      .update({ last_error: message.slice(0, 500), ...(expired ? { status: 'expired' } : {}) })
      .eq('id', conn.id)
    if (expired) await admin.from('settings').update({ balance_source: 'manual' }).eq('user_id', conn.user_id)
    return { balance: null, error: message }
  }
}

async function activeConnection(userId: string) {
  const { data } = await admin
    .from('bank_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

// ---------- actions ----------

async function handle(req: Request, body: any) {
  const action = body?.action

  if (action === 'cron-refresh') {
    const { data: secret } = await admin.rpc('bank_cron_secret')
    if (!secret || req.headers.get('x-cron-secret') !== secret) throw new HttpError(401, 'unauthorized', 'Bad cron secret')
    const { data: conns } = await admin.from('bank_connections').select('*').eq('status', 'active')
    let ok = 0
    for (const conn of conns ?? []) if ((await refreshConnection(conn, null)).balance !== null) ok++
    return { refreshed: ok, total: conns?.length ?? 0 }
  }

  const userId = await userFrom(req)

  switch (action) {
    case 'save-credentials': {
      const appId = String(body.appId ?? '').trim()
      const privateKey = String(body.privateKey ?? '').trim()
      if (!/^[0-9a-f-]{20,64}$/i.test(appId)) throw new HttpError(400, 'bad_app_id', 'Application ID looks wrong')
      const token = await apiToken(appId, privateKey)
      let app: any
      try {
        app = await eb<any>({ token }, 'GET', '/application')
      } catch (e) {
        if (e instanceof HttpError && (e.status === 401 || e.status === 403)) {
          throw new HttpError(400, 'rejected', 'Enable Banking rejected this application ID and key')
        }
        throw e
      }
      const { error } = await admin.rpc('bank_set_credentials', { p_user: userId, p_app_id: appId, p_private_key: privateKey })
      if (error) throw error
      return { ok: true, appName: app?.name ?? null, redirectUrls: app?.redirect_urls ?? [], environment: app?.environment ?? null }
    }

    case 'clear-credentials': {
      const { data: conns } = await admin.from('bank_connections').select('*').eq('user_id', userId).in('status', ['active', 'choose_account'])
      try {
        const creds = await credsFor(userId)
        for (const c of conns ?? []) if (c.session_id) await eb(creds, 'DELETE', `/sessions/${c.session_id}`).catch(() => null)
      } catch {
        // keys already unusable: nothing to revoke remotely
      }
      await admin.from('bank_connections').update({ status: 'revoked', session_id: null }).eq('user_id', userId).neq('status', 'revoked')
      await admin.from('settings').update({ balance_source: 'manual' }).eq('user_id', userId)
      const { error } = await admin.rpc('bank_clear_credentials', { p_user: userId })
      if (error) throw error
      return { ok: true }
    }

    case 'aspsps': {
      const creds = await credsFor(userId)
      const country = String(body.country ?? 'NL').toUpperCase()
      const res = await eb<{ aspsps: any[] }>(creds, 'GET', `/aspsps?country=${encodeURIComponent(country)}&psu_type=personal&service=AIS`)
      return {
        aspsps: (res.aspsps ?? []).map((a) => ({ name: a.name, country: a.country, logo: a.logo ?? null })),
      }
    }

    case 'start': {
      const creds = await credsFor(userId)
      const country = String(body.country ?? 'NL').toUpperCase()
      const aspspName = String(body.aspspName ?? '')
      const redirectUrl = String(body.redirectUrl ?? '')
      if (!aspspName || !/^https?:\/\//.test(redirectUrl)) throw new HttpError(400, 'bad_request', 'Bank and redirect URL are required')
      const list = await eb<{ aspsps: any[] }>(creds, 'GET', `/aspsps?country=${encodeURIComponent(country)}&psu_type=personal&service=AIS`)
      const aspsp = (list.aspsps ?? []).find((a) => a.name === aspspName)
      if (!aspsp) throw new HttpError(404, 'unknown_bank', 'Bank not found')
      const maxSeconds = Math.min(Number(aspsp.maximum_consent_validity ?? MAX_CONSENT_SECONDS), MAX_CONSENT_SECONDS)
      const validUntil = new Date(Date.now() + (maxSeconds - 3600) * 1000).toISOString()
      const state = crypto.randomUUID()
      const { data: conn, error } = await admin
        .from('bank_connections')
        .insert({
          user_id: userId,
          status: 'pending',
          auth_state: state,
          aspsp_name: aspsp.name,
          aspsp_country: aspsp.country,
          required_psu_headers: aspsp.required_psu_headers ?? [],
        })
        .select('id')
        .single()
      if (error) throw error
      const auth = await eb<{ url: string }>(creds, 'POST', '/auth', {
        access: { valid_until: validUntil },
        aspsp: { name: aspsp.name, country: aspsp.country },
        state,
        redirect_url: redirectUrl,
        psu_type: 'personal',
      })
      return { url: auth.url, connectionId: conn.id }
    }

    case 'callback': {
      const state = String(body.state ?? '')
      const code = String(body.code ?? '')
      const { data: conn } = await admin
        .from('bank_connections')
        .select('*')
        .eq('auth_state', state)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .maybeSingle()
      if (!conn) throw new HttpError(404, 'unknown_state', 'This bank link is not valid any more, start again')
      const creds = await credsFor(userId)
      const session = await eb<any>(creds, 'POST', '/sessions', { code })
      const accounts = (session.accounts ?? []).map((a: any) => ({
        uid: a.uid,
        name: a.name ?? a.product ?? null,
        ibanTail: ibanTail(a.account_id?.iban),
        currency: a.currency ?? null,
      }))
      // a new consent replaces older ones
      await admin.from('bank_connections').update({ status: 'revoked' }).eq('user_id', userId).eq('status', 'active')
      const single = accounts.length === 1 ? accounts[0] : null
      const { data: updated, error } = await admin
        .from('bank_connections')
        .update({
          session_id: session.session_id,
          valid_until: session.access?.valid_until ?? null,
          accounts,
          auth_state: null,
          status: single ? 'active' : 'choose_account',
          account_uid: single?.uid ?? null,
          account_name: single?.name ?? null,
          account_iban_tail: single?.ibanTail ?? null,
          currency: single?.currency ?? null,
        })
        .eq('id', conn.id)
        .select('*')
        .single()
      if (error) throw error
      if (single) {
        const r = await refreshConnection(updated, req)
        return { status: 'active', balance: r.balance, error: r.error ?? null }
      }
      return { status: 'choose_account', connectionId: conn.id, accounts }
    }

    case 'choose-account': {
      const { data: conn } = await admin
        .from('bank_connections')
        .select('*')
        .eq('id', body.connectionId)
        .eq('user_id', userId)
        .in('status', ['choose_account', 'active'])
        .maybeSingle()
      if (!conn) throw new HttpError(404, 'not_found', 'Connection not found')
      const account = (conn.accounts ?? []).find((a: any) => a.uid === body.accountUid)
      if (!account) throw new HttpError(400, 'bad_account', 'Account not found')
      const { data: updated, error } = await admin
        .from('bank_connections')
        .update({
          status: 'active',
          account_uid: account.uid,
          account_name: account.name,
          account_iban_tail: account.ibanTail,
          currency: account.currency,
        })
        .eq('id', conn.id)
        .select('*')
        .single()
      if (error) throw error
      const r = await refreshConnection(updated, req)
      return { status: 'active', balance: r.balance, error: r.error ?? null }
    }

    case 'refresh': {
      const conn = await activeConnection(userId)
      if (!conn) return { status: 'none' }
      const fresh = conn.last_balance_at && Date.now() - new Date(conn.last_balance_at).getTime() < REFRESH_THROTTLE_MS
      if (fresh && !body.force) return { status: 'fresh', balance: conn.last_balance }
      const r = await refreshConnection(conn, req)
      return { status: r.error ? 'error' : 'updated', balance: r.balance, error: r.error ?? null }
    }

    case 'disconnect': {
      const { data: conn } = await admin
        .from('bank_connections')
        .select('*')
        .eq('id', body.connectionId)
        .eq('user_id', userId)
        .maybeSingle()
      if (!conn) throw new HttpError(404, 'not_found', 'Connection not found')
      if (conn.session_id) {
        try {
          await eb(await credsFor(userId), 'DELETE', `/sessions/${conn.session_id}`)
        } catch {
          // already expired or keys removed: still disconnect locally
        }
      }
      await admin.from('bank_connections').update({ status: 'revoked', session_id: null }).eq('id', conn.id)
      await admin.from('settings').update({ balance_source: 'manual' }).eq('user_id', userId)
      return { ok: true }
    }

    default:
      throw new HttpError(400, 'unknown_action', `Unknown action ${action}`)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST only', code: 'method' }, 405)
  try {
    const body = await req.json().catch(() => ({}))
    return json(await handle(req, body))
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message, code: e.code }, e.status)
    console.error(e)
    return json({ error: e instanceof Error ? e.message : 'Internal error', code: 'internal' }, 500)
  }
})
