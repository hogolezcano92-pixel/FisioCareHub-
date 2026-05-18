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
    return 'Não foi possível ativar a biometria neste domínio. Atualize a página e tente novamente.';
  }

  return message || 'Erro inesperado na biometria.';
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
      const err = await optionsRes.json().catch(() => null);
      throw new Error(err?.error || 'Erro ao obter opções de registro');
    }

    const options = await optionsRes.json();

    /**
     * Segurança extra para Safari/iOS:
     * se o servidor retornar rp.id com protocolo/caminho por configuração antiga,
     * removemos aqui antes de chamar a API nativa do navegador.
     */
    if (options?.rp?.id) {
      options.rp.id = String(options.rp.id)
        .replace(/^https?:\/\//i, '')
        .split('/')[0]
        .split(':')[0]
        .toLowerCase();
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
      const err = await verifyRes.json().catch(() => null);
      throw new Error(err?.error || 'Erro ao verificar registro biométrico');
    }

    return await verifyRes.json();
  } catch (err: any) {
    console.error('WebAuthn Error:', err);
    throw new Error(getFriendlyWebAuthnError(err));
  }
}

export async function loginWithBiometrics(email: string) {
  try {
    const swa = await loadSwa();
    if (!swa) throw new Error('Biometria só pode ser utilizada no navegador.');

    // 1. Get options from server
    const optionsRes = await fetch('/api/auth/webauthn/login-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!optionsRes.ok) {
      const err = await optionsRes.json().catch(() => null);
      throw new Error(err?.error || 'Erro ao obter opções de login');
    }

    const options = await optionsRes.json();

    if (options?.rpId) {
      options.rpId = String(options.rpId)
        .replace(/^https?:\/\//i, '')
        .split('/')[0]
        .split(':')[0]
        .toLowerCase();
    }

    // 2. Start authentication ceremony
    const authResponse = await swa.startAuthentication({ optionsJSON: options });

    // 3. Verify on server
    const verifyRes = await fetch('/api/auth/webauthn/verify-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: authResponse, email }),
    });

    if (!verifyRes.ok) {
      const err = await verifyRes.json().catch(() => null);
      throw new Error(err?.error || 'Erro na verificação biométrica');
    }

    const verificationResult = await verifyRes.json();

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
