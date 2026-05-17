import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import {
  assertMethod,
  clearChallengeCookie,
  getRequestBody,
  getSupabaseAdmin,
  getUserFromBearer,
  getWebAuthnConfig,
  isValidBase64URL,
  json,
  parseTransports,
  readChallengeCookie,
  safeError,
  setChallengeCookie,
} from '../../../src/server/webauthnShared.js';

type LoginOptionsBody = {
  email?: string;
};

type VerifyLoginBody = {
  email?: string;
  body?: any;
};

function getAction(req: VercelRequest) {
  const action = req.query.action;
  return Array.isArray(action) ? action[0] : action;
}

async function registrationOptions(req: VercelRequest, res: VercelResponse) {
  if (assertMethod(req, res, ['GET']) !== true) return;

  try {
    const { user, error: authError } = await getUserFromBearer(req);
    if (authError || !user) return json(res, 401, { error: authError || 'Usuário não autenticado.' });

    const supabase = getSupabaseAdmin();
    const { data: credentials, error: credentialsError } = await supabase
      .from('webauthn_credentials')
      .select('credential_id, transports')
      .eq('user_id', user.id);

    if (credentialsError) throw credentialsError;

    const { rpID, rpName } = getWebAuthnConfig(req);
    const validCredentials = (credentials || []).filter((credential) =>
      isValidBase64URL(credential.credential_id)
    );

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: Buffer.from(user.id),
      userName: user.email || user.id,
      userDisplayName: user.user_metadata?.nome || user.email || 'Usuário FisioCareHub',
      attestationType: 'none',
      excludeCredentials: validCredentials.map((credential) => ({
        id: credential.credential_id,
        transports: parseTransports(credential.transports),
      })),
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    setChallengeCookie(req, res, {
      purpose: 'registration',
      challenge: options.challenge,
      userId: user.id,
    });

    return res.status(200).json(options);
  } catch (error) {
    console.error('[WebAuthn Registration Options]', error);
    return json(res, 500, {
      error: safeError(error, 'Erro ao obter opções de cadastro da biometria.'),
    });
  }
}

async function register(req: VercelRequest, res: VercelResponse) {
  if (assertMethod(req, res, ['POST']) !== true) return;

  try {
    const { user, error: authError } = await getUserFromBearer(req);
    if (authError || !user) return json(res, 401, { error: authError || 'Usuário não autenticado.' });

    const challengePayload = readChallengeCookie(req, 'registration');
    if (!challengePayload || challengePayload.userId !== user.id) {
      return json(res, 400, {
        error: 'O cadastro da biometria expirou. Tente novamente.',
      });
    }

    const registrationResponse = getRequestBody(req);
    const { rpID, origin } = getWebAuthnConfig(req);

    const verification = await verifyRegistrationResponse({
      response: registrationResponse,
      expectedChallenge: challengePayload.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return json(res, 400, { error: 'Não foi possível verificar a biometria.' });
    }

    const { credential } = verification.registrationInfo;
    const transports = credential.transports || registrationResponse?.response?.transports || [];

    const supabase = getSupabaseAdmin();
    const { error: dbError } = await supabase
      .from('webauthn_credentials')
      .upsert(
        {
          user_id: user.id,
          credential_id: credential.id,
          public_key: isoBase64URL.fromBuffer(credential.publicKey),
          counter: credential.counter,
          transports: JSON.stringify(transports),
        },
        { onConflict: 'credential_id' }
      );

    if (dbError) throw dbError;

    clearChallengeCookie(req, res);
    return res.status(200).json({ verified: true });
  } catch (error) {
    console.error('[WebAuthn Register]', error);
    return json(res, 500, {
      error: safeError(error, 'Não foi possível cadastrar a biometria neste dispositivo.'),
    });
  }
}

async function loginOptions(req: VercelRequest, res: VercelResponse) {
  if (assertMethod(req, res, ['POST']) !== true) return;

  try {
    const { email } = getRequestBody<LoginOptionsBody>(req);
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
      return json(res, 400, { error: 'Informe o e-mail para usar a biometria.' });
    }

    const supabase = getSupabaseAdmin();
    const { data: profile, error: profileError } = await supabase
      .from('perfis')
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      return json(res, 404, { error: 'Usuário não encontrado para este e-mail.' });
    }

    const { data: credentials, error: credentialsError } = await supabase
      .from('webauthn_credentials')
      .select('credential_id, transports')
      .eq('user_id', profile.id);

    if (credentialsError) throw credentialsError;

    const validCredentials = (credentials || []).filter((credential) =>
      isValidBase64URL(credential.credential_id)
    );

    if (validCredentials.length === 0) {
      return json(res, 400, {
        error: 'Nenhuma biometria válida cadastrada. Entre com e-mail e senha e cadastre a biometria neste dispositivo.',
      });
    }

    const { rpID } = getWebAuthnConfig(req);
    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: validCredentials.map((credential) => ({
        id: credential.credential_id,
        transports: parseTransports(credential.transports),
      })),
      userVerification: 'preferred',
    });

    setChallengeCookie(req, res, {
      purpose: 'login',
      challenge: options.challenge,
      email: normalizedEmail,
      userId: profile.id,
    });

    return res.status(200).json(options);
  } catch (error) {
    console.error('[WebAuthn Login Options]', error);
    return json(res, 500, {
      error: safeError(error, 'Erro ao obter opções de login biométrico.'),
    });
  }
}

