import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Endpoint desativado por decisão de produto.
 *
 * A criação/publicação de materiais da Biblioteca de Saúde agora é feita
 * exclusivamente de forma manual pelo Admin, na área Biblioteca / Materiais.
 *
 * Motivo:
 * - evitar publicação automática por IA;
 * - manter curadoria humana;
 * - impedir que conteúdo gerado por IA seja vendido/publicado sem revisão.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  return res.status(403).json({
    error: 'Geração automática de materiais por IA desativada.',
    message: 'Materiais da biblioteca devem ser criados, revisados e publicados manualmente pelo Admin.',
  });
}
