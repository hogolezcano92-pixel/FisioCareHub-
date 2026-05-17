import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import {
  assertMethod,
  clearChallengeCookie,
  getRequestBody,
  getSupabaseAdmin,
  getWebAuthnConfig,
  json,
  parseTransports,
  readChallengeCookie,
  safeError,
} from '../../../src/server/webauthnShared.js';

type VerifyLoginBody = {
  email?: string;
  body?: any;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