async function verifyLogin(req: VercelRequest, res: VercelResponse) {
  if (assertMethod(req, res, ['POST']) !== true) return;

  try {
    const { email, body: authenticationResponse } = getRequestBody<VerifyLoginBody>(req);
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !authenticationResponse) {
      return json(res, 400, { error: 'Dados do login biométrico ausentes.' });
    }

    const challengePayload = readChallengeCookie(req, 'login');
    if (!challengePayload || challengePayload.email !== normalizedEmail) {
      return json(res, 400, {
        error: 'O login biométrico expirou. Tente novamente.',
      });
    }

    const supabase = getSupabaseAdmin();
    const { data: profile, error: profileError } = await supabase
      .from('perfis')
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) return json(res, 404, { error: 'Usuário não encontrado.' });

    const { data: credential, error: credentialError } = await supabase
      .from('webauthn_credentials')
      .select('*')
      .eq('credential_id', authenticationResponse.id)
      .eq('user_id', profile.id)
      .maybeSingle();

    if (credentialError) throw credentialError;
    if (!credential) {
      return json(res, 400, {
        error: 'Biometria não encontrada para este usuário. Entre com e-mail e senha e cadastre novamente.',
      });
    }

    const { rpID, origin } = getWebAuthnConfig(req);
    const verification = await verifyAuthenticationResponse({
      response: authenticationResponse,
      expectedChallenge: challengePayload.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: credential.credential_id,
        publicKey: isoBase64URL.toBuffer(credential.public_key),
        counter: Number(credential.counter || 0),
        transports: parseTransports(credential.transports),
      },
    });

    if (!verification.verified || !verification.authenticationInfo) {
      return json(res, 400, { error: 'Não foi possível validar a biometria.' });
    }

    const { error: updateError } = await supabase
      .from('webauthn_credentials')
      .update({ counter: verification.authenticationInfo.newCounter })
      .eq('id', credential.id);

    if (updateError) throw updateError;

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: profile.email,
      options: { redirectTo: `${origin}/dashboard` },
    });

    if (linkError) throw linkError;

    clearChallengeCookie(req, res);
    return res.status(200).json({
      verified: true,
      magicLink: linkData.properties?.action_link,
    });
  } catch (error) {
    console.error('[WebAuthn Verify Login]', error);
    return json(res, 500, {
      error: safeError(error, 'Erro na verificação biométrica.'),
    });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = getAction(req);

  switch (action) {
    case 'registration-options':
      return registrationOptions(req, res);
    case 'register':
      return register(req, res);
    case 'login-options':
      return loginOptions(req, res);
    case 'verify-login':
      return verifyLogin(req, res);
    default:
      return json(res, 404, { error: 'Rota de biometria não encontrada.' });
  }
}
