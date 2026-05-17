import { supabase } from './supabase';

/**
 * Helper to ensure we only load the browser library on the client side.
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

function normalizeBiometricError(err: any, mode: 'register' | 'login') {
  const message = String(err?.message || '');

  if (err?.name === 'NotAllowedError') {
    return 'Operação cancelada ou não autorizada pelo dispositivo.';
  }

  if (err?.name === 'InvalidStateError') {
    return 'Este dispositivo já possui uma biometria cadastrada para esta conta. Use recadastrar ou remova a credencial antiga.';
  }

  if (
    message.includes('No biometric credentials registered') ||
    message.includes('Credential not found') ||
    message.includes('The string did not match the expected pattern') ||
    message.includes('Failed to execute')
  ) {
    return mode === 'login'
      ? 'Não foi possível usar a biometria cadastrada. Entre com e-mail e senha e cadastre novamente o Face ID/Biometria neste dispositivo.'
      : 'Não foi possível cadastrar a biometria neste dispositivo. Tente novamente após entrar com e-mail e senha.';
  }

  if (message.includes('User not found')) {
    return 'Não encontramos uma conta com este e-mail.';
  }

  if (message.includes('Challenge not found') || message.includes('Challenge expired')) {
    return 'A validação expirou. Tente novamente.';
  }

  return message || (mode === 'login' ? 'Erro ao entrar com biometria.' : 'Erro ao cadastrar biometria.');
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
        'Authorization': `Bearer ${session.access_token}`
      }
    });
    
    if (!optionsRes.ok) {
      throw new Error(await readApiError(optionsRes, 'Erro ao obter opções de registro'));
    }
    
    const options = await optionsRes.json();

    // 2. Start WebAuthn ceremony (v10+ handles optionsJSON)
    const registrationResponse = await swa.startRegistration({ optionsJSON: options });

    // 3. Verify on server
    const verifyRes = await fetch('/api/auth/webauthn/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(registrationResponse)
    });

    if (!verifyRes.ok) {
      throw new Error(await readApiError(verifyRes, 'Erro ao verificar registro biométrico'));
    }

    return await verifyRes.json();
  } catch (err: any) {
    console.error('WebAuthn Error:', err);
    throw new Error(normalizeBiometricError(err, 'register'));
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
      body: JSON.stringify({ email })
    });

    if (!optionsRes.ok) {
      throw new Error(await readApiError(optionsRes, 'Erro ao obter opções de login'));
    }

    const options = await optionsRes.json();

    // 2. Start authentication ceremony (v10+ handles optionsJSON)
    const authResponse = await swa.startAuthentication({ optionsJSON: options });

    // 3. Verify on server
    const verifyRes = await fetch('/api/auth/webauthn/verify-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: authResponse, email })
    });

    if (!verifyRes.ok) {
      throw new Error(await readApiError(verifyRes, 'Erro na verificação biométrica'));
    }

    const verificationResult = await verifyRes.json();

    if (verificationResult.verified && verificationResult.magicLink) {
      window.location.href = verificationResult.magicLink;
    }

    return verificationResult;
  } catch (err: any) {
    console.error('WebAuthn Login Error:', err);
    throw new Error(normalizeBiometricError(err, 'login'));
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
