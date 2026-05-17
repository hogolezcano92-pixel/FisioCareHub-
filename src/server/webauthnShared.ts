import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'node:crypto';

export const COOKIE_NAME = 'fch_webauthn_challenge';
const COOKIE_MAX_AGE_SECONDS = 5 * 60;

type ChallengePayload = {
  purpose: 'registration' | 'login';
  challenge: string;
  userId?: string;
  email?: string;
  exp: number;
};

export function json(res: VercelResponse, status: number, body: Record<string, unknown>) {
  return res.status(status).json(body);
}

export function assertMethod(req: VercelRequest, res: VercelResponse, allowed: string[]) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', allowed.concat('OPTIONS').join(','));
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return res.status(200).end();
  }

  if (!req.method || !allowed.includes(req.method)) {
    res.setHeader('Allow', allowed.join(','));
    json(res, 405, { error: 'Método não permitido.' });
    return false;
  }

  return true;
}

export function getRequestBody<T = any>(req: VercelRequest): T {
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as T;
    } catch {
      return {} as T;
    }
  }

  return (req.body || {}) as T;
}

export function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    'https://exciqetztunqgxbwwodo.supabase.co';

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE;

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada na Vercel.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function getAccessToken(req: VercelRequest) {
  const auth = req.headers.authorization;
  if (!auth || Array.isArray(auth)) return null;
  const [scheme, token] = auth.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

export async function getUserFromBearer(req: VercelRequest) {
  const accessToken = getAccessToken(req);
  if (!accessToken) return { user: null, error: 'Sessão não enviada.' };

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    return { user: null, error: 'Sessão inválida ou expirada.' };
  }

  return { user: data.user, error: null };
}

export function getWebAuthnConfig(req: VercelRequest) {
  const forwardedHost = req.headers['x-forwarded-host'];
  const rawHost = Array.isArray(forwardedHost)
    ? forwardedHost[0]
    : forwardedHost || req.headers.host || 'localhost:3000';

  const host = String(rawHost).split(',')[0].trim();
  const hostname = host.split(':')[0];

  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto || (hostname === 'localhost' ? 'http' : 'https');

  return {
    rpID: hostname,
    origin: `${proto}://${host}`,
    rpName: 'FisioCareHub',
    isLocalhost: hostname === 'localhost' || hostname === '127.0.0.1',
  };
}

function getCookieSecret() {
  return (
    process.env.WEBAUTHN_COOKIE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    'fisiocarehub-dev-cookie-secret'
  );
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(value: string) {
  return createHmac('sha256', getCookieSecret()).update(value).digest('base64url');
}

export function setChallengeCookie(req: VercelRequest, res: VercelResponse, payload: Omit<ChallengePayload, 'exp'>) {
  const { isLocalhost } = getWebAuthnConfig(req);
  const fullPayload: ChallengePayload = {
    ...payload,
    exp: Date.now() + COOKIE_MAX_AGE_SECONDS * 1000,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = sign(encodedPayload);
  const cookieValue = `${encodedPayload}.${signature}`;

  const parts = [
    `${COOKIE_NAME}=${cookieValue}`,
    'Path=/api/auth/webauthn',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
  ];

  if (!isLocalhost) parts.push('Secure');

  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearChallengeCookie(req: VercelRequest, res: VercelResponse) {
  const { isLocalhost } = getWebAuthnConfig(req);
  const parts = [
    `${COOKIE_NAME}=`,
    'Path=/api/auth/webauthn',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];

  if (!isLocalhost) parts.push('Secure');

  res.setHeader('Set-Cookie', parts.join('; '));
}

export function readChallengeCookie(req: VercelRequest, expectedPurpose: ChallengePayload['purpose']) {
  const cookieHeader = req.headers.cookie || '';
  const cookies = Object.fromEntries(
    cookieHeader
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=');
        return index === -1 ? [part, ''] : [part.slice(0, index), part.slice(index + 1)];
      })
  );

  const rawCookie = cookies[COOKIE_NAME];
  if (!rawCookie || !rawCookie.includes('.')) return null;

  const [encodedPayload, providedSignature] = rawCookie.split('.');
  const expectedSignature = sign(encodedPayload);

  const provided = Buffer.from(providedSignature || '', 'base64url');
  const expected = Buffer.from(expectedSignature, 'base64url');

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as ChallengePayload;
    if (payload.purpose !== expectedPurpose) return null;
    if (!payload.challenge || !payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function isValidBase64URL(value: unknown) {
  return typeof value === 'string' && value.length > 0 && /^[A-Za-z0-9_-]+$/.test(value);
}

export function parseTransports(value: unknown) {
  if (!value || typeof value !== 'string') return undefined;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function safeError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
