import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import {
  assertMethod,
  getSupabaseAdmin,
  getUserFromBearer,
  getWebAuthnConfig,
  isValidBase64URL,
  json,
  parseTransports,
  safeError,
  setChallengeCookie,
} from '../../../src/server/webauthnShared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
