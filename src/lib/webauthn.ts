import { supabase } from './supabase';

/**
 * Helper to ensure we only load the browser library on the client side.
 */
async function loadSwa() {
  if (typeof window === 'undefined') return null;
  return await import('@simplewebauthn/browser');
}

function normalizeBiometricError(err: any, fallback: string) {
  const message = String(err?.message || '');

  if (err?.name === 'NotAllowedError') {
    return new Error('Operação cancelada ou não suportada neste dispositivo.');
  }

  if (message.includes('did not match the expected pattern')) {
    return new Error('Não foi possível usar a biometria cadastrada. Entre com e-mail e senha e cadastre novamente o Face ID/Biometria neste dispositivo.');
  }

  if (message.toLowerCase().includes('no biometric credentials registered')) {
    return new Error('Nenhuma biometria cadastrada para este e-mail. Entre com e-mail e senha para cadastrar.');
  }

  return new Error(message || fallback);
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
      const err = await optionsRes.json();
      throw new Error(err.error || 'Erro ao obter opções de registro');
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
      const err = await verifyRes.json();
      throw new Error(err.error || 'Erro ao verificar registro biométrico');
    }

    return await verifyRes.json();
  } catch (err: any) {
    console.error('WebAuthn Error:', err);
    throw normalizeBiometricError(err, 'Erro ao ativar biometria.');
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
      const err = await optionsRes.json();
      throw new Error(err.error || 'Erro ao obter opções de login');
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
      const err = await verifyRes.json();
      throw new Error(err.error || 'Erro na verificação biométrica');
    }

    const verificationResult = await verifyRes.json();

    if (verificationResult.verified && verificationResult.magicLink) {
      window.location.href = verificationResult.magicLink;
    }

    return verificationResult;
  } catch (err: any) {
    console.error('WebAuthn Login Error:', err);
    throw normalizeBiometricError(err, 'Erro ao entrar com biometria.');
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
