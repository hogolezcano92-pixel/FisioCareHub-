import { useState, useEffect } from 'react';
import { ShieldCheck, Activity, Users, Heart, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const PATIENT_IMAGES = [
  "https://images.unsplash.com/photo-1542884748-2b87b36c6b90?auto=format&fit=crop&q=80&w=250&h=250",
  "https://images.unsplash.com/photo-1581579885975-53933d6ea909?auto=format&fit=crop&q=80&w=250&h=250",
  "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&q=80&w=250&h=250",
  "https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&q=80&w=250&h=250",
  "https://images.unsplash.com/photo-1466632366697-391494607718?auto=format&fit=crop&q=80&w=250&h=250",
  "https://images.unsplash.com/photo-1447933631397-806ee35299b4?auto=format&fit=crop&q=80&w=250&h=250",
  "https://images.unsplash.com/photo-1621348160394-211bc0a5a60d?auto=format&fit=crop&q=80&w=250&h=250",
  "https://images.unsplash.com/photo-1522333323558-4b050686940a?auto=format&fit=crop&q=80&w=250&h=250"
];

// fallback seguro caso alguma imagem quebre
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=250&h=250&fit=crop";

export default function PhysioHighlight() {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const currentImage = PATIENT_IMAGES[index];

  useEffect(() => {
    const timer = setInterval(() => {
      setLoaded(false);
      setIndex((prev) => (prev + 1) % PATIENT_IMAGES.length);
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="bg-[#0a0f1e] py-24 px-6 overflow-hidden relative">
      {/* Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto flex flex-col items-center relative z-10">

        {/* CARD PRINCIPAL */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="bg-white/5 backdrop-blur-3xl border border-white/10 p-10 md:p-14 rounded-[3.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] flex flex-col items-center gap-6 mb-20 group hover:border-white/20 transition-all duration-500 w-full max-w-2xl"
        >

          <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">

            <AnimatePresence mode="wait">
              <motion.img
                key={currentImage}
                src={currentImage}
                alt="Paciente Real"
                initial={{ opacity: 0, scale: 0.85, rotate: -10 }}
                animate={{ opacity: loaded ? 1 : 0, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.85, rotate: 10 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full border-4 border-blue-500/20 object-cover shadow-2xl shadow-blue-500/20"
                onLoad={() => setLoaded(true)}
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_IMAGE;
                  setLoaded(true);
                }}
              />
            </AnimatePresence>

            {/* círculo decorativo */}
            <div className="absolute inset-0 border-2 border-dashed border-slate-700/30 rounded-full animate-[spin_20s_linear_infinite]" />
          </div>

          <div className="text-center space-y-4">
            <h2 className="text-white font-black text-2xl md:text-5xl tracking-tighter leading-tight">
              +2.000 <span className="text-blue-500 italic">Vidas Transformadas</span>
            </h2>

            <div className="flex justify-center gap-1.5 py-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={22}
                  className="fill-amber-400 text-amber-400"
                />
              ))}
            </div>

            <p className="text-slate-400 font-medium text-sm md:text-base max-w-md mx-auto leading-relaxed">
              Nossa metodologia humanizada já devolveu autonomia e bem-estar para milhares de famílias brasileiras em domicílio.
            </p>
          </div>
        </motion.div>

        {/* GRID (INALTERADO) */}
        <div className="grid grid-cols-2 gap-12 md:gap-24 w-full max-w-3xl">

          <motion.div className="flex flex-col items-center gap-5 group">
            <div className="w-20 h-20 rounded-[2rem] bg-amber-400/10 border border-amber-400/20 flex items-center justify-center group-hover:scale-110 transition-all duration-500">
              <ShieldCheck className="text-amber-400" size={40} />
            </div>
            <span className="text-white font-black text-[11px] uppercase tracking-[0.4em]">CREFITO</span>
          </motion.div>

          <motion.div className="flex flex-col items-center gap-5 group">
            <div className="w-20 h-20 rounded-[2rem] bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center group-hover:scale-110 transition-all duration-500">
              <Activity className="text-emerald-400" size={40} />
            </div>
            <span className="text-white font-black text-[11px] uppercase tracking-[0.4em]">MONITORAMENTO</span>
          </motion.div>

          <motion.div className="flex flex-col items-center gap-5 group">
            <div className="w-20 h-20 rounded-[2rem] bg-blue-400/10 border border-blue-400/20 flex items-center justify-center group-hover:scale-110 transition-all duration-500">
              <Users className="text-blue-400" size={40} />
            </div>
            <span className="text-white font-black text-[11px] uppercase tracking-[0.4em]">+500 FISIOS</span>
          </motion.div>

          <motion.div className="flex flex-col items-center gap-5 group">
            <div className="w-20 h-20 rounded-[2rem] bg-rose-400/10 border border-rose-400/20 flex items-center justify-center group-hover:scale-110 transition-all duration-500">
              <Heart className="text-rose-400" size={40} />
            </div>
            <span className="text-white font-black text-[11px] uppercase tracking-[0.4em]">HUMANIZADO</span>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
