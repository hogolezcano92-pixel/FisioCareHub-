import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { 
  Activity, 
  Video, 
  Loader2, 
  Dumbbell,
  Play
} from 'lucide-react';

export default function PatientExercises() {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchExercises();
    }
  }, [user]);

  const fetchExercises = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('patient_exercises')
        .select('*')
        .eq('patient_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExercises(data || []);
    } catch (err) {
      console.error('Erro ao buscar exercícios:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-12 h-12 text-sky-500 animate-spin" />
        <p className="text-slate-500 font-bold animate-pulse">Carregando seus exercícios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full">
      <header>
        <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 tracking-tight">Meus Exercícios</h1>
        <p className="text-slate-400 font-medium">Exercícios prescritos pelo seu fisioterapeuta.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exercises.length === 0 ? (
          <div className="col-span-full bg-slate-900/50 backdrop-blur-xl p-20 rounded-[3rem] border border-slate-800 text-center">
            <Dumbbell size={48} className="text-slate-700 mx-auto mb-4" />
            <h3 className="text-2xl font-black text-white">Nenhum exercício prescrito</h3>
            <p className="text-slate-400 mt-2 font-medium">Seu fisioterapeuta ainda não prescreveu exercícios para você.</p>
          </div>
        ) : (
          exercises.map((ex) => (
            <motion.div
              key={ex.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] border border-slate-800 shadow-sm overflow-hidden group hover:shadow-2xl hover:shadow-indigo-500/10 transition-all"
            >
              <div className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center">
                    <Activity size={24} />
                  </div>
                  <h3 className="text-xl font-black text-white leading-tight">{ex.exercise_name}</h3>
                </div>

                <p className="text-slate-400 font-medium mb-6 line-clamp-3">{ex.description}</p>

                <div className="flex gap-3 mb-8">
                  <div className="flex-1 bg-slate-800/50 p-3 rounded-2xl text-center">
                    <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Séries</span>
                    <span className="text-lg font-black text-white">{ex.sets || '0'}</span>
                  </div>
                  <div className="flex-1 bg-slate-800/50 p-3 rounded-2xl text-center">
                    <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Reps</span>
                    <span className="text-lg font-black text-white">{ex.reps || '0'}</span>
                  </div>
                </div>

                {ex.video_url && (
                  <a
                    href={ex.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
                  >
                    <Play size={18} fill="currentColor" />
                    Ver Vídeo
                  </a>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
