/**
 * FisioCareHub - Premium transactional email template.
 * HTML com estilos inline para maior compatibilidade com Gmail, Outlook e mobile.
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
const COMPANY_ADDRESS = 'Av. Exemplo, 1234 - Butantã, São Paulo - SP, Brasil';
const COMPANY_PHONE = '(11) 98765-4321';

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

const variantConfig: Record<EmailVariant, { icon: string; tone: string; badge: string }> = {
  appointment: { icon: '✓', tone: 'Agendamento', badge: '#22c55e' },
  payment: { icon: '💳', tone: 'Pagamento', badge: '#22c55e' },
  document: { icon: '📄', tone: 'Documento', badge: '#3b82f6' },
  exercise: { icon: '🏃', tone: 'Exercício', badge: '#14b8a6' },
  withdrawal: { icon: '💰', tone: 'Financeiro', badge: '#f59e0b' },
  invite: { icon: '✉', tone: 'Convite', badge: '#38bdf8' },
  support: { icon: '🎧', tone: 'Suporte', badge: '#8b5cf6' },
  approval: { icon: '✓', tone: 'Cadastro', badge: '#22c55e' },
  default: { icon: '•', tone: 'Notificação', badge: '#38bdf8' },
};

const buildDetailRows = (details: EmailDetailItem[] = []) => {
  if (!Array.isArray(details) || details.length === 0) return '';

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #dbeafe;border-radius:18px;overflow:hidden;margin:22px 0 0;box-shadow:0 18px 48px rgba(15,23,42,.10);">
      ${details
        .filter((item) => item && item.value !== undefined && item.value !== null && String(item.value).trim() !== '')
        .map((item, index, arr) => `
          <tr>
            <td style="width:36%;padding:14px 18px;border-bottom:${index === arr.length - 1 ? '0' : '1px solid #e2e8f0'};font-family:Arial,Helvetica,sans-serif;color:#0f2a55;font-size:14px;line-height:21px;font-weight:800;vertical-align:top;">
              ${escapeHtml(item.label)}
            </td>
            <td style="padding:14px 18px;border-bottom:${index === arr.length - 1 ? '0' : '1px solid #e2e8f0'};font-family:Arial,Helvetica,sans-serif;color:#0f172a;font-size:14px;line-height:21px;font-weight:700;vertical-align:top;">
              ${escapeHtml(item.value)}
              ${item.helper ? `<div style="margin-top:4px;color:#64748b;font-size:12px;line-height:18px;font-weight:500;">${escapeHtml(item.helper)}</div>` : ''}
            </td>
          </tr>
        `)
        .join('')}
    </table>
  `;
};

const buildCtas = (ctas: EmailCta[] = []) => {
  if (!Array.isArray(ctas) || ctas.length === 0) return '';

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="border-collapse:collapse;margin:24px 0 0;">
      <tr>
        ${ctas.slice(0, 2).map((cta) => `
          <td align="center" style="padding:6px;">
            <a href="${escapeHtml(cta.href)}" style="display:block;border-radius:14px;padding:15px 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:18px;font-weight:900;text-decoration:none;${cta.secondary ? 'background:#0f2f72;color:#ffffff;border:1px solid rgba(255,255,255,.45);' : 'background:#ffffff;color:#0756d8;border:1px solid #ffffff;'}">
              ${escapeHtml(cta.label)} &nbsp;›
            </a>
          </td>
        `).join('')}
      </tr>
    </table>
  `;
};

const notificationChips = `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:24px;">
    <tr>
      <td style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;font-size:18px;line-height:24px;font-weight:900;padding:0 0 12px;">Outras notificações</td>
    </tr>
    <tr>
      <td>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:10px;">
          <tr>
            <td style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:12px;color:#0f2a55;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:800;text-align:center;">💳<br/>Pagamento aprovado</td>
            <td style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:12px;color:#0f2a55;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:800;text-align:center;">🔔<br/>Lembrete de consulta</td>
            <td style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:12px;color:#0f2a55;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:800;text-align:center;">📄<br/>Documento disponível</td>
          </tr>
          <tr>
            <td style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:12px;color:#0f2a55;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:800;text-align:center;">🏃<br/>Exercício prescrito</td>
            <td style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:12px;color:#0f2a55;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:800;text-align:center;">💰<br/>Solicitação de saque</td>
            <td style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:12px;color:#0f2a55;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:800;text-align:center;">🎧<br/>Mensagem de suporte</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
`;

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
  const safeTitle = escapeHtml(title || 'Notificação FisioCareHub');
  const safeSubtitle = escapeHtml(subtitle || 'Tecnologia, cuidado humano e performance em um só lugar.');
  const safePreheader = escapeHtml(preheader || title || 'Nova notificação do FisioCareHub');
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
<body style="margin:0;padding:0;width:100%;background:#eef4ff;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">${safePreheader}</div>
  <center style="width:100%;background:#eef4ff;padding:28px 0;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#eef4ff;">
      <tr>
        <td align="center" style="padding:0 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;border-collapse:separate;border-spacing:0;border-radius:24px;overflow:hidden;background:#07152f;box-shadow:0 24px 70px rgba(15,23,42,.18);">
            <tr>
              <td style="padding:30px 26px 22px;background:linear-gradient(135deg,#07152f 0%,#08245a 52%,#0a3ea8 100%);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="vertical-align:middle;">
                      <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                        <tr>
                          <td style="width:48px;height:48px;border-radius:15px;background:#0ea5e9;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:28px;font-weight:900;text-align:center;vertical-align:middle;box-shadow:0 0 0 5px rgba(56,189,248,.16);">+</td>
                          <td style="padding-left:14px;">
                            <div style="font-family:Arial,Helvetica,sans-serif;color:#ffffff;font-size:30px;line-height:32px;font-weight:900;letter-spacing:-.8px;">Fisio<span style="color:#38bdf8;">Care</span>Hub</div>
                            <div style="font-family:Arial,Helvetica,sans-serif;color:#dbeafe;font-size:12px;line-height:16px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">Reabilitação &amp; Performance</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td align="right" style="font-family:Arial,Helvetica,sans-serif;color:#bfdbfe;font-size:12px;line-height:18px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">${escapeHtml(cfg.tone)}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 22px 22px;background:#07152f;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0;background:linear-gradient(135deg,#075fec 0%,#034bc4 58%,#06357f 100%);border:1px solid rgba(147,197,253,.55);border-radius:22px;overflow:hidden;">
                  <tr>
                    <td style="padding:30px 28px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                        <tr>
                          <td style="width:82px;vertical-align:top;">
                            <div style="width:64px;height:64px;border-radius:999px;background:#0a3ea8;border:5px solid #38bdf8;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:34px;line-height:64px;text-align:center;font-weight:900;box-shadow:0 0 28px rgba(56,189,248,.65);">${escapeHtml(cfg.icon)}</div>
                          </td>
                          <td style="vertical-align:top;">
                            <h1 style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;color:#ffffff;font-size:30px;line-height:36px;font-weight:900;letter-spacing:-.6px;">${safeTitle}</h1>
                            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;color:#dbeafe;font-size:16px;line-height:24px;font-weight:500;">${safeSubtitle}</p>
                          </td>
                        </tr>
                      </table>
                      ${buildCtas(ctas)}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:#f8fbff;padding:24px 22px 30px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #dbeafe;border-radius:20px;overflow:hidden;box-shadow:0 18px 48px rgba(15,23,42,.08);">
                  <tr>
                    <td style="padding:26px 26px 24px;font-family:Arial,Helvetica,sans-serif;color:#334155;font-size:16px;line-height:26px;">
                      ${safeGreeting ? `<p style="margin:0 0 18px;color:#0f172a;font-size:18px;line-height:26px;font-weight:700;">Olá, <strong>${safeGreeting}</strong></p>` : ''}
                      <div style="font-family:Arial,Helvetica,sans-serif;color:#334155;font-size:16px;line-height:26px;word-break:break-word;overflow-wrap:break-word;">${contentHtml || ''}</div>
                      ${buildDetailRows(details)}
                    </td>
                  </tr>
                </table>
                ${notificationChips}
              </td>
            </tr>
            <tr>
              <td style="background:linear-gradient(135deg,#07152f 0%,#08245a 100%);padding:28px 26px 18px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="width:44%;vertical-align:top;padding-right:20px;">
                      <div style="font-family:Arial,Helvetica,sans-serif;color:#ffffff;font-size:24px;line-height:28px;font-weight:900;">Fisio<span style="color:#38bdf8;">Care</span>Hub</div>
                      <div style="margin-top:3px;font-family:Arial,Helvetica,sans-serif;color:#bfdbfe;font-size:10px;line-height:14px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">Reabilitação &amp; Performance</div>
                      <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;color:#dbeafe;font-size:12px;line-height:19px;">Tecnologia e cuidado humano trabalhando juntos para a sua melhor recuperação e performance.</p>
                    </td>
                    <td style="vertical-align:top;border-left:1px solid rgba(191,219,254,.28);padding-left:22px;">
                      <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;color:#ffffff;font-size:13px;line-height:19px;font-weight:800;">Contato e informações</p>
                      <p style="margin:0 0 7px;font-family:Arial,Helvetica,sans-serif;color:#dbeafe;font-size:12px;line-height:18px;">✉ <a href="mailto:${SUPPORT_EMAIL}" style="color:#ffffff;text-decoration:none;font-weight:700;">${SUPPORT_EMAIL}</a></p>
                      <p style="margin:0 0 7px;font-family:Arial,Helvetica,sans-serif;color:#dbeafe;font-size:12px;line-height:18px;">🌐 <a href="${APP_URL}" style="color:#ffffff;text-decoration:none;font-weight:700;">fisiocarehub.company</a></p>
                      <p style="margin:0 0 7px;font-family:Arial,Helvetica,sans-serif;color:#dbeafe;font-size:12px;line-height:18px;">☎ ${COMPANY_PHONE}</p>
                      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;color:#dbeafe;font-size:12px;line-height:18px;">📍 <strong>Endereço da empresa:</strong><br/>${COMPANY_ADDRESS}</p>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:22px;border-top:1px solid rgba(191,219,254,.20);">
                  <tr>
                    <td style="padding-top:14px;font-family:Arial,Helvetica,sans-serif;color:#93a4c8;font-size:11px;line-height:17px;">© ${year} FisioCareHub. Todos os direitos reservados.<br/>Gerado em: ${generated}</td>
                    <td align="right" style="padding-top:14px;font-family:Arial,Helvetica,sans-serif;color:#bfdbfe;font-size:11px;line-height:17px;">Privacidade &nbsp; | &nbsp; Termos &nbsp; | &nbsp; Ajuda</td>
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
  title: 'Notificação FisioCareHub',
  subtitle: 'Você recebeu uma nova atualização importante no FisioCareHub.',
  greetingName: nome_do_usuario,
  contentHtml: mensagem_principal_da_notificacao,
  generatedAt: data_hora_formatada,
  variant: 'default',
});
