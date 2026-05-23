import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  Route,
  ShieldCheck
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

interface RouteStop extends RoutePatient {
  lat: number;
  lng: number;
}

interface RouteSummary {
  distanceKm: number;
  durationMinutes: number;
}

type LatLngTuple = [number, number];

declare global {
  interface Window {
    L?: any;
    __fisioCareHubLeafletPromise?: Promise<any>;
  }
}

const ROUTE_STATUSES = ['confirmado', 'pago', 'agendado'];
const ORS_API_KEY = String(import.meta.env.VITE_OPENROUTESERVICE_API_KEY || '').trim();
const LEAFLET_CSS_ID = 'fisio-leaflet-css';
const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

const toLocalDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayDateValue = () => toLocalDateInputValue(new Date());

const getTomorrowDateValue = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toLocalDateInputValue(date);
};

const addDaysToDateValue = (value: string, days: number) => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  date.setDate(date.getDate() + days);
  return toLocalDateInputValue(date);
};

const getAppointmentDateValue = (appointment: any) => {
  // Prioriza a coluna `data`, porque ela representa o dia escolhido pelo usuário.
  // Evita o bug de fuso horário em que um atendimento de 25/05 aparece também em 24/05
  // quando `data_servico` vem em UTC.
  const rawDate = String(appointment?.data || '').trim();
  const rawDateMatch = rawDate.match(/^(\d{4}-\d{2}-\d{2})/);
  if (rawDateMatch?.[1]) return rawDateMatch[1];

  const rawServiceDate = String(appointment?.data_servico || '').trim();
  if (rawServiceDate) {
    const serviceDate = new Date(rawServiceDate);
    if (!Number.isNaN(serviceDate.getTime())) return toLocalDateInputValue(serviceDate);
  }

  return '';
};

const getDateRangeFromValue = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  const start = new Date(year, (month || 1) - 1, day || 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const formatSelectedDateLabel = (value: string) => {
  const today = getTodayDateValue();
  const tomorrow = getTomorrowDateValue();

  if (value === today) return 'Hoje';
  if (value === tomorrow) return 'Amanhã';

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  if (Number.isNaN(date.getTime())) return 'Data selecionada';

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short'
  });
};

const formatAppointmentTime = (appointment: any) => {
  if (appointment?.hora) return String(appointment.hora).slice(0, 5);

  const source = appointment?.data_servico || appointment?.data;
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

const openStreetMapSearchUrl = (address: string) =>
  `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`;

const openStreetMapRouteUrl = (stops: RouteStop[]) => {
  if (stops.length === 0) return '';
  if (stops.length === 1) return `https://www.openstreetmap.org/?mlat=${stops[0].lat}&mlon=${stops[0].lng}#map=16/${stops[0].lat}/${stops[0].lng}`;

  const route = stops.map((stop) => `${stop.lat},${stop.lng}`).join(';');
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${route}`;
};

const loadLeaflet = () => {
  if (typeof window === 'undefined') return Promise.reject(new Error('Leaflet só pode carregar no navegador.'));
  if (window.L) return Promise.resolve(window.L);

  if (!document.getElementById(LEAFLET_CSS_ID)) {
    const link = document.createElement('link');
    link.id = LEAFLET_CSS_ID;
    link.rel = 'stylesheet';
    link.href = LEAFLET_CSS_URL;
    document.head.appendChild(link);
  }

  if (!window.__fisioCareHubLeafletPromise) {
    window.__fisioCareHubLeafletPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = LEAFLET_JS_URL;
      script.async = true;
      script.onload = () => resolve(window.L);
      script.onerror = () => reject(new Error('Não foi possível carregar o Leaflet.'));
      document.body.appendChild(script);
    });
  }

  return window.__fisioCareHubLeafletPromise;
};

const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
  if (!ORS_API_KEY || !address) return null;

  const params = new URLSearchParams({
    api_key: ORS_API_KEY,
    text: address,
    'boundary.country': 'BR',
    size: '1'
  });

  const response = await fetch(`https://api.openrouteservice.org/geocode/search?${params.toString()}`);
  if (!response.ok) throw new Error('OpenRouteService não conseguiu localizar um endereço.');

  const payload = await response.json();
  const coordinates = payload?.features?.[0]?.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

  return { lng: Number(coordinates[0]), lat: Number(coordinates[1]) };
};

const fetchRouteGeometry = async (stops: RouteStop[]) => {
  if (!ORS_API_KEY || stops.length < 2) return { geometry: [] as LatLngTuple[], summary: null as RouteSummary | null };

  const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
    method: 'POST',
    headers: {
      Authorization: ORS_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      coordinates: stops.map((stop) => [stop.lng, stop.lat])
    })
  });

  if (!response.ok) throw new Error('OpenRouteService não conseguiu calcular a rota.');

  const payload = await response.json();
  const feature = payload?.features?.[0];
  const coordinates = feature?.geometry?.coordinates || [];
  const summary = feature?.properties?.summary;

  return {
    geometry: coordinates.map(([lng, lat]: number[]) => [lat, lng] as LatLngTuple),
    summary: summary
      ? {
          distanceKm: Number(summary.distance || 0) / 1000,
          durationMinutes: Number(summary.duration || 0) / 60
        }
      : null
  };
};

