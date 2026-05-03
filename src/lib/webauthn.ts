// Static imports are transformed by Vite at build time.
// @simplewebauthn/browser is safe to import as it doesn't perform actions upon import.
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { supabase } from './supabase';

export async function registerBiometrics() {
  try {
    if (typeof window === 'undefined') throw new Error('Biometria só pode ser registrada no navegador.');

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

    // 2. Start WebAuthn ceremony
    const registrationResponse = await startRegistration({ optionsJSON: options });

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
    if (err.name === 'NotAllowedError') {
      throw new Error('Operação cancelada ou não suportada.');
    }
    throw err;
  }
}

export async function loginWithBiometrics(email: string) {
  try {
    if (typeof window === 'undefined') throw new Error('Biometria só pode ser utilizada no navegador.');

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

    // 2. Start authentication ceremony
    const authResponse = await startAuthentication({ optionsJSON: options });

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
    if (err.name === 'NotAllowedError') {
      throw new Error('Operação cancelada ou não suportada.');
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
