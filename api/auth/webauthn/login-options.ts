import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import {
  assertMethod,
  getRequestBody,
  getSupabaseAdmin,
  getWebAuthnConfig,
  isValidBase64URL,
  json,
  parseTransports,
  safeError,
  setChallengeCookie,
} from '../../../src/server/webauthnShared';

type LoginOptionsBody = {
  email?: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
