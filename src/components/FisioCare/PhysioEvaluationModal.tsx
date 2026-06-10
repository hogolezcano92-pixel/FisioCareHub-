import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, MessageSquare, Send, X, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { logActivity } from '../../services/activityService';

interface PhysioEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: {
    id: string;
    paciente_id: string;
    paciente_nome?: string;
  };
  physioId: string;
  onSuccess: () => void;
}

export default function PhysioEvaluationModal({ isOpen, onClose, appointment, physioId, onSuccess }: PhysioEvaluationModalProps) {
  const [ratingPatient, setRatingPatient] = useState(0);
  const [ratingPlatform, setRatingPlatform] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (ratingPatient === 0 || ratingPlatform === 0) {
      setError('Por favor, avalie o paciente e a plataforma.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: existingEvaluation, error: existingError } = await supabase
        .from('avaliacoes')
        .select('id')
        .eq('agendamento_id', appointment.id)
        .eq('profissional_id', physioId)
        .maybeSingle();

      if (existingError) throw existingError;

      const payload = {
        paciente_id: appointment.paciente_id,
        profissional_id: physioId,
        agendamento_id: appointment.id,
        nota_paciente: ratingPatient,
        nota_plataforma_profissional: ratingPlatform,
        comentario_profissional: comment || null,
        avaliado_por_fisio_em: new Date().toISOString(),
      };

      if (existingEvaluation?.id) {
        const { error: updateError } = await supabase
          .from('avaliacoes')
          .update(payload)
          .eq('id', existingEvaluation.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('avaliacoes')
          .insert(payload);

        if (insertError) throw insertError;
      }

      await logActivity(
        physioId,
        'fisio',
        'avaliacao_enviada',
        `Você avaliou o atendimento com ${appointment.paciente_nome || 'o paciente'}`,
        appointment.id,
      );

      setSubmitted(true);
      onSuccess();
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Erro ao enviar avaliação do fisioterapeuta:', err);
      setError(
        err?.message
          ? `Não foi possível enviar sua avaliação: ${err.message}`
          : 'Não foi possível enviar sua avaliação agora. Tente mais tarde.',
      );
    } finally {
      setLoading(false);
    }
  };

  const StarRating = ({ value, onChange, label }: { value: number; onChange: (val: number) => void; label: string }) => (
    <div className="space-y-3">
      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="focus:outline-none transition-transform active:scale-90"
            aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
          >
            <Star
              size={32}
              className={cn(
                'transition-colors duration-300',
                star <= value ? 'text-yellow-400 fill-yellow-400' : 'text-slate-700 hover:text-slate-500',
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
            <div className="p-8 pb-0 flex justify-between items-start">
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-white tracking-tighter">Avaliação do Atendimento</h2>
                <p className="text-slate-400 font-medium">
                  Como foi sua experiência com {appointment.paciente_nome || 'o paciente'} e com a plataforma?
                </p>
              </div>
              <button
                type="button"
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
                    <h3 className="text-xl font-black text-white">Avaliação enviada!</h3>
                    <p className="text-slate-400">Obrigado por ajudar a melhorar o FisioCareHub.</p>
                  </div>
                </motion.div>
              ) : (
                <>
                  <div className="space-y-6">
                    <StarRating value={ratingPatient} onChange={setRatingPatient} label="O Paciente" />
                    <StarRating value={ratingPlatform} onChange={setRatingPlatform} label="A Plataforma" />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-400">
                      <MessageSquare size={16} />
                      <p className="text-sm font-bold uppercase tracking-widest">Comentário interno</p>
                    </div>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Conte como foi a experiência do atendimento, comunicação, pontualidade ou sugestões para a plataforma..."
                      className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] p-4 text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-blue-500 transition-all h-32 resize-none text-sm font-medium"
                    />
                  </div>

                  {error && (
                    <p className="text-rose-400 text-sm font-bold text-center bg-rose-400/10 py-3 rounded-2xl border border-rose-400/20">
                      {error}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className={cn(
                      'w-full py-5 rounded-[1.5rem] font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl',
                      loading
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20 hover:shadow-blue-500/30',
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
