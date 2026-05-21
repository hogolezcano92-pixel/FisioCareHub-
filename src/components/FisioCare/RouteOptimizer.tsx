import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  Route
} from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface RoutePatient {
  id: string;
  appointmentId: string;
  name: string;
  address: string;
  time: string;
  status: string;
  service?: string | null;
  hasAddress: boolean;
}

const ROUTE_STATUSES = ['confirmado', 'pago', 'agendado'];

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatAppointmentTime = (appointment: any) => {
  if (appointment?.hora) return String(appointment.hora).slice(0, 5);

  const source = appointment?.data_servico || appointment?.data_hora;
  if (!source) return 'Horário não informado';

  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return 'Horário não informado';

  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getAppointmentTimestamp = (appointment: any) => {
  if (appointment?.data_servico) {
    const time = new Date(appointment.data_servico).getTime();
    if (!Number.isNaN(time)) return time;
  }

  if (appointment?.data && appointment?.hora) {
    const time = new Date(`${appointment.data}T${appointment.hora}`).getTime();
    if (!Number.isNaN(time)) return time;
  }

  if (appointment?.hora) {
    const [hour = '0', minute = '0'] = String(appointment.hora).split(':');
    return Number(hour) * 60 + Number(minute);
  }

  return 0;
};

const normalizeText = (value?: string | null) => String(value || '').trim();

const buildAddress = (patient: any) => {
  const endereco = normalizeText(patient?.endereco);
  const cidade = normalizeText(patient?.cidade);
  const estado = normalizeText(patient?.estado);
  const cep = normalizeText(patient?.cep);
  const localizacao = normalizeText(patient?.localizacao);

  const fullAddress = [endereco, cidade, estado, cep].filter(Boolean).join(', ');
  return fullAddress || localizacao || '';
};

const mapsSearchUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

const mapsRouteUrl = (patients: RoutePatient[]) => {
  const validStops = patients.filter((patient) => patient.hasAddress);
  if (validStops.length === 0) return '';

  if (validStops.length === 1) return mapsSearchUrl(validStops[0].address);

  const destination = validStops[validStops.length - 1];
  const waypoints = validStops.slice(0, -1).map((patient) => patient.address).join('|');

  const params = new URLSearchParams({
    api: '1',
    travelmode: 'driving',
    destination: destination.address
  });

  if (waypoints) params.set('waypoints', waypoints);

  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

export const RouteOptimizer = () => {
  const { profile } = useAuth();
  const [patients, setPatients] = useState<RoutePatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [routeOpened, setRouteOpened] = useState(false);

  const patientsWithAddress = useMemo(
    () => patients.filter((patient) => patient.hasAddress),
    [patients]
  );

  useEffect(() => {
    const fetchTodayRoute = async () => {
      if (!profile?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage('');

      try {
        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setHours(23, 59, 59, 999);

        const todayKey = formatDateKey(start);
        const appointmentColumns = 'id, paciente_id, data, hora, data_hora, data_servico, status, tipo, servico';

        const { data: byServiceDate, error: serviceDateError } = await supabase
          .from('agendamentos')
          .select(appointmentColumns)
          .eq('fisio_id', profile.id)
          .in('status', ROUTE_STATUSES)
          .gte('data_servico', start.toISOString())
          .lte('data_servico', end.toISOString())
          .order('data_servico', { ascending: true });

        if (serviceDateError) throw serviceDateError;

        const { data: byDateColumn, error: dateColumnError } = await supabase
          .from('agendamentos')
          .select(appointmentColumns)
          .eq('fisio_id', profile.id)
          .in('status', ROUTE_STATUSES)
          .eq('data', todayKey)
          .order('hora', { ascending: true });

        if (dateColumnError) {
          console.warn('Não foi possível consultar agendamentos pela coluna data:', dateColumnError);
        }

        const appointmentMap = new Map<string, any>();
        [...(byServiceDate || []), ...(byDateColumn || [])].forEach((appointment: any) => {
          appointmentMap.set(String(appointment.id), appointment);
        });

        const appointments = Array.from(appointmentMap.values()).sort(
          (a, b) => getAppointmentTimestamp(a) - getAppointmentTimestamp(b)
        );

        const patientIds = Array.from(
          new Set(appointments.map((appointment: any) => appointment.paciente_id).filter(Boolean))
        );

        if (patientIds.length === 0) {
          setPatients([]);
          return;
        }

        const [profilesResult, internalPatientsResult] = await Promise.all([
          supabase
            .from('perfis')
            .select('id, nome_completo, email, telefone, endereco, cidade, estado, cep, localizacao, avatar_url')
            .in('id', patientIds),
          supabase
            .from('pacientes')
            .select('id, nome, email, telefone, endereco, foto_url')
            .in('id', patientIds)
        ]);

        if (profilesResult.error) {
          console.warn('Não foi possível buscar pacientes com conta em perfis:', profilesResult.error);
        }

        if (internalPatientsResult.error) {
          console.warn('Não foi possível buscar pacientes internos:', internalPatientsResult.error);
        }

        const profilesById = new Map(
          (profilesResult.data || []).map((patient: any) => [String(patient.id), patient])
        );
        const internalPatientsById = new Map(
          (internalPatientsResult.data || []).map((patient: any) => [String(patient.id), patient])
        );

        const routePatients: RoutePatient[] = appointments.map((appointment: any) => {
          const patientId = String(appointment.paciente_id || '');
          const profilePatient = profilesById.get(patientId);
          const internalPatient = internalPatientsById.get(patientId);
          const patient = profilePatient || internalPatient || null;
          const address = buildAddress(patient);

          return {
            id: patientId,
            appointmentId: String(appointment.id),
            name:
              normalizeText(patient?.nome_completo) ||
              normalizeText(patient?.nome) ||
              normalizeText(patient?.email) ||
              'Paciente sem nome',
            address: address || 'Endereço não informado',
            time: formatAppointmentTime(appointment),
            status: String(appointment.status || 'agendado'),
            service: appointment.servico || appointment.tipo || null,
            hasAddress: Boolean(address)
          };
        });

        setPatients(routePatients);
      } catch (err: any) {
        console.error('Erro ao carregar rota do dia:', err);
        setErrorMessage(err?.message || 'Não foi possível carregar os atendimentos de hoje.');
        setPatients([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTodayRoute();
  }, [profile?.id]);

  const openFullRoute = () => {
    const url = mapsRouteUrl(patients);
    if (!url) return;
    setRouteOpened(true);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl p-3 rounded-2xl border border-white/10 shadow-2xl space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
            <Route className="text-blue-400" size={18} />
            Organização de Rota
          </h3>
          <p className="text-slate-400 text-[9px] font-medium">
            Monte a rota dos atendimentos domiciliares de hoje.
          </p>
        </div>

        <button
          onClick={openFullRoute}
          disabled={loading || patientsWithAddress.length === 0}
          className="w-full sm:w-auto px-4 py-2 bg-[#0047AB] text-white rounded-xl font-black text-[11px] hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="animate-spin" size={14} /> : <Navigation size={14} />}
          Abrir rota no Maps
        </button>
      </div>

      {patients.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Hoje</p>
            <p className="text-sm font-black text-white flex items-center gap-1.5">
              <CalendarDays size={13} className="text-blue-400" />
              {patients.length} atendimento{patients.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Com endereço</p>
            <p className="text-sm font-black text-white flex items-center gap-1.5">
              <MapPin size={13} className="text-emerald-400" />
              {patientsWithAddress.length} parada{patientsWithAddress.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <Loader2 className="animate-spin text-blue-400" size={20} />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[8px]">Carregando rota...</p>
          </div>
        ) : errorMessage ? (
          <div className="p-5 text-center bg-rose-500/10 rounded-xl border border-rose-500/20">
            <AlertCircle className="mx-auto mb-3 text-rose-300" size={24} />
            <p className="text-rose-100 text-[10px] font-bold">Erro ao carregar a rota.</p>
            <p className="text-rose-200/70 text-[9px] mt-1">{errorMessage}</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="p-8 text-center bg-white/5 rounded-xl border border-dashed border-white/10">
            <MapPin className="mx-auto mb-3 text-slate-600" size={24} />
            <p className="text-slate-400 text-[10px] font-bold">Nenhum atendimento confirmado para hoje.</p>
            <p className="text-slate-500 text-[9px] mt-1">
              Quando houver atendimento agendado, confirmado ou pago, a rota aparecerá aqui.
            </p>
          </div>
        ) : (
          patients.map((patient, index) => (
            <motion.div
              key={`${patient.appointmentId}-${patient.id}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 group transition-all ${
                patient.hasAddress
                  ? 'bg-blue-500/10 border-blue-500/20'
                  : 'bg-amber-500/10 border-amber-500/20'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-blue-300 font-black border border-white/5 text-[10px] shrink-0">
                  {index + 1}
                </div>

                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="font-black text-white text-[11px] truncate">{patient.name}</p>
                    <span className="text-[7px] uppercase tracking-widest font-black px-1.5 py-0.5 rounded-full bg-white/10 text-slate-300 shrink-0">
                      {patient.status}
                    </span>
                  </div>

                  <p className="text-slate-300 text-[9px] font-bold flex items-center gap-1.5">
                    <Clock size={10} className="text-blue-300" />
                    {patient.time}
                    {patient.service ? <span className="text-slate-500">• {patient.service}</span> : null}
                  </p>

                  <div className="flex items-center gap-1.5 text-slate-400 text-[8px] font-medium line-clamp-1">
                    <MapPin size={9} className={patient.hasAddress ? 'text-emerald-400' : 'text-amber-300'} />
                    {patient.address}
                  </div>
                </div>
              </div>

              <button
                onClick={() => patient.hasAddress && window.open(mapsSearchUrl(patient.address), '_blank', 'noopener,noreferrer')}
                disabled={!patient.hasAddress}
                className="p-2 bg-slate-800 text-blue-400 rounded-lg border border-white/5 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                title={patient.hasAddress ? 'Abrir endereço no Maps' : 'Endereço não informado'}
              >
                <ExternalLink size={14} />
              </button>
            </motion.div>
          ))
        )}
      </div>

      {patients.length > 0 && (
        <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-emerald-500 text-white rounded-lg flex items-center justify-center shadow-lg shadow-emerald-900/20 shrink-0">
              <CheckCircle2 size={16} />
            </div>
            <div className="min-w-0">
              <p className="font-black text-white text-[10px]">
                {routeOpened ? 'Rota enviada para o Maps' : 'Rota pronta por ordem de horário'}
              </p>
              <p className="text-[9px] font-medium text-slate-400">
                {patientsWithAddress.length === 0
                  ? 'Cadastre o endereço dos pacientes para liberar o mapa.'
                  : 'O Google Maps ajusta o melhor caminho entre as paradas.'}
              </p>
            </div>
          </div>
          <Navigation className="text-emerald-400 shrink-0" size={14} />
        </div>
      )}
    </div>
  );
};
