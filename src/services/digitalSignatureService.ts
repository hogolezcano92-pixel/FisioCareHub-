import { supabase } from '../lib/supabase';

export type SignatureRole = 'paciente' | 'fisioterapeuta' | 'admin' | string;
export type SignatureLevel = 'simples' | 'avancada' | 'qualificada_externa';
export type SignatureStatus = 'signed' | 'pending_external' | 'revoked' | 'failed';

export interface DigitalSignatureRecord {
  id: string;
  resource_type: string;
  resource_id: string;
  resource_title?: string | null;
  signer_id: string;
  signer_role: SignatureRole;
  signer_name?: string | null;
  signer_email?: string | null;
  signature_level: SignatureLevel;
  signature_status: SignatureStatus;
  provider?: string | null;
  external_signature_id?: string | null;
  certificate_type?: string | null;
  document_hash: string;
  consent_text: string;
  signed_at?: string | null;
  created_at?: string | null;
  verification_code?: string | null;
  verification_url?: string | null;
  user_agent?: string | null;
}

export interface SignResourceInput {
  resourceType: string;
  resourceId: string;
  resourceTitle: string;
  resourceContent: unknown;
  signerId: string;
  signerRole: SignatureRole;
  signerName?: string | null;
  signerEmail?: string | null;
  patientId?: string | null;
  physioId?: string | null;
  signatureLevel?: SignatureLevel;
  provider?: string | null;
  externalSignatureId?: string | null;
  certificateType?: string | null;
}

const CONSENT_TEXT = 'Declaro que li e concordo com o conteúdo deste documento. Confirmo minha identidade e autorizo o registro da assinatura eletrônica no FisioCareHub.';

const stableStringify = (value: unknown): string => {
  const seen = new WeakSet<object>();
  return JSON.stringify(value, (_key, current) => {
    if (current && typeof current === 'object') {
      if (seen.has(current)) return '[Circular]';
      seen.add(current);
      if (!Array.isArray(current)) {
        return Object.keys(current as Record<string, unknown>)
          .sort()
          .reduce<Record<string, unknown>>((acc, key) => {
            acc[key] = (current as Record<string, unknown>)[key];
            return acc;
          }, {});
      }
    }
    return current;
  });
};

export const generateVerificationCode = () => {
  const random = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(random)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
};

export const getVerificationUrl = (verificationCode: string) => {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/verificar-assinatura/${verificationCode}`;
};

export async function generateDocumentHash(resourceContent: unknown): Promise<string> {
  const normalized = stableStringify(resourceContent ?? {});
  const encoded = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function getResourceSignatures(resourceType: string, resourceId: string): Promise<DigitalSignatureRecord[]> {
  const { data, error } = await supabase
    .from('document_signatures')
    .select('*')
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('[DigitalSignature] Erro ao buscar assinaturas:', error);
    return [];
  }

  return (data || []) as DigitalSignatureRecord[];
}

export async function signResource(input: SignResourceInput): Promise<DigitalSignatureRecord> {
  const documentHash = await generateDocumentHash(input.resourceContent);
  const verificationCode = generateVerificationCode();
  const now = new Date().toISOString();
  const isExternal = input.signatureLevel === 'qualificada_externa';

  const payload = {
    resource_type: input.resourceType,
    resource_id: input.resourceId,
    resource_title: input.resourceTitle,
    patient_id: input.patientId || null,
    physio_id: input.physioId || null,
    signer_id: input.signerId,
    signer_role: input.signerRole,
    signer_name: input.signerName || null,
    signer_email: input.signerEmail || null,
    signature_level: input.signatureLevel || 'avancada',
    signature_status: isExternal ? 'pending_external' : 'signed',
    provider: input.provider || (isExternal ? 'external_provider_pending' : 'fisiocarehub'),
    external_signature_id: input.externalSignatureId || null,
    certificate_type: input.certificateType || (isExternal ? 'ICP-Brasil/GOV.BR/Provedor externo' : 'Assinatura eletrônica avançada FisioCareHub'),
    document_hash: documentHash,
    consent_text: CONSENT_TEXT,
    verification_code: verificationCode,
    verification_url: getVerificationUrl(verificationCode),
    signed_at: isExternal ? null : now,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    metadata: {
      source: 'FisioCareHub',
      phase: isExternal ? 'fase_3_preparada' : 'fase_1_2_funcional',
    },
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('document_signatures')
    .upsert(payload, { onConflict: 'resource_type,resource_id,signer_id,signer_role' })
    .select('*')
    .single();

  if (error) throw error;
  return data as DigitalSignatureRecord;
}

export async function prepareExternalQualifiedSignature(input: Omit<SignResourceInput, 'signatureLevel'> & { provider?: string }) {
  return signResource({
    ...input,
    signatureLevel: 'qualificada_externa',
    provider: input.provider || 'provedor_externo_pendente',
    certificateType: 'Assinatura qualificada externa',
  });
}

export async function getSignatureByVerificationCode(code: string): Promise<DigitalSignatureRecord | null> {
  const { data, error } = await supabase.rpc('verify_document_signature', { p_code: code });

  if (error) throw error;
  const first = Array.isArray(data) ? data[0] : data;
  return (first || null) as DigitalSignatureRecord | null;
}
