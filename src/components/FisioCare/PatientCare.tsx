import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle2, Circle, Clock, Play, Pause, RotateCcw, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

interface Exercise {
  id: string;
  title: string;
  description: string;
  duration: number; // seconds
  completed: boolean;
}

export const PainDiary = () => {
  const { profile } = useAuth();
  const [intensity, setIntensity] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const emojis = ['😊', '🙂', '😐', '🙁', '😟', '😣', '😖', '😫', '😭', '💀'];

  const handleSave = async () => {
    if (intensity !== null && profile) {
      setIsSaving(true);
      console.log('Salvando diário de dor:', { intensity, paciente_id: profile.id });
      try {
        const { data, error } = await supabase
          .from('diario_dor')
          .insert({
            paciente_id: profile.id,
            intensidade: intensity,
            data_registro: new Date().toISOString()
          })
          .select();

        if (error) {
          console.error('Erro detalhado do Supabase ao salvar diário de dor:', error);
          throw error;
        }
        
        console.log('Diário de dor salvo com sucesso:', data);
        toast.success('Diário de dor atualizado!');
        setIntensity(null);
      } catch (err: any) {
        console.error('Erro ao salvar no diário:', err);
        toast.error('Erro ao salvar no diário: ' + (err.message || 'Erro desconhecido'));
      } finally {
        setIsSaving(false);
      }
    } else {
      console.warn('Não foi possível salvar: intensidade ou perfil ausente', { intensity, profileId: profile?.id });
    }
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl p-3 rounded-2xl border border-white/10 shadow-2xl space-y-3 w-full">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h3 className="text-sm font-black text-white tracking-tight">Como está sua dor agora?</h3>
          <p className="text-slate-400 text-[9px] font-medium">Sua percepção ajuda no tratamento.</p>
        </div>
        <Link to="/diario" className="text-[8px] font-black text-blue-400 uppercase tracking-widest hover:underline">
          Ver Diário Completo
        </Link>
      </div>

      <div className="grid grid-cols-5 gap-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <button
            key={i}
            onClick={() => setIntensity(i + 1)}
            className={cn(
              "flex flex-col items-center gap-1 p-1.5 rounded-xl border transition-all group",
              intensity === i + 1 
                ? "border-[#0047AB] bg-[#0047AB] text-white shadow-lg shadow-blue-900/20" 
                : "border-white/5 bg-white/5 hover:border-white/10 text-slate-500 hover:text-white"
            )}
          >
            <span className="text-lg group-hover:scale-110 transition-transform">{emojis[i]}</span>
            <span className="font-black text-[9px]">{i + 1}</span>
          </button>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={intensity === null || isSaving}
        className={cn(
          "w-full h-10 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2",
          intensity !== null 
            ? "bg-[#0047AB] text-white hover:bg-blue-700 shadow-lg shadow-blue-900/20 active:scale-95" 
            : "bg-white/5 text-slate-600 cursor-not-allowed"
        )}
      >
        {isSaving ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          <CheckCircle2 size={18} />
        )}
        {isSaving ? 'Salvando...' : 'Registrar no Diário'}
      </button>
    </div>
  );
};

