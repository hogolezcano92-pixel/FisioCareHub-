import { supabase } from './supabase';

/**
 * Carrega a lib WebAuthn apenas no navegador.
 */
async function loadSwa() {
  if (typeof window === 'undefined') return null;
  return await import('@simplewebauthn/browser');
}

async function readApiError(response: Response, fallback: string) {
  try {
    const data = await response.json();
    return data?.error || fallback;
  } catch {
    return fallback;
  }
}

export async function registerBiometrics() {
  try {
    const swa = await loadSwa();
    if (!swa) throw new Error('Biometria só pode ser registrada no navegador.');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Entre com e-mail e senha antes de cadastrar a biometria.');

    const optionsRes = await fetch('/api/auth/webauthn/registration-options', {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!optionsRes.ok) {
      throw new Error(await readApiError(optionsRes, 'Erro ao obter opções de cadastro da biometria.'));
    }

    const options = await optionsRes.json();
    const registrationResponse = await swa.startRegistration({ optionsJSON: options });

    const verifyRes = await fetch('/api/auth/webauthn/register', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(registrationResponse),
    });

    if (!verifyRes.ok) {
      throw new Error(await readApiError(verifyRes, 'Não foi possível cadastrar a biometria neste dispositivo.'));
    }

    return await verifyRes.json();
  } catch (err: any) {
    console.error('WebAuthn Register Error:', err);

    if (err?.name === 'NotAllowedError') {
      throw new Error('Operação cancelada ou bloqueada pelo navegador.');
    }

    if (err?.name === 'NotSupportedError') {
      throw new Error('Este navegador ou dispositivo não suporta biometria para este site.');
    }

    throw err;
  }
}

export async function loginWithBiometrics(email: string) {
  try {
    const swa = await loadSwa();
    if (!swa) throw new Error('Biometria só pode ser utilizada no navegador.');

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) throw new Error('Informe seu e-mail para usar a biometria.');

    const optionsRes = await fetch('/api/auth/webauthn/login-options', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail }),
    });

    if (!optionsRes.ok) {
      throw new Error(await readApiError(optionsRes, 'Erro ao obter opções de login biométrico.'));
    }

    const options = await optionsRes.json();
    const authResponse = await swa.startAuthentication({ optionsJSON: options });

    const verifyRes = await fetch('/api/auth/webauthn/verify-login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: authResponse, email: normalizedEmail }),
    });

    if (!verifyRes.ok) {
      throw new Error(await readApiError(verifyRes, 'Erro na verificação biométrica.'));
    }

    const verificationResult = await verifyRes.json();

    if (verificationResult.verified && verificationResult.magicLink) {
      window.location.href = verificationResult.magicLink;
    }

    return verificationResult;
  } catch (err: any) {
    console.error('WebAuthn Login Error:', err);

    if (err?.name === 'NotAllowedError') {
      throw new Error('Operação cancelada ou bloqueada pelo navegador.');
    }

    if (err?.name === 'NotSupportedError') {
      throw new Error('Este navegador ou dispositivo não suporta biometria para este site.');
    }

    throw err;
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
