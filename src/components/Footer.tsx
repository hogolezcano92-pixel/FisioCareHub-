import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Shield, FileText, HelpCircle, LayoutDashboard, User, Instagram } from 'lucide-react';
import Logo from './Logo';


const WhatsAppIcon = ({ className = '' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    className={className}
    fill="currentColor"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.464 3.488" />
  </svg>
);

export default function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-[#0B1120] border-t border-white/5 transition-colors duration-300 relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          {/* Brand Column */}
          <div className="col-span-1 md:col-span-1 space-y-6">
            <Logo size="md" variant="light" />
            <p className="text-slate-400 text-sm font-medium leading-relaxed">
              {t('footer.description', 'Conectando fisioterapeutas e pacientes com tecnologia e cuidado.')}
            </p>
          </div>

          {/* Navigation Links */}
          <div className="space-y-6">
            <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">{t('footer.navigation', 'Navegação')}</h4>
            <ul className="space-y-4">
              <li>
                <Link to="/dashboard" className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-blue-400 transition-colors group">
                  <LayoutDashboard size={16} className="text-slate-500 group-hover:text-blue-400" />
                  {t('footer.dashboard', 'Dashboard')}
                </Link>
              </li>
              <li>
                <Link to="/profile" className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-blue-400 transition-colors group">
                  <User size={16} className="text-slate-500 group-hover:text-blue-400" />
                  {t('footer.account', 'Minha Conta')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div className="space-y-6">
            <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">{t('footer.legal', 'Legal')}</h4>
            <ul className="space-y-4">
              <li>
                <Link to="/termos" className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-blue-400 transition-colors group">
                  <FileText size={16} className="text-slate-500 group-hover:text-blue-400" />
                  {t('footer.terms', 'Termos de Uso')}
                </Link>
              </li>
              <li>
                <Link to="/privacidade" className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-blue-400 transition-colors group">
                  <Shield size={16} className="text-slate-500 group-hover:text-blue-400" />
                  {t('footer.privacy', 'Política de Privacidade')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Column */}
          <div className="space-y-6">
            <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">{t('footer.contact', 'Contato')}</h4>
            <ul className="space-y-4">
              <li>
                <Link to="/suporte" className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-blue-400 transition-colors group">
                  <HelpCircle size={16} className="text-slate-400 group-hover:text-blue-400" />
                  {t('footer.support', 'Suporte')}
                </Link>
              </li>
              <li>
                <a href="mailto:suporte@fisiocarehub.company" className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-blue-400 transition-colors group">
                  <Mail size={16} className="text-slate-400 group-hover:text-blue-400" />
                  suporte@fisiocarehub.company
                </a>
              </li>
              <li className="pt-2">
                <div className="flex flex-col gap-4">
                  <a 
                    href="https://instagram.com/fisiocarehub.app" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-pink-500 transition-all hover:translate-x-1 group"
                  >
                    <div className="p-2 bg-[#E1306C]/10 rounded-lg group-hover:bg-[#E1306C] transition-colors">
                      <Instagram size={18} className="text-[#E1306C] group-hover:text-white group-hover:scale-110 transition-transform" />
                    </div>
                    @fisiocarehub.app
                  </a>
                  <a 
                    href="https://wa.me/5511984040563" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="Falar com o FisioCareHub pelo WhatsApp"
                    className="flex items-center gap-3 text-sm font-bold text-slate-300 hover:text-white transition-all hover:translate-x-1 group"
                  >
                    <div className="w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-br from-[#064E3B] via-[#047857] to-[#022C22] flex items-center justify-center shadow-lg shadow-green-500/20 ring-1 ring-white/10 group-hover:scale-105 group-hover:shadow-green-500/30 transition-all duration-300">
                      <WhatsAppIcon className="w-7 h-7 text-white drop-shadow-sm" />
                    </div>
                    <span className="text-slate-300 group-hover:text-white transition-colors">
                      +55 11 98404-0563
                    </span>
                  </a>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="mt-16 pt-8 border-t border-white/5 text-center">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            © {currentYear} <span className="bg-gradient-to-r from-sky-400 via-violet-400 to-white bg-clip-text text-transparent">FisioCareHub</span>. {t('footer.rights', 'Todos os direitos reservados.')}
          </p>
        </div>
      </div>
    </footer>
  );
}