export const ExerciseChecklist = () => {
  const { profile } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([
    { id: '1', title: 'Alongamento de Isquiotibiais', description: 'Mantenha a perna esticada por 30 segundos.', duration: 30, completed: false },
    { id: '2', title: 'Fortalecimento de Quadríceps', description: 'Extensão de joelho com caneleira (3x15).', duration: 300, completed: false },
    { id: '3', title: 'Exercício de Equilíbrio', description: 'Ficar em um pé só por 1 minuto.', duration: 60, completed: false },
  ]);

  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const fetchCompletions = async () => {
      if (!profile) return;
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
          .from('checklist_exercicios')
          .select('exercicio_id')
          .eq('paciente_id', profile.id)
          .gte('data_conclusao', today + 'T00:00:00Z');

        if (error) throw error;
        
        if (data) {
          const completedIds = data.map(d => d.exercicio_id);
          setExercises(prev => prev.map(ex => ({
            ...ex,
            completed: completedIds.includes(ex.id)
          })));
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchCompletions();
  }, [profile]);

  useEffect(() => {
    let interval: any;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const startTimer = (exercise: Exercise) => {
    setActiveTimer(exercise.id);
    setTimeLeft(exercise.duration);
    setIsRunning(true);
  };

  const toggleComplete = async (id: string) => {
    if (!profile) {
      console.warn('Não foi possível atualizar exercício: perfil ausente');
      return;
    }
    
    const exercise = exercises.find(ex => ex.id === id);
    if (!exercise) return;

    const newCompleted = !exercise.completed;
    console.log('Atualizando exercício:', { id, newCompleted, paciente_id: profile.id });
    
    try {
      if (newCompleted) {
        const { error } = await supabase.from('checklist_exercicios').insert({
          paciente_id: profile.id,
          exercicio_id: id,
          concluido: true,
          data_conclusao: new Date().toISOString()
        });
        if (error) throw error;
      } else {
        const today = new Date().toISOString().split('T')[0];
        const { error } = await supabase.from('checklist_exercicios')
          .delete()
          .eq('paciente_id', profile.id)
          .eq('exercicio_id', id)
          .gte('data_conclusao', today + 'T00:00:00Z');
        if (error) throw error;
      }
      
      setExercises(prev => prev.map(ex => ex.id === id ? { ...ex, completed: newCompleted } : ex));
      toast.success(newCompleted ? 'Exercício concluído!' : 'Exercício desmarcado');
    } catch (err: any) {
      console.error('Erro ao atualizar exercício:', err);
      toast.error('Erro ao atualizar exercício: ' + (err.message || 'Erro desconhecido'));
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl p-3 rounded-2xl border border-white/10 shadow-2xl space-y-2.5 w-full">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h3 className="text-sm font-black text-white tracking-tight">Checklist de Exercícios</h3>
          <p className="text-slate-400 text-[9px] font-medium">Complete sua rotina diária.</p>
        </div>
        <Link to="/diario" className="text-[8px] font-black text-emerald-400 uppercase tracking-widest hover:underline">
          Ver Diário Completo
        </Link>
      </div>

      <div className="space-y-2">
        {exercises.map((ex) => (
          <div 
            key={ex.id}
            className={cn(
              "p-3 rounded-xl border transition-all flex items-center justify-between gap-3",
              ex.completed ? "bg-emerald-500/10 border-emerald-500/20" : "bg-white/5 border-white/5"
            )}
          >
            <div className="flex items-center gap-2.5">
              <button onClick={() => toggleComplete(ex.id)}>
                {ex.completed ? (
                  <CheckCircle2 className="text-emerald-500" size={20} />
                ) : (
                  <Circle className="text-slate-600" size={20} />
                )}
              </button>
              <div className="space-y-0.5">
                <p className={cn("font-black text-xs text-white", ex.completed && "line-through opacity-50")}>{ex.title}</p>
                <p className="text-[9px] text-slate-400 font-medium">{ex.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeTimer === ex.id ? (
                <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded-lg shadow-sm border border-white/5">
                  <span className="font-black text-[10px] text-blue-400 tabular-nums">{formatTime(timeLeft)}</span>
                  <button onClick={() => setIsRunning(!isRunning)}>
                    {isRunning ? <Pause size={12} className="text-slate-500" /> : <Play size={12} className="text-blue-400" />}
                  </button>
                  <button onClick={() => setTimeLeft(ex.duration)}>
                    <RotateCcw size={12} className="text-slate-500" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => startTimer(ex)}
                  className="p-1.5 bg-slate-800 text-blue-400 rounded-lg shadow-sm border border-white/5 hover:bg-slate-700 transition-all"
                >
                  <Clock size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
