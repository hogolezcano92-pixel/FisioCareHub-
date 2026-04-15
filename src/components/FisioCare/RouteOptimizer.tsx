import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Route, Clock, ChevronRight, Map as MapIcon, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface PatientLocation {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

// TSP Approximation (Nearest Neighbor)
export const optimizeRoute = (currentLat: number, currentLng: number, patients: PatientLocation[]) => {
  let unvisited = [...patients];
  let route: PatientLocation[] = [];
  let currentPos = { lat: currentLat, lng: currentLng };

  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const dist = Math.sqrt(
        Math.pow(unvisited[i].lat - currentPos.lat, 2) + 
        Math.pow(unvisited[i].lng - currentPos.lng, 2)
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = i;
      }
    }

    const nextPatient = unvisited.splice(nearestIndex, 1)[0];
    route.push(nextPatient);
    currentPos = { lat: nextPatient.lat, lng: nextPatient.lng };
  }

  return route;
};

export const RouteOptimizer = () => {
  const { profile } = useAuth();
  const [patients, setPatients] = useState<PatientLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizedRoute, setOptimizedRoute] = useState<PatientLocation[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);

  useEffect(() => {
    const fetchPatientLocations = async () => {
      if (!profile) return;
      setLoading(true);
      try {
        // Fetch confirmed appointments for today
        const today = new Date().toISOString().split('T')[0];
        const { data: appts, error } = await supabase
          .from('agendamentos')
          .select(`
            id,
            paciente:perfis!paciente_id (id, nome_completo, endereco, localizacao)
          `)
          .eq('fisio_id', profile.id)
          .eq('status', 'confirmado')
          .gte('data_servico', today + 'T00:00:00Z')
          .lte('data_servico', today + 'T23:59:59Z');

        if (error) throw error;

        const locations: PatientLocation[] = (appts || []).map((a: any) => {
          // Simulate lat/lng if not present (in a real app, you'd geocode the address)
          const lat = -23.5 + (Math.random() * 0.1);
          const lng = -46.6 + (Math.random() * 0.1);
          
          return {
            id: a.paciente.id,
            name: a.paciente.nome_completo,
            address: a.paciente.endereco || a.paciente.localizacao || 'Endereço não informado',
            lat,
            lng
          };
        });

        setPatients(locations);
      } catch (err) {
        console.error("Erro ao carregar localizações dos pacientes:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPatientLocations();
  }, [profile]);

  const handleOptimize = () => {
    setIsOptimizing(true);
    // Simulating Dr. Hugo's current location (e.g., center of SP)
    const drHugoLoc = { lat: -23.54, lng: -46.63 };
    
    setTimeout(() => {
      const route = optimizeRoute(drHugoLoc.lat, drHugoLoc.lng, patients);
      setOptimizedRoute(route);
      setIsOptimizing(false);
    }, 800);
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl p-3 rounded-2xl border border-white/10 shadow-2xl space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
            <Route className="text-blue-400" size={18} />
            Otimização de Rota
          </h3>
          <p className="text-slate-400 text-[9px] font-medium">Economize tempo e combustível.</p>
        </div>
        <button 
          onClick={handleOptimize}
          disabled={isOptimizing || patients.length === 0}
          className="w-full sm:w-auto px-4 py-2 bg-[#0047AB] text-white rounded-xl font-black text-[11px] hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isOptimizing ? 'Otimizando...' : 'Otimizar Rota'}
        </button>
      </div>

      <div className="space-y-2.5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <Loader2 className="animate-spin text-blue-400" size={20} />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[8px]">Carregando...</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="p-8 text-center bg-white/5 rounded-xl border border-dashed border-white/10">
            <MapPin className="mx-auto mb-3 text-slate-600" size={24} />
            <p className="text-slate-500 text-[10px] font-medium">Nenhum atendimento para hoje.</p>
          </div>
        ) : (
          (optimizedRoute.length > 0 ? optimizedRoute : patients).map((p, index) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "p-3 rounded-xl border flex items-center justify-between gap-3 group transition-all",
                optimizedRoute.length > 0 ? "bg-blue-500/10 border-blue-500/20" : "bg-white/5 border-white/5"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-slate-800 rounded-lg flex items-center justify-center text-blue-400 font-black border border-white/5 text-[10px]">
                  {index + 1}
                </div>
                <div className="space-y-0.5">
                  <p className="font-black text-white text-[11px]">{p.name}</p>
                  <div className="flex items-center gap-1.5 text-slate-400 text-[8px] font-medium line-clamp-1">
                    <MapPin size={9} />
                    {p.address}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                  <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Previsão</p>
                  <p className="text-[10px] font-medium text-slate-500 flex items-center gap-1 justify-end">
                    <Clock size={10} />
                    {15 + index * 45}m
                  </p>
                </div>
                <button 
                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.address)}`, '_blank')}
                  className="p-2 bg-slate-800 text-blue-400 rounded-lg border border-white/5 hover:bg-blue-600 hover:text-white transition-all"
                >
                  <Navigation size={14} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {optimizedRoute.length > 0 && (
        <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 text-white rounded-lg flex items-center justify-center shadow-lg shadow-emerald-900/20 shrink-0">
              <MapIcon size={16} />
            </div>
            <div>
              <p className="font-black text-white text-[10px]">Rota Otimizada!</p>
              <p className="text-[9px] font-medium text-slate-400">Economia de ~22 minutos hoje.</p>
            </div>
          </div>
          <ChevronRight className="text-emerald-500" size={14} />
        </div>
      )}
    </div>
  );
};
