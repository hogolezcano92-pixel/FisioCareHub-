import { supabase } from './supabase';

/**
 * Helper to ensure we only load the browser library on the client side.
 */
async function loadSwa() {
  if (typeof window === 'undefined') return null;
  return await import('@simplewebauthn/browser');
}

function getFriendlyWebAuthnError(err: any) {
  const message = String(err?.message || err || '');

  if (err?.name === 'NotAllowedError') {
    return 'Operação cancelada ou não suportada neste dispositivo.';
  }

  if (message.includes('expected pattern')) {
    return 'O navegador recusou as opções de biometria deste domínio. Atualize a página e tente novamente.';
  }

  return message || 'Erro inesperado na biometria.';
}

async function readJsonResponse<T = any>(response: Response, fallbackMessage: string): Promise<T> {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.toLowerCase().includes('application/json')) {
    const text = await response.text().catch(() => '');

    if (text.toLowerCase().includes('<!doctype')) {
      throw new Error(
        'A rota de biometria retornou HTML em vez de JSON. Verifique o vercel.json para não redirecionar /api para index.html.'
      );
    }

    throw new Error(fallbackMessage);
  }

  return await response.json();
}

export async function registerBiometrics() {
  try {
    const swa = await loadSwa();
    if (!swa) throw new Error('Biometria só pode ser registrada no navegador.');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Usuário não autenticado');

    // 1. Get options from server
    const optionsRes = await fetch('/api/auth/webauthn/registration-options', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!optionsRes.ok) {
      const err = await readJsonResponse(optionsRes, 'Erro ao obter opções de registro').catch(() => null);
      throw new Error(err?.error || 'Erro ao obter opções de registro');
    }

    const options = await readJsonResponse(optionsRes, 'Erro ao obter opções de registro');

    /**
     * Segurança extra para Safari/iOS:
     * quando rp.id vem na resposta, alguns cenários com domínio customizado,
     * www e proxy da Vercel podem gerar "The string did not match the expected pattern".
     * Sem rp.id, o navegador usa automaticamente o domínio atual da página.
     */
    if (options?.rp?.id) {
      delete options.rp.id;
    }

    // 2. Start WebAuthn ceremony
    const registrationResponse = await swa.startRegistration({ optionsJSON: options });

    // 3. Verify on server
    const verifyRes = await fetch('/api/auth/webauthn/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(registrationResponse),
    });

    if (!verifyRes.ok) {
      const err = await readJsonResponse(verifyRes, 'Erro ao verificar registro biométrico').catch(() => null);
      throw new Error(err?.error || 'Erro ao verificar registro biométrico');
    }

    return await readJsonResponse(verifyRes, 'Erro ao verificar registro biométrico');
  } catch (err: any) {
    console.error('WebAuthn Error:', err);
    throw new Error(getFriendlyWebAuthnError(err));
  }
}

export async function loginWithBiometrics(email: string) {
  try {
    const swa = await loadSwa();
    if (!swa) throw new Error('Biometria só pode ser utilizada no navegador.');

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Get options from server
    // Fluxo principal: POST. Se a Vercel devolver 405 por cache/rota antiga,
    // tentamos uma única vez por GET para não travar o Face ID.
    let optionsRes = await fetch('/api/auth/webauthn/login-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail }),
    });

    if (optionsRes.status === 405) {
      optionsRes = await fetch(
        `/api/auth/webauthn/login-options?email=${encodeURIComponent(normalizedEmail)}`
      );
    }

    if (!optionsRes.ok) {
      const err = await readJsonResponse(optionsRes, 'Erro ao obter opções de login').catch(() => null);
      throw new Error(err?.error || 'Erro ao obter opções de login');
    }

    const options = await readJsonResponse(optionsRes, 'Erro ao obter opções de login');

    if (options?.rpId) {
      delete options.rpId;
    }

    // 2. Start authentication ceremony
    const authResponse = await swa.startAuthentication({ optionsJSON: options });

    // 3. Verify on server
    const verifyRes = await fetch('/api/auth/webauthn/verify-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: authResponse, email: normalizedEmail }),
    });

    if (!verifyRes.ok) {
      const err = await readJsonResponse(verifyRes, 'Erro na verificação biométrica').catch(() => null);
      throw new Error(err?.error || 'Erro na verificação biométrica');
    }

    const verificationResult = await readJsonResponse(verifyRes, 'Erro na verificação biométrica');

    if (verificationResult.verified && verificationResult.magicLink) {
      window.location.href = verificationResult.magicLink;
    }

    return verificationResult;
  } catch (err: any) {
    console.error('WebAuthn Login Error:', err);
    throw new Error(getFriendlyWebAuthnError(err));
  }
}

export async function isBiometricsSupported() {
  if (typeof window === 'undefined') return false;

  return (
    !!window.PublicKeyCredential &&
    typeof window.PublicKeyCredential === 'function' &&
    await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  );
}
