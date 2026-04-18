import { Link } from 'react-router-dom';
import { Mail, Shield, FileText, HelpCircle, LayoutDashboard, User } from 'lucide-react';
import Logo from './Logo';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-slate-950 border-t border-white/5 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          {/* Brand Column */}
          <div className="col-span-1 md:col-span-1 space-y-6">
            <Logo size="md" textOnly variant="light" />
            <p className="text-slate-400 text-sm font-medium leading-relaxed">
              Conectando fisioterapeutas e pacientes com tecnologia e cuidado.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Navegação</h4>
            <ul className="space-y-4">
              <li>
                <Link to="/dashboard" className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-blue-400 transition-colors group">
                  <LayoutDashboard size={16} className="text-slate-500 group-hover:text-blue-400" />
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/profile" className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-blue-400 transition-colors group">
                  <User size={16} className="text-slate-500 group-hover:text-blue-400" />
                  Minha Conta
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Legal</h4>
            <ul className="space-y-4">
              <li>
                <Link to="/termos" className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-blue-400 transition-colors group">
                  <FileText size={16} className="text-slate-500 group-hover:text-blue-400" />
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link to="/privacidade" className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-blue-400 transition-colors group">
                  <Shield size={16} className="text-slate-500 group-hover:text-blue-400" />
                  Política de Privacidade
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Column */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Contato</h4>
            <ul className="space-y-4">
              <li>
                <Link to="/suporte" className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-blue-400 transition-colors group">
                  <HelpCircle size={16} className="text-slate-400 group-hover:text-blue-400" />
                  Suporte
                </Link>
              </li>
              <li>
                <a href="mailto:suporte@fisioapp.com" className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-blue-400 transition-colors group">
                  <Mail size={16} className="text-slate-400 group-hover:text-blue-400" />
                  suporte@fisioapp.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="mt-16 pt-8 border-t border-white/5 text-center">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            © {currentYear} <span className="text-white">FisioCareHub</span>. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
