import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Shield, FileText, HelpCircle, LayoutDashboard, User, Smartphone } from 'lucide-react';
import Logo from './Logo';
import { openInstallAppGuide, useIsAppInstalled } from './InstallAppGuide';

const InstagramIcon = ({ className = '' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="3.2"
      y="3.2"
      width="17.6"
      height="17.6"
      rx="5.2"
      stroke="currentColor"
      strokeWidth="2"
    />
    <circle
      cx="12"
      cy="12"
      r="4.15"
      stroke="currentColor"
      strokeWidth="2"
    />
    <circle cx="17.1" cy="6.9" r="1.25" fill="currentColor" />
  </svg>
);

export default function Footer() {
  const { t } = useTranslation();
  const isInstalled = useIsAppInstalled();
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
              {!isInstalled && (
                <li>
                  <button
                    type="button"
                    onClick={openInstallAppGuide}
                    className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-blue-400 transition-colors group text-left cursor-pointer"
                  >
                    <Smartphone size={16} className="text-slate-500 group-hover:text-blue-400 shrink-0" />
                    <span>{t('footer.install_app', '📱 Instale o FisioCareHub')}</span>
                  </button>
                </li>
              )}
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
                    <div className="w-11 h-11 shrink-0 rounded-2xl bg-[radial-gradient(circle_at_30%_107%,#fdf497_0%,#fdf497_5%,#fd5949_45%,#d6249f_60%,#285AEB_90%)] flex items-center justify-center shadow-lg shadow-pink-500/20 ring-1 ring-white/10 group-hover:scale-105 group-hover:shadow-pink-500/30 transition-all duration-300">
                      <InstagramIcon className="w-7 h-7 text-white drop-shadow-sm" />
                    </div>
                    @fisiocarehub.app
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
