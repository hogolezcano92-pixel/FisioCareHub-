import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, MessageSquare, Send, X, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface EvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: {
    id: number;
    fisio_id: string;
    fisio_nome?: string;
  };
  userId: string;
  onSuccess: () => void;
}

export default function EvaluationModal({ isOpen, onClose, appointment, userId, onSuccess }: EvaluationModalProps) {
  const [ratingPhysio, setRatingPhysio] = useState(0);
  const [ratingPlatform, setRatingPlatform] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (ratingPhysio === 0 || ratingPlatform === 0) {
      setError('Por favor, avalie o profissional e a plataforma.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: submitError } = await supabase
        .from('avaliacoes')
        .insert({
          paciente_id: userId,
          profissional_id: appointment.fisio_id,
          agendamento_id: appointment.id,
          nota_profissional: ratingPhysio,
          nota_plataforma: ratingPlatform,
          comentario: comment || null
        });

      if (submitError) throw submitError;

      setSubmitted(true);
      onSuccess();
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Erro ao enviar avaliação:', err);
      setError('Não foi possível enviar sua avaliação agora. Tente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const StarRating = ({ value, onChange, label }: { value: number, onChange: (val: number) => void, label: string }) => (
    <div className="space-y-3">
      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onChange(star)}
            className="focus:outline-none transition-transform active:scale-90"
          >
            <Star
              size={32}
              className={cn(
                "transition-colors duration-300",
                star <= value ? "text-yellow-400 fill-yellow-400" : "text-slate-700 hover:text-slate-500"
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-8 pb-0 flex justify-between items-start">
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-white tracking-tighter">Sua Opinião Importa</h2>
                <p className="text-slate-400 font-medium">Como foi seu atendimento com {appointment.fisio_nome || 'o especialista'}?</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full text-slate-500 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-8">
              {submitted ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-12 space-y-4"
                >
                  <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400">
                    <CheckCircle2 size={48} />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-black text-white">Avaliação Recebida!</h3>
                    <p className="text-slate-400">Obrigado por nos ajudar a melhorar.</p>
                  </div>
                </motion.div>
              ) : (
                <>
                  <div className="space-y-6">
                    <StarRating 
                      value={ratingPhysio} 
                      onChange={setRatingPhysio} 
                      label="O Profissional" 
                    />
                    <StarRating 
                      value={ratingPlatform} 
                      onChange={setRatingPlatform} 
                      label="A Plataforma" 
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-400">
                      <MessageSquare size={16} />
                      <p className="text-sm font-bold uppercase tracking-widest">Comentário Adicional</p>
                    </div>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Conte-nos mais sobre sua experiência..."
                      className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] p-4 text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-blue-500 transition-all h-32 resize-none text-sm font-medium"
                    />
                  </div>

                  {error && (
                    <p className="text-rose-400 text-sm font-bold text-center bg-rose-400/10 py-3 rounded-2xl border border-rose-400/20">
                      {error}
                    </p>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className={cn(
                      "w-full py-5 rounded-[1.5rem] font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl",
                      loading 
                        ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                        : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20 hover:shadow-blue-500/30"
                    )}
                  >
                    {loading ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                        <Star size={24} />
                      </motion.div>
                    ) : (
                      <>
                        Enviar Avaliação
                        <Send size={20} />
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
