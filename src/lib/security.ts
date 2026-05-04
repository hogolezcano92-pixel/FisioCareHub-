/**
 * UTILITY: Clinical Record Integrity Security
 * Implementation using Web Crypto API (SHA-256)
 */

/**
 * Generates a SHA-256 hash for record integrity validation.
 * @param patientId The unique ID of the patient.
 * @param physioId The unique ID of the physiotherapist.
 * @param timestamp The creation ISO string.
 * @param content The clinical content (stringified object or raw text).
 * @returns A hex string representation of the hash.
 */
export async function generateIntegrityHash(
  patientId: string,
  physioId: string,
  timestamp: string,
  content: string
): Promise<string> {
  const encoder = new TextEncoder();
  // Format: "p:[patientId]|f:[physioId]|t:[ts]|c:[content]"
  const dataString = `p:${patientId}|f:${physioId}|t:${timestamp}|c:${content}`;
  const data = encoder.encode(dataString);
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert buffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `fch_${hashHex}`;
}

/**
 * Verifies if a record's current content matches its saved hash.
 */
export async function verifyIntegrity(
  record: any,
  originalHash: string
): Promise<boolean> {
  // Logic to re-calculate and compare
  // For now, we mainly use hash generation during the imutability stage.
  const currentHash = await generateIntegrityHash(
    record.patient_id || record.paciente_id,
    record.therapist_id || record.fisio_id || record.fisioterapeuta_id,
    record.created_at || record.data_registro,
    typeof record.content === 'object' ? JSON.stringify(record.content) : record.content
  );
  
  return currentHash === originalHash;
}