const OpenStreetRouteMap = ({
  stops,
  routeGeometry
}: {
  stops: RouteStop[];
  routeGeometry: LatLngTuple[];
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    const renderMap = async () => {
      if (!containerRef.current || stops.length === 0) return;

      const L = await loadLeaflet();
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, {
          zoomControl: true,
          attributionControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(mapRef.current);
      }

      if (layerRef.current) {
        layerRef.current.remove();
      }

      const layerGroup = L.layerGroup().addTo(mapRef.current);
      layerRef.current = layerGroup;

      stops.forEach((stop, index) => {
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:30px;height:30px;border-radius:999px;background:#2563eb;color:white;display:flex;align-items:center;justify-content:center;font-weight:900;border:2px solid rgba(255,255,255,.9);box-shadow:0 8px 18px rgba(37,99,235,.35);font-size:12px;">${index + 1}</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        L.marker([stop.lat, stop.lng], { icon })
          .bindPopup(`<strong>${stop.name}</strong><br/>${stop.time}<br/>${stop.address}`)
          .addTo(layerGroup);
      });

      if (routeGeometry.length > 1) {
        L.polyline(routeGeometry, {
          weight: 5,
          opacity: 0.9,
          color: '#3b82f6'
        }).addTo(layerGroup);
      }

      const boundsPoints = routeGeometry.length > 1 ? routeGeometry : stops.map((stop) => [stop.lat, stop.lng]);
      const bounds = L.latLngBounds(boundsPoints);
      mapRef.current.fitBounds(bounds, { padding: [28, 28], maxZoom: stops.length === 1 ? 16 : 14 });
      setTimeout(() => mapRef.current?.invalidateSize(), 120);
    };

    renderMap().catch((error) => console.error('Erro ao renderizar mapa OSM:', error));

    return () => {
      cancelled = true;
    };
  }, [routeGeometry, stops]);

  return <div ref={containerRef} className="h-64 w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950 sm:h-80" />;
};

