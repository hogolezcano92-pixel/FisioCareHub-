/**
 * FisioCareHub - Transactional email template.
 * Layout em tabelas + estilos inline para maior compatibilidade com Outlook, Gmail e mobile.
 */

export type EmailVariant =
  | 'appointment'
  | 'payment'
  | 'document'
  | 'exercise'
  | 'withdrawal'
  | 'invite'
  | 'support'
  | 'approval'
  | 'default';

export interface EmailDetailItem {
  label: string;
  value?: string | number | null;
  helper?: string | null;
}

export interface EmailCta {
  label: string;
  href: string;
  secondary?: boolean;
}

export interface FisioEmailOptions {
  title: string;
  subtitle?: string;
  preheader?: string;
  greetingName?: string;
  contentHtml?: string;
  details?: EmailDetailItem[];
  ctas?: EmailCta[];
  variant?: EmailVariant;
  generatedAt?: string;
}

const APP_URL = 'https://fisiocarehub.company';
const SUPPORT_EMAIL = 'suporte@fisiocarehub.company';
const COMPANY_ADDRESS = 'Av. Pastor Cícero Canuto de Lima, São Paulo - SP, Brasil';
const COMPANY_PHONE = '(11) 98404-0563';

export const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const formatGeneratedAt = (value?: string) => {
  if (value) return value;
  try {
    return new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const variantConfig: Record<EmailVariant, { icon: string; tone: string; accent: string; bg: string }> = {
  appointment: { icon: '✓', tone: 'Agendamento', accent: '#2563eb', bg: '#eff6ff' },
  payment: { icon: '$', tone: 'Pagamento', accent: '#16a34a', bg: '#f0fdf4' },
  document: { icon: 'D', tone: 'Documento', accent: '#2563eb', bg: '#eff6ff' },
  exercise: { icon: 'E', tone: 'Exercício', accent: '#0d9488', bg: '#f0fdfa' },
  withdrawal: { icon: '$', tone: 'Financeiro', accent: '#d97706', bg: '#fffbeb' },
  invite: { icon: '@', tone: 'Convite', accent: '#0284c7', bg: '#f0f9ff' },
  support: { icon: '?', tone: 'Suporte', accent: '#7c3aed', bg: '#f5f3ff' },
  approval: { icon: '✓', tone: 'Cadastro', accent: '#16a34a', bg: '#f0fdf4' },
  default: { icon: 'i', tone: 'Aviso', accent: '#2563eb', bg: '#eff6ff' },
};

const buildDetailRows = (details: EmailDetailItem[] = []) => {
  const rows = Array.isArray(details)
    ? details.filter((item) => item && item.value !== undefined && item.value !== null && String(item.value).trim() !== '')
    : [];

  if (rows.length === 0) return '';

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;margin:22px 0 0;">
      ${rows
        .map((item, index) => `
          <tr>
            <td style="padding:14px 18px;border-bottom:${index === rows.length - 1 ? '0' : '1px solid #e2e8f0'};font-family:Arial,Helvetica,sans-serif;color:#64748b;font-size:13px;line-height:19px;font-weight:700;vertical-align:top;width:38%;">
              ${escapeHtml(item.label)}
            </td>
            <td style="padding:14px 18px;border-bottom:${index === rows.length - 1 ? '0' : '1px solid #e2e8f0'};font-family:Arial,Helvetica,sans-serif;color:#0f172a;font-size:14px;line-height:21px;font-weight:800;vertical-align:top;">
              ${escapeHtml(item.value)}
              ${item.helper ? `<div style="margin-top:4px;color:#64748b;font-size:12px;line-height:18px;font-weight:500;">${escapeHtml(item.helper)}</div>` : ''}
            </td>
          </tr>
        `)
        .join('')}
    </table>
  `;
};

const buildCtas = (ctas: EmailCta[] = [], accent = '#2563eb') => {
  const validCtas = Array.isArray(ctas) ? ctas.filter((cta) => cta?.href && cta?.label).slice(0, 2) : [];
  if (validCtas.length === 0) return '';

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="border-collapse:collapse;margin:24px 0 0;">
      ${validCtas.map((cta) => `
        <tr>
          <td align="left" style="padding:0 0 10px;">
            <a href="${escapeHtml(cta.href)}" style="display:inline-block;border-radius:12px;padding:13px 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:18px;font-weight:800;text-decoration:none;${cta.secondary ? `background:#ffffff;color:${accent};border:1px solid #cbd5e1;` : `background:${accent};color:#ffffff;border:1px solid ${accent};`}">
              ${escapeHtml(cta.label)} &nbsp;›
            </a>
          </td>
        </tr>
      `).join('')}
    </table>
  `;
};

export const generateFisioCareHubEmailHTML = ({
  title,
  subtitle,
  preheader,
  greetingName,
  contentHtml,
  details = [],
  ctas = [],
  variant = 'default',
  generatedAt,
}: FisioEmailOptions): string => {
  const year = new Date().getFullYear();
  const cfg = variantConfig[variant] || variantConfig.default;
  const safeTitle = escapeHtml(title || 'Aviso FisioCareHub');
  const safeSubtitle = escapeHtml(subtitle || 'Você recebeu uma atualização importante no FisioCareHub.');
  const safePreheader = escapeHtml(preheader || subtitle || title || 'Atualização do FisioCareHub');
  const safeGreeting = greetingName ? escapeHtml(greetingName) : '';
  const generated = escapeHtml(formatGeneratedAt(generatedAt));

  return `<!doctype html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;width:100%;background:#f1f5f9;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">${safePreheader}</div>
  <center style="width:100%;background:#f1f5f9;padding:22px 0;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f1f5f9;">
      <tr>
        <td align="center" style="padding:0 10px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;border-collapse:separate;border-spacing:0;background:#ffffff;border-radius:22px;overflow:hidden;border:1px solid #dbeafe;box-shadow:0 18px 50px rgba(15,23,42,.12);">
            <tr>
              <td style="padding:24px 22px;background:#07152f;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="vertical-align:middle;">
                      <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                        <tr>
                          <td style="width:42px;height:42px;border-radius:13px;background:#0ea5e9;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:25px;font-weight:900;text-align:center;vertical-align:middle;">+</td>
                          <td style="padding-left:12px;">
                            <div style="font-family:Arial,Helvetica,sans-serif;color:#ffffff;font-size:25px;line-height:28px;font-weight:900;letter-spacing:-.5px;">Fisio<span style="color:#38bdf8;">Care</span>Hub</div>
                            <div style="font-family:Arial,Helvetica,sans-serif;color:#bfdbfe;font-size:10px;line-height:14px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">Reabilitação &amp; Performance</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td align="right" style="font-family:Arial,Helvetica,sans-serif;color:#bfdbfe;font-size:11px;line-height:16px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">${escapeHtml(cfg.tone)}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 22px;background:#ffffff;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0;background:${cfg.bg};border:1px solid #dbeafe;border-radius:18px;">
                  <tr>
                    <td style="padding:22px 20px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                        <tr>
                          <td style="width:54px;vertical-align:top;padding-right:14px;">
                            <div style="width:44px;height:44px;border-radius:14px;background:${cfg.accent};color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:23px;line-height:44px;text-align:center;font-weight:900;">${escapeHtml(cfg.icon)}</div>
                          </td>
                          <td style="vertical-align:top;">
                            <div style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;color:${cfg.accent};font-size:11px;line-height:15px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;">${escapeHtml(cfg.tone)}</div>
                            <h1 style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;font-size:27px;line-height:34px;font-weight:900;letter-spacing:-.5px;">${safeTitle}</h1>
                            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;color:#475569;font-size:15px;line-height:23px;font-weight:500;">${safeSubtitle}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:22px;">
                  <tr>
                    <td style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;font-size:15px;line-height:25px;font-weight:500;">
                      ${safeGreeting ? `<p style="margin:0 0 16px;font-size:18px;line-height:26px;font-weight:900;color:#0f172a;">Olá, ${safeGreeting}</p>` : ''}
                      <div style="font-family:Arial,Helvetica,sans-serif;color:#334155;font-size:15px;line-height:25px;">${contentHtml || ''}</div>
                      ${buildDetailRows(details)}
                      ${buildCtas(ctas, cfg.accent)}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:22px;background:#07152f;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="font-family:Arial,Helvetica,sans-serif;color:#ffffff;font-size:22px;line-height:26px;font-weight:900;">Fisio<span style="color:#38bdf8;">Care</span>Hub</td>
                  </tr>
                  <tr>
                    <td style="padding-top:4px;font-family:Arial,Helvetica,sans-serif;color:#bfdbfe;font-size:10px;line-height:14px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">Reabilitação &amp; Performance</td>
                  </tr>
                  <tr>
                    <td style="padding-top:14px;font-family:Arial,Helvetica,sans-serif;color:#dbeafe;font-size:13px;line-height:21px;">Tecnologia e cuidado humano trabalhando juntos para a sua melhor recuperação e performance.</td>
                  </tr>
                  <tr>
                    <td style="padding-top:16px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#0b1e42;border:1px solid rgba(191,219,254,.22);border-radius:14px;">
                        <tr>
                          <td style="padding:16px;font-family:Arial,Helvetica,sans-serif;color:#dbeafe;font-size:13px;line-height:22px;word-break:break-word;">
                            <strong style="color:#ffffff;">Contato e informações</strong><br />
                            E-mail: <a href="mailto:${SUPPORT_EMAIL}" style="color:#bfdbfe;text-decoration:none;">${SUPPORT_EMAIL}</a><br />
                            Site: <a href="${APP_URL}" style="color:#bfdbfe;text-decoration:none;">fisiocarehub.company</a><br />
                            Telefone: ${COMPANY_PHONE}<br />
                            Endereço: ${COMPANY_ADDRESS}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:16px;border-top:1px solid rgba(191,219,254,.18);font-family:Arial,Helvetica,sans-serif;color:#94a3b8;font-size:11px;line-height:17px;">
                      © ${year} FisioCareHub. Todos os direitos reservados.<br />Gerado em: ${generated}<br />Privacidade &nbsp; | &nbsp; Termos &nbsp; | &nbsp; Ajuda
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
};

export const generateEmailHTML = ({
  nome_do_usuario,
  mensagem_principal_da_notificacao,
  data_hora_formatada,
}: {
  nome_do_usuario: string;
  mensagem_principal_da_notificacao: string;
  data_hora_formatada?: string;
}): string => generateFisioCareHubEmailHTML({
  title: 'Atualização FisioCareHub',
  subtitle: 'Você recebeu uma atualização importante sobre sua conta ou atendimento.',
  greetingName: nome_do_usuario,
  contentHtml: mensagem_principal_da_notificacao,
  generatedAt: data_hora_formatada,
  variant: 'default',
});
