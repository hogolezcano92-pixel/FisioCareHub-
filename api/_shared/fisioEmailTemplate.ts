/**
 * FisioCareHub - Responsive transactional email template.
 * Template em tabelas + estilos inline para melhor compatibilidade com Gmail, Outlook e mobile.
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
const LOGO_URL = `${APP_URL}/assets/email-logo-fisiocarehub.png`;

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

const variantConfig: Record<EmailVariant, { icon: string; tone: string; accent: string; soft: string }> = {
  appointment: { icon: '✓', tone: 'Agendamento', accent: '#16a34a', soft: '#dcfce7' },
  payment: { icon: 'R$', tone: 'Pagamento', accent: '#16a34a', soft: '#dcfce7' },
  document: { icon: 'DOC', tone: 'Documento', accent: '#2563eb', soft: '#dbeafe' },
  exercise: { icon: 'MOV', tone: 'Exercício', accent: '#0d9488', soft: '#ccfbf1' },
  withdrawal: { icon: 'R$', tone: 'Financeiro', accent: '#d97706', soft: '#fef3c7' },
  invite: { icon: '@', tone: 'Convite', accent: '#0284c7', soft: '#e0f2fe' },
  support: { icon: '?', tone: 'Suporte', accent: '#7c3aed', soft: '#ede9fe' },
  approval: { icon: '✓', tone: 'Cadastro', accent: '#16a34a', soft: '#dcfce7' },
  default: { icon: 'i', tone: 'Notificação', accent: '#2563eb', soft: '#dbeafe' },
};

const buildDetailRows = (details: EmailDetailItem[] = []) => {
  const visibleDetails = Array.isArray(details)
    ? details.filter((item) => item && item.value !== undefined && item.value !== null && String(item.value).trim() !== '')
    : [];

  if (visibleDetails.length === 0) return '';

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:18px;background:#ffffff;border:1px solid #dbeafe;border-radius:14px;">
      ${visibleDetails
        .map((item, index) => `
          <tr>
            <td style="padding:12px 14px;border-bottom:${index === visibleDetails.length - 1 ? '0' : '1px solid #e5edf8'};font-family:Arial,Helvetica,sans-serif;color:#0f2a55;font-size:13px;line-height:18px;font-weight:700;vertical-align:top;width:38%;">
              ${escapeHtml(item.label)}
            </td>
            <td style="padding:12px 14px;border-bottom:${index === visibleDetails.length - 1 ? '0' : '1px solid #e5edf8'};font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:13px;line-height:18px;font-weight:600;vertical-align:top;word-break:break-word;overflow-wrap:break-word;">
              ${escapeHtml(item.value)}
              ${item.helper ? `<div style="margin-top:3px;color:#64748b;font-size:12px;line-height:17px;font-weight:400;">${escapeHtml(item.helper)}</div>` : ''}
            </td>
          </tr>
        `)
        .join('')}
    </table>
  `;
};

const buildCtas = (ctas: EmailCta[] = []) => {
  const visibleCtas = Array.isArray(ctas) ? ctas.slice(0, 2).filter((cta) => cta?.href && cta?.label) : [];
  if (visibleCtas.length === 0) return '';

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="border-collapse:collapse;margin-top:20px;">
      ${visibleCtas
        .map((cta) => `
          <tr>
            <td align="center" style="padding:5px 0;">
              <a href="${escapeHtml(cta.href)}" style="display:block;width:100%;max-width:280px;border-radius:12px;padding:13px 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:18px;font-weight:800;text-decoration:none;text-align:center;${cta.secondary ? 'background:#0f2f72;color:#ffffff;border:1px solid #2563eb;' : 'background:#ffffff;color:#0756d8;border:1px solid #bfdbfe;'}">
                ${escapeHtml(cta.label)} &nbsp;›
              </a>
            </td>
          </tr>
        `)
        .join('')}
    </table>
  `;
};

const notificationChips = `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:18px;">
    <tr>
      <td style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;font-size:16px;line-height:22px;font-weight:800;padding:0 0 10px;">Também usamos este padrão para</td>
    </tr>
    <tr>
      <td style="font-family:Arial,Helvetica,sans-serif;color:#334155;font-size:12px;line-height:22px;">
        <span style="display:inline-block;margin:0 6px 8px 0;padding:7px 10px;border-radius:999px;background:#ffffff;border:1px solid #dbeafe;color:#0f2a55;font-weight:700;">Pagamento aprovado</span>
        <span style="display:inline-block;margin:0 6px 8px 0;padding:7px 10px;border-radius:999px;background:#ffffff;border:1px solid #dbeafe;color:#0f2a55;font-weight:700;">Lembrete de consulta</span>
        <span style="display:inline-block;margin:0 6px 8px 0;padding:7px 10px;border-radius:999px;background:#ffffff;border:1px solid #dbeafe;color:#0f2a55;font-weight:700;">Documento disponível</span>
        <span style="display:inline-block;margin:0 6px 8px 0;padding:7px 10px;border-radius:999px;background:#ffffff;border:1px solid #dbeafe;color:#0f2a55;font-weight:700;">Exercício prescrito</span>
        <span style="display:inline-block;margin:0 6px 8px 0;padding:7px 10px;border-radius:999px;background:#ffffff;border:1px solid #dbeafe;color:#0f2a55;font-weight:700;">Solicitação de saque</span>
        <span style="display:inline-block;margin:0 6px 8px 0;padding:7px 10px;border-radius:999px;background:#ffffff;border:1px solid #dbeafe;color:#0f2a55;font-weight:700;">Suporte</span>
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
  <style>
    @media only screen and (max-width: 620px) {
      .email-shell { width: 100% !important; max-width: 100% !important; }
      .email-padding { padding-left: 14px !important; padding-right: 14px !important; }
      .email-logo { width: 220px !important; max-width: 220px !important; }
      .email-title { font-size: 23px !important; line-height: 29px !important; }
      .email-subtitle { font-size: 14px !important; line-height: 21px !important; }
      .email-card { border-radius: 16px !important; }
      .email-main-padding { padding: 20px 18px !important; }
      .email-hide-mobile { display: none !important; max-height: 0 !important; overflow: hidden !important; }
      .email-footer-text { font-size: 12px !important; line-height: 19px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;width:100%;background:#eef4ff;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">${safePreheader}</div>
  <center style="width:100%;background:#eef4ff;padding:18px 0;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#eef4ff;">
      <tr>
        <td align="center" class="email-padding" style="padding:0 12px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" class="email-shell" style="width:600px;max-width:600px;border-collapse:separate;border-spacing:0;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 16px 42px rgba(15,23,42,.13);">
            <tr>
              <td align="center" style="padding:20px 22px 16px;background:#ffffff;border-bottom:1px solid #e5edf8;">
                <img class="email-logo" src="${escapeHtml(LOGO_URL)}" width="300" alt="FisioCareHub - Reabilitação & Performance" style="display:block;width:300px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;" />
              </td>
            </tr>
            <tr>
              <td style="background:#07152f;padding:20px 22px 22px;" class="email-padding">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="email-card" style="border-collapse:separate;border-spacing:0;background:#0b3ea8;border-radius:18px;overflow:hidden;border:1px solid #2f6ff0;">
                  <tr>
                    <td class="email-main-padding" style="padding:24px 24px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                        <tr>
                          <td width="58" valign="top" style="width:58px;padding-right:14px;">
                            <table role="presentation" width="50" height="50" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:50px;height:50px;border-radius:50px;background:${escapeHtml(cfg.soft)};border:2px solid ${escapeHtml(cfg.accent)};">
                              <tr>
                                <td align="center" valign="middle" style="font-family:Arial,Helvetica,sans-serif;color:${escapeHtml(cfg.accent)};font-size:18px;line-height:20px;font-weight:900;">${escapeHtml(cfg.icon)}</td>
                              </tr>
                            </table>
                          </td>
                          <td valign="top">
                            <div style="font-family:Arial,Helvetica,sans-serif;color:#bfdbfe;font-size:11px;line-height:15px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px;">${escapeHtml(cfg.tone)}</div>
                            <h1 class="email-title" style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;color:#ffffff;font-size:27px;line-height:34px;font-weight:900;letter-spacing:-.35px;">${safeTitle}</h1>
                            <p class="email-subtitle" style="margin:0;font-family:Arial,Helvetica,sans-serif;color:#dbeafe;font-size:15px;line-height:23px;font-weight:400;">${safeSubtitle}</p>
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
              <td style="background:#f8fbff;padding:22px;" class="email-padding">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="email-card" style="border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #dbeafe;border-radius:16px;overflow:hidden;">
                  <tr>
                    <td class="email-main-padding" style="padding:24px 24px 22px;font-family:Arial,Helvetica,sans-serif;color:#334155;font-size:15px;line-height:24px;">
                      ${safeGreeting ? `<p style="margin:0 0 16px;color:#0f172a;font-size:17px;line-height:24px;font-weight:700;">Olá, <strong>${safeGreeting}</strong></p>` : ''}
                      <div style="font-family:Arial,Helvetica,sans-serif;color:#334155;font-size:15px;line-height:24px;word-break:normal;overflow-wrap:break-word;">${contentHtml || ''}</div>
                      ${buildDetailRows(details)}
                    </td>
                  </tr>
                </table>
                ${notificationChips}
              </td>
            </tr>
            <tr>
              <td style="background:#07152f;padding:24px 24px 18px;" class="email-padding">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="font-family:Arial,Helvetica,sans-serif;color:#ffffff;font-size:22px;line-height:26px;font-weight:900;">
                      Fisio<span style="color:#38bdf8;">Care</span>Hub
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:3px;font-family:Arial,Helvetica,sans-serif;color:#bfdbfe;font-size:10px;line-height:14px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">
                      Reabilitação &amp; Performance
                    </td>
                  </tr>
                  <tr>
                    <td class="email-footer-text" style="padding-top:14px;font-family:Arial,Helvetica,sans-serif;color:#dbeafe;font-size:12px;line-height:19px;">
                      Tecnologia e cuidado humano trabalhando juntos para a sua melhor recuperação e performance.
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:16px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#0b1d42;border:1px solid rgba(191,219,254,.18);border-radius:14px;">
                        <tr>
                          <td class="email-footer-text" style="padding:14px;font-family:Arial,Helvetica,sans-serif;color:#dbeafe;font-size:12px;line-height:20px;word-break:normal;overflow-wrap:break-word;">
                            <strong style="color:#ffffff;">Contato e informações</strong><br />
                            E-mail: <a href="mailto:${SUPPORT_EMAIL}" style="color:#ffffff;text-decoration:none;font-weight:700;word-break:break-all;">${SUPPORT_EMAIL}</a><br />
                            Site: <a href="${APP_URL}" style="color:#ffffff;text-decoration:none;font-weight:700;word-break:break-all;">fisiocarehub.company</a><br />
                            Telefone: <a href="tel:+5511984040563" style="color:#ffffff;text-decoration:none;font-weight:700;">${COMPANY_PHONE}</a><br />
                            Endereço da empresa: ${COMPANY_ADDRESS}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:16px;border-top:1px solid rgba(191,219,254,.18);font-family:Arial,Helvetica,sans-serif;color:#93a4c8;font-size:11px;line-height:17px;">
                      © ${year} FisioCareHub. Todos os direitos reservados.<br />
                      Gerado em: ${generated}<br />
                      <span style="color:#bfdbfe;">Privacidade</span> &nbsp;|&nbsp; <span style="color:#bfdbfe;">Termos</span> &nbsp;|&nbsp; <span style="color:#bfdbfe;">Ajuda</span>
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
  title: 'Notificação FisioCareHub',
  subtitle: 'Você recebeu uma nova atualização importante no FisioCareHub.',
  greetingName: nome_do_usuario,
  contentHtml: mensagem_principal_da_notificacao,
  generatedAt: data_hora_formatada,
  variant: 'default',
});
