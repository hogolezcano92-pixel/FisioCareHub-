import { Crown, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ProBanner() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-amber-500 to-orange-600 p-6 rounded-3xl shadow-lg shadow-amber-500/20 text-white group">
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500" />
      
      <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight">Recurso Exclusivo PRO</h3>
            <p className="text-sm text-white/80 font-medium">Desbloqueie ferramentas avançadas e impulsione sua carreira.</p>
          </div>
        </div>
        
        <Link 
          to="/subscription" 
          className="px-6 py-3 bg-white text-amber-600 rounded-2xl text-sm font-black hover:bg-amber-50 transition-all flex items-center gap-2 whitespace-nowrap"
        >
          Assinar Agora
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
