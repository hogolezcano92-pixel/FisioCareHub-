import React, { useState } from 'react';
import { MapPin, Navigation, Route, Clock, ChevronRight, Map as MapIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

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
  const [patients, setPatients] = useState<PatientLocation[]>([
    { id: '1', name: 'Dona Maria Silva', address: 'Rua das Flores, 123', lat: -23.5505, lng: -46.6333 },
    { id: '2', name: 'Sr. João Pereira', address: 'Av. Paulista, 1000', lat: -23.5614, lng: -46.6559 },
    { id: '3', name: 'Dona Alzira Costa', address: 'Rua Augusta, 500', lat: -23.5489, lng: -46.6444 },
  ]);

  const [optimizedRoute, setOptimizedRoute] = useState<PatientLocation[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);

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
    <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Route className="text-blue-600" size={32} />
            Otimização de Logística
          </h3>
          <p className="text-slate-500 font-medium">Economize tempo e combustível com a rota mais eficiente.</p>
        </div>
        <button 
          onClick={handleOptimize}
          disabled={isOptimizing}
          className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2"
        >
          {isOptimizing ? 'Otimizando...' : 'Otimizar Rota'}
        </button>
      </div>

      <div className="space-y-4">
        {(optimizedRoute.length > 0 ? optimizedRoute : patients).map((p, index) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "p-5 rounded-[2rem] border flex items-center justify-between gap-4 group transition-all",
              optimizedRoute.length > 0 ? "bg-blue-50 border-blue-100" : "bg-slate-50 border-slate-100"
            )}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 font-black shadow-sm border border-slate-100">
                {index + 1}
              </div>
              <div className="space-y-1">
                <p className="font-black text-slate-900">{p.name}</p>
                <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                  <MapPin size={14} />
                  {p.address}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Previsão</p>
                <p className="text-sm font-medium text-slate-500 flex items-center gap-1 justify-end">
                  <Clock size={14} />
                  {15 + index * 45} min
                </p>
              </div>
              <button className="p-3 bg-white text-blue-600 rounded-2xl shadow-sm border border-slate-100 hover:bg-blue-600 hover:text-white transition-all">
                <Navigation size={20} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {optimizedRoute.length > 0 && (
        <div className="p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100">
              <MapIcon size={24} />
            </div>
            <div>
              <p className="font-black text-emerald-900">Rota Otimizada!</p>
              <p className="text-sm font-medium text-emerald-700">Você economizará aproximadamente 22 minutos hoje.</p>
            </div>
          </div>
          <ChevronRight className="text-emerald-400" />
        </div>
      )}
    </div>
  );
};
