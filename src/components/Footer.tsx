import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Shield, FileText, HelpCircle, LayoutDashboard, User, Instagram, MessageCircle } from 'lucide-react';
import Logo from './Logo';

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
                    <div className="p-2 bg-white/5 rounded-lg group-hover:bg-pink-500/10 transition-colors">
                      <Instagram size={18} className="group-hover:scale-110 transition-transform" />
                    </div>
                    @fisiocarehub.app
                  </a>
                  <a 
                    href="https://wa.me/5511984040563" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-emerald-500 transition-all hover:translate-x-1 group"
                  >
                    <div className="p-2 bg-white/5 rounded-lg group-hover:bg-emerald-500/10 transition-colors">
                      <MessageCircle size={18} className="group-hover:scale-110 transition-transform" />
                    </div>
                    +55 11 98404-0563
                  </a>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="mt-16 pt-8 border-t border-white/5 text-center">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            © {currentYear} <span className="text-white">FisioCareHub</span>. {t('footer.rights', 'Todos os direitos reservados.')}
          </p>
        </div>
      </div>
    </footer>
  );
}