export const RouteOptimizer = () => {
  const { profile } = useAuth();
  const [patients, setPatients] = useState<RoutePatient[]>([]);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [routeGeometry, setRouteGeometry] = useState<LatLngTuple[]>([]);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [routeLoading, setRouteLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => getTodayDateValue());
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [routeErrorMessage, setRouteErrorMessage] = useState('');
  const [routeOpened, setRouteOpened] = useState(false);

  const patientsWithAddress = useMemo(
    () => patients.filter((patient) => patient.hasAddress),
    [patients]
  );

  const selectedDateLabel = useMemo(() => formatSelectedDateLabel(selectedDate), [selectedDate]);
  const todayDateValue = useMemo(() => getTodayDateValue(), []);
  const tomorrowDateValue = useMemo(() => getTomorrowDateValue(), []);

  useEffect(() => {
    const fetchRouteByDate = async () => {
      if (!profile?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage('');
      setRouteOpened(false);

      try {
        const { start, end } = getDateRangeFromValue(selectedDate);
        const nextDateValue = addDaysToDateValue(selectedDate, 1);

        // Atenção: a tabela agendamentos não possui a coluna data_hora.
        // Mantemos somente as colunas reais usadas no FisioCareHub.
        const appointmentColumns = 'id, paciente_id, data, hora, data_servico, status, tipo, servico';

        const { data: byServiceDate, error: serviceDateError } = await supabase
          .from('agendamentos')
          .select(appointmentColumns)
          .eq('fisio_id', profile.id)
          .in('status', ROUTE_STATUSES)
          .gte('data_servico', start.toISOString())
          .lt('data_servico', new Date(end.getTime() + 1).toISOString())
          .order('data_servico', { ascending: true });

        if (serviceDateError) throw serviceDateError;

        const { data: byDateColumn, error: dateColumnError } = await supabase
          .from('agendamentos')
          .select(appointmentColumns)
          .eq('fisio_id', profile.id)
          .in('status', ROUTE_STATUSES)
          .gte('data', selectedDate)
          .lt('data', nextDateValue)
          .order('hora', { ascending: true });

        if (dateColumnError) {
          console.warn('Não foi possível consultar agendamentos pela coluna data:', dateColumnError);
        }

        const appointmentMap = new Map<string, any>();
        [...(byServiceDate || []), ...(byDateColumn || [])].forEach((appointment: any) => {
          appointmentMap.set(String(appointment.id), appointment);
        });

        const appointments = Array.from(appointmentMap.values())
          .filter((appointment: any) => getAppointmentDateValue(appointment) === selectedDate)
          .sort((a, b) => getAppointmentTimestamp(a) - getAppointmentTimestamp(b));

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
            .select('id, nome_completo, email, telefone, endereco, cidade, estado, cep, avatar_url, foto_url')
            .in('id', patientIds),
          supabase
            .from('pacientes')
            .select('id, nome_completo, email, telefone, endereco, cidade, estado, cep, foto_url')
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
        console.error('Erro ao carregar rota da data selecionada:', err);
        setErrorMessage(err?.message || 'Não foi possível carregar os atendimentos da data selecionada.');
        setPatients([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRouteByDate();
  }, [profile?.id, selectedDate]);

  useEffect(() => {
    let cancelled = false;

    const prepareOpenStreetRoute = async () => {
      setRouteStops([]);
      setRouteGeometry([]);
      setRouteSummary(null);
      setRouteErrorMessage('');

      if (patientsWithAddress.length === 0 || !ORS_API_KEY) return;

      setRouteLoading(true);

      try {
        const geocodedStops: RouteStop[] = [];

        for (const patient of patientsWithAddress) {
          const coordinates = await geocodeAddress(patient.address);
          if (cancelled) return;

          if (coordinates) {
            geocodedStops.push({ ...patient, ...coordinates });
          }
        }

        if (geocodedStops.length === 0) {
          setRouteErrorMessage('Não consegui localizar os endereços informados. Revise rua, número, cidade e estado.');
          return;
        }

        const route = await fetchRouteGeometry(geocodedStops);
        if (cancelled) return;

        setRouteStops(geocodedStops);
        setRouteGeometry(route.geometry);
        setRouteSummary(route.summary);
      } catch (err: any) {
        console.error('Erro ao montar rota com OpenRouteService:', err);
        if (!cancelled) {
          setRouteErrorMessage(err?.message || 'Não foi possível calcular a rota pelo OpenRouteService.');
        }
      } finally {
        if (!cancelled) setRouteLoading(false);
      }
    };

    prepareOpenStreetRoute();

    return () => {
      cancelled = true;
    };
  }, [patientsWithAddress]);

  const openFullRoute = () => {
    const url = routeStops.length > 0
      ? openStreetMapRouteUrl(routeStops)
      : patientsWithAddress.length > 0
        ? openStreetMapSearchUrl(patientsWithAddress[0].address)
        : '';

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
            OpenStreetMap + Leaflet + OpenRouteService para atendimentos domiciliares.
          </p>
        </div>

        <button
          onClick={openFullRoute}
          disabled={loading || patientsWithAddress.length === 0}
          className="w-full sm:w-auto px-4 py-2 bg-[#0047AB] text-white rounded-xl font-black text-[11px] hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading || routeLoading ? <Loader2 className="animate-spin" size={14} /> : <Navigation size={14} />}
          Abrir rota no OSM
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => {
            setSelectedDate(todayDateValue);
            setShowCustomDate(false);
          }}
          className={`rounded-xl border px-3 py-2 text-[10px] font-black transition-all ${
            selectedDate === todayDateValue
              ? 'border-blue-400 bg-blue-500/20 text-white shadow-lg shadow-blue-950/20'
              : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
          }`}
        >
          Hoje
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedDate(tomorrowDateValue);
            setShowCustomDate(false);
          }}
          className={`rounded-xl border px-3 py-2 text-[10px] font-black transition-all ${
            selectedDate === tomorrowDateValue
              ? 'border-blue-400 bg-blue-500/20 text-white shadow-lg shadow-blue-950/20'
              : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
          }`}
        >
          Amanhã
        </button>
        <button
          type="button"
          onClick={() => setShowCustomDate((current) => !current)}
          className={`rounded-xl border px-3 py-2 text-[10px] font-black transition-all ${
            showCustomDate && selectedDate !== todayDateValue && selectedDate !== tomorrowDateValue
              ? 'border-blue-400 bg-blue-500/20 text-white shadow-lg shadow-blue-950/20'
              : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
          }`}
        >
          Escolher data
        </button>
      </div>

      {showCustomDate && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-2">
          <label className="mb-1 block text-[8px] font-black uppercase tracking-widest text-slate-500">
            Data da rota
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value || getTodayDateValue())}
            className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-[11px] font-bold text-white outline-none focus:border-blue-400"
          />
        </div>
      )}

      {patients.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">{selectedDateLabel}</p>
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
            <p className="text-slate-400 text-[10px] font-bold">Nenhum atendimento para {selectedDateLabel.toLowerCase()}.</p>
            <p className="text-slate-500 text-[9px] mt-1">
              O mapa OSM já está integrado. Quando houver atendimento agendado, confirmado ou pago, a rota aparecerá aqui.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
              {!ORS_API_KEY ? (
                <div className="p-5 text-center bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                  <ShieldCheck className="mx-auto mb-3 text-blue-300" size={24} />
                  <p className="text-white text-[11px] font-black">Mapa OpenStreetMap pronto para ativar</p>
                  <p className="text-slate-300 text-[9px] mt-1 leading-relaxed">
                    Adicione <span className="font-black text-blue-200">VITE_OPENROUTESERVICE_API_KEY</span> na Vercel para geocodificar endereços, mostrar marcadores, distância e tempo estimado.
                  </p>
                </div>
              ) : routeLoading ? (
                <div className="h-64 flex flex-col items-center justify-center gap-3 bg-slate-950 rounded-2xl border border-white/10">
                  <Loader2 className="animate-spin text-blue-400" size={22} />
                  <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">Calculando rota OSM...</p>
                </div>
              ) : routeStops.length > 0 ? (
                <OpenStreetRouteMap stops={routeStops} routeGeometry={routeGeometry} />
              ) : (
                <div className="p-5 text-center bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                  <AlertCircle className="mx-auto mb-3 text-amber-300" size={24} />
                  <p className="text-white text-[11px] font-black">Endereços ainda não localizados</p>
                  <p className="text-slate-300 text-[9px] mt-1 leading-relaxed">
                    {routeErrorMessage || 'Revise se os pacientes têm rua, número, cidade, estado e CEP cadastrados.'}
                  </p>
                </div>
              )}
            </div>

            {routeSummary && (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 px-3 py-2">
                  <p className="text-[8px] font-black uppercase tracking-widest text-blue-200">Distância</p>
                  <p className="text-sm font-black text-white">{routeSummary.distanceKm.toFixed(1)} km</p>
                </div>
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                  <p className="text-[8px] font-black uppercase tracking-widest text-emerald-200">Tempo estimado</p>
                  <p className="text-sm font-black text-white">{Math.round(routeSummary.durationMinutes)} min</p>
                </div>
              </div>
            )}

            {patients.map((patient, index) => (
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
                  onClick={() => patient.hasAddress && window.open(openStreetMapSearchUrl(patient.address), '_blank', 'noopener,noreferrer')}
                  disabled={!patient.hasAddress}
                  className="p-2 bg-slate-800 text-blue-400 rounded-lg border border-white/5 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  title={patient.hasAddress ? 'Abrir endereço no OpenStreetMap' : 'Endereço não informado'}
                >
                  <ExternalLink size={14} />
                </button>
              </motion.div>
            ))}
          </>
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
                {routeOpened ? 'Rota enviada para o OpenStreetMap' : 'Rota pronta por ordem de horário'}
              </p>
              <p className="text-[9px] font-medium text-slate-400">
                {patientsWithAddress.length === 0
                  ? 'Cadastre o endereço dos pacientes para liberar o mapa.'
                  : ORS_API_KEY
                    ? 'OpenRouteService calcula distância e tempo estimado usando dados do OpenStreetMap.'
                    : 'Adicione a chave do OpenRouteService na Vercel para ativar o mapa embutido.'}
              </p>
            </div>
          </div>
          <Navigation className="text-emerald-400 shrink-0" size={14} />
        </div>
      )}
    </div>
  );
};
