import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import {
  assertMethod,
  clearChallengeCookie,
  getRequestBody,
  getSupabaseAdmin,
  getUserFromBearer,
  getWebAuthnConfig,
  json,
  readChallengeCookie,
  safeError,
} from '../../../src/server/webauthnShared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
