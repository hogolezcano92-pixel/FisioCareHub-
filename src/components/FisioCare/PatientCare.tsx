import React, { useState, useEffect } from 'react';
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
      try {
        const { error } = await supabase
          .from('diario_dor')
          .insert({
            paciente_id: profile.id,
            intensidade: intensity,
            data_registro: new Date().toISOString()
          });

        if (error) throw error;
        toast.success('Diário de dor atualizado!');
        setIntensity(null);
      } catch (err) {
        console.error(err);
        toast.error('Erro ao salvar no diário.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
      <div className="space-y-2">
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Como está sua dor agora?</h3>
        <p className="text-slate-500 text-base font-medium">Sua percepção ajuda a ajustar seu tratamento em tempo real.</p>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <button
            key={i}
            onClick={() => setIntensity(i + 1)}
            className={cn(
              "flex flex-col items-center gap-3 p-4 rounded-[2rem] border-2 transition-all group",
              intensity === i + 1 
                ? "border-blue-600 bg-blue-50 text-blue-600 scale-105 shadow-lg shadow-blue-100" 
                : "border-slate-50 hover:border-slate-200 text-slate-400 bg-slate-50/50"
            )}
          >
            <span className="text-3xl group-hover:scale-110 transition-transform">{emojis[i]}</span>
            <span className="font-black text-sm">{i + 1}</span>
          </button>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={intensity === null || isSaving}
        className={cn(
          "w-full py-6 rounded-[2rem] font-black text-xl transition-all shadow-2xl flex items-center justify-center gap-3",
          intensity !== null 
            ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 scale-[1.02]" 
            : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
        )}
      >
        {isSaving ? (
          <Loader2 className="animate-spin" size={24} />
        ) : (
          <CheckCircle2 size={24} />
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
    if (!profile) return;
    
    const exercise = exercises.find(ex => ex.id === id);
    if (!exercise) return;

    const newCompleted = !exercise.completed;
    
    try {
      if (newCompleted) {
        await supabase.from('checklist_exercicios').insert({
          paciente_id: profile.id,
          exercicio_id: id,
          concluido: true,
          data_conclusao: new Date().toISOString()
        });
      } else {
        const today = new Date().toISOString().split('T')[0];
        await supabase.from('checklist_exercicios')
          .delete()
          .eq('paciente_id', profile.id)
          .eq('exercicio_id', id)
          .gte('data_conclusao', today + 'T00:00:00Z');
      }
      
      setExercises(prev => prev.map(ex => ex.id === id ? { ...ex, completed: newCompleted } : ex));
      toast.success(newCompleted ? 'Exercício concluído!' : 'Exercício desmarcado');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar exercício.');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Checklist de Exercícios</h3>
          <p className="text-slate-500 text-sm font-medium">Complete sua rotina diária para uma recuperação mais rápida.</p>
        </div>
        <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-full font-black text-sm">
          {exercises.filter(e => e.completed).length}/{exercises.length}
        </div>
      </div>

      <div className="space-y-4">
        {exercises.map((ex) => (
          <div 
            key={ex.id}
            className={cn(
              "p-5 rounded-3xl border transition-all flex items-center justify-between gap-4",
              ex.completed ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100"
            )}
          >
            <div className="flex items-center gap-4">
              <button onClick={() => toggleComplete(ex.id)}>
                {ex.completed ? (
                  <CheckCircle2 className="text-emerald-500" size={28} />
                ) : (
                  <Circle className="text-slate-300" size={28} />
                )}
              </button>
              <div className="space-y-1">
                <p className={cn("font-black text-slate-900", ex.completed && "line-through opacity-50")}>{ex.title}</p>
                <p className="text-xs text-slate-500 font-medium">{ex.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeTimer === ex.id ? (
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100">
                  <span className="font-black text-blue-600 tabular-nums">{formatTime(timeLeft)}</span>
                  <button onClick={() => setIsRunning(!isRunning)}>
                    {isRunning ? <Pause size={18} className="text-slate-400" /> : <Play size={18} className="text-blue-600" />}
                  </button>
                  <button onClick={() => setTimeLeft(ex.duration)}>
                    <RotateCcw size={18} className="text-slate-400" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => startTimer(ex)}
                  className="p-3 bg-white text-blue-600 rounded-2xl shadow-sm border border-slate-100 hover:bg-blue-50 transition-all"
                >
                  <Clock size={20} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
