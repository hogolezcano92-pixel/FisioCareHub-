import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Activity, ArrowLeft, Brain, CheckCircle2, ClipboardList, FileDown, HeartPulse,
  Loader2, Plus, Save, Search, ShieldCheck, Stethoscope, Trash2, UserRound,
  Bone, Baby, Dumbbell, Home, Wind, Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import ProGuard from '../components/ProGuard';
import { generateIntegrityHash } from '../lib/security';

type EvaluationType =
  | 'geriatrica' | 'neurologica' | 'ortopedica' | 'cardiorrespiratoria'
  | 'esportiva' | 'pediatrica' | 'funcional' | 'domiciliar' | 'personalizada';

type Patient = {
  id: string;
  nome_completo: string;
  data_nascimento?: string | null;
  telefone?: string | null;
  email?: string | null;
  diagnostico?: string | null;
};

type CifItem = {
  code: string;
  description: string;
  category: 'funcoes' | 'estruturas' | 'atividade_participacao' | 'ambiental';
  qualifier: string;
  observation: string;
};

type TestItem = {
  name: string;
  result: string;
  unit: string;
  interpretation: string;
};

const TYPES: Array<{
  id: EvaluationType;
  title: string;
  description: string;
  icon: any;
  color: string;
}> = [
  { id: 'geriatrica', title: 'Avaliação Geriátrica', description: 'Funcionalidade, equilíbrio, marcha, força e risco de quedas.', icon: UserRound, color: 'emerald' },
  { id: 'neurologica', title: 'Avaliação Neurológica', description: 'Funções motoras, sensibilidade, coordenação, tônus e marcha.', icon: Brain, color: 'violet' },
  { id: 'ortopedica', title: 'Avaliação Ortopédica', description: 'Dor, ADM, força, função musculoesquelética e testes especiais.', icon: Bone, color: 'sky' },
  { id: 'cardiorrespiratoria', title: 'Cardiorrespiratória', description: 'Sinais vitais, respiração, tolerância ao esforço e capacidade funcional.', icon: Wind, color: 'cyan' },
  { id: 'esportiva', title: 'Avaliação Esportiva', description: 'Desempenho funcional, mobilidade, força e retorno ao esporte.', icon: Dumbbell, color: 'orange' },
  { id: 'pediatrica', title: 'Avaliação Pediátrica', description: 'Desenvolvimento motor, coordenação e funcionalidade.', icon: Baby, color: 'pink' },
  { id: 'funcional', title: 'Reabilitação Funcional', description: 'Independência, transferências, marcha e atividades de vida diária.', icon: Activity, color: 'blue' },
  { id: 'domiciliar', title: 'Avaliação Domiciliar', description: 'Paciente, funcionalidade, ambiente e segurança no domicílio.', icon: Home, color: 'indigo' },
  { id: 'personalizada', title: 'Avaliação Personalizada', description: 'Monte uma ficha flexível para uma necessidade clínica específica.', icon: ClipboardList, color: 'slate' },
];

const CIF_SUGGESTIONS = [
  { code: 'b280', description: 'Sensação de dor', category: 'funcoes' as const },
  { code: 'b730', description: 'Funções de força muscular', category: 'funcoes' as const },
  { code: 'b735', description: 'Funções do tônus muscular', category: 'funcoes' as const },
  { code: 'b760', description: 'Funções de controle do movimento voluntário', category: 'funcoes' as const },
  { code: 'b770', description: 'Funções do padrão da marcha', category: 'funcoes' as const },
  { code: 'd410', description: 'Mudar a posição básica do corpo', category: 'atividade_participacao' as const },
  { code: 'd415', description: 'Manter a posição do corpo', category: 'atividade_participacao' as const },
  { code: 'd450', description: 'Andar', category: 'atividade_participacao' as const },
  { code: 'd455', description: 'Deslocar-se', category: 'atividade_participacao' as const },
  { code: 'd540', description: 'Vestir-se', category: 'atividade_participacao' as const },
  { code: 'e115', description: 'Produtos e tecnologia para uso pessoal na vida diária', category: 'ambiental' as const },
  { code: 'e120', description: 'Produtos e tecnologia para mobilidade e transporte', category: 'ambiental' as const },
];

const INITIAL = {
  queixa_principal: '', historia_doenca_atual: '', historico_medico: '', medicamentos: '',
  antecedentes_familiares: '', habitos_vida: '', profissao: '', objetivo_paciente: '',
  nivel_funcional: '', independencia_funcional: '', marcha: '', postura: '', inspecao: '',
  palpacao: '', amplitude_movimento: '', forca_muscular: '', sensibilidade: '', tonus: '',
  coordenacao: '', equilibrio: '', transferencias: '', localizacao_dor: '', inicio_dor: '',
  fatores_agravantes: '', fatores_alivio: '', tipo_dor: '', diagnostico_clinico: '',
  diagnostico_fisio: '', objetivos_terapeuticos: '', prognostico: '', conduta: '',
  frequencia_sessoes: '', observacoes_finais: '', temperatura: '', pressao_arterial: '',
  frequencia_cardiaca: '', frequencia_respiratoria: '', spo2: '', peso: '', altura: '',
};

function ageFromDate(date?: string | null) {
  if (!date) return '';
  const d = new Date(date + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return String(age);
}

function Section({ title, children, icon: Icon = ClipboardList }: any) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-900/60 backdrop-blur-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400"><Icon size={18} /></div>
        <h2 className="text-sm font-black text-white uppercase tracking-widest">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function Field({ label, value, onChange, placeholder = '', type = 'text', min, max }: any) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      {type === 'textarea' ? (
        <textarea value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full min-h-24 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/10 resize-y" />
      ) : (
        <input type={type} min={min} max={max} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-slate-600 outline-none focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/10" />
      )}
    </label>
  );
}

export default function PhysioEvaluationWorkspace() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const pacienteIdParam = searchParams.get('pacienteId');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [type, setType] = useState<EvaluationType | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState(pacienteIdParam || '');
  const [patientSearch, setPatientSearch] = useState('');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [form, setForm] = useState<any>(INITIAL);
  const [cif, setCif] = useState<CifItem[]>([]);
  const [tests, setTests] = useState<TestItem[]>([]);
  const [specific, setSpecific] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(id || '');
  const [integrityHash, setIntegrityHash] = useState('');
  const [step, setStep] = useState(id ? 2 : 0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase.from('pacientes')
        .select('id,nome_completo,data_nascimento,telefone,email,diagnostico')
        .eq('fisioterapeuta_id', user.id)
        .order('nome_completo');
      if (error) toast.error('Não foi possível carregar seus pacientes.');
      setPatients((data || []) as Patient[]);

      if (id) {
        const { data: ev, error: evError } = await supabase.from('fichas_avaliacao').select('*').eq('id', id).eq('fisioterapeuta_id', user.id).single();
        if (evError) {
          toast.error('Não foi possível carregar a avaliação.');
        } else {
          setType((ev.tipo_avaliacao || 'geral') as EvaluationType);
          setPatientId(ev.paciente_id);
          setForm({ ...INITIAL, ...ev.dados_especificos, ...ev });
          setCif(Array.isArray(ev.cif_itens) ? ev.cif_itens : []);
          setTests(Array.isArray(ev.testes_escalas) ? ev.testes_escalas : []);
          setSpecific(ev.dados_especificos || {});
          setIntegrityHash(ev.integrity_hash || '');
          setStep(2);
        }
      } else if (pacienteIdParam) {
        setStep(1);
      }
      setLoading(false);
    })();
  }, [user, id, pacienteIdParam]);

  useEffect(() => {
    const p = patients.find(x => x.id === patientId) || null;
    setPatient(p);
  }, [patients, patientId]);

  const filteredPatients = useMemo(() => patients.filter(p =>
    p.nome_completo.toLowerCase().includes(patientSearch.toLowerCase()) ||
    (p.email || '').toLowerCase().includes(patientSearch.toLowerCase())
  ).slice(0, 8), [patients, patientSearch]);

  const selectedType = TYPES.find(t => t.id === type);

  const set = (key: string, value: string) => setForm((prev: any) => ({ ...prev, [key]: value }));

  const addCif = (suggestion?: typeof CIF_SUGGESTIONS[number]) => {
    setCif(prev => [...prev, suggestion
      ? { ...suggestion, qualifier: '0', observation: '' }
      : { code: '', description: '', category: 'funcoes', qualifier: '0', observation: '' }]);
  };

  const addTest = () => setTests(prev => [...prev, { name: '', result: '', unit: '', interpretation: '' }]);

  const save = async () => {
    if (!user || !type || !patientId) {
      toast.error('Selecione o tipo de avaliação e o paciente.');
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        fisioterapeuta_id: user.id,
        paciente_id: patientId,
        titulo: selectedType?.title || 'Avaliação Fisioterapêutica',
        tipo_avaliacao: type,
        dados_especificos: { ...specific },
        cif_itens: cif,
        testes_escalas: tests,
        sinais_vitais: {
          temperatura: form.temperatura, pressao_arterial: form.pressao_arterial,
          frequencia_cardiaca: form.frequencia_cardiaca, frequencia_respiratoria: form.frequencia_respiratoria,
          spo2: form.spo2,
        },
        queixa_principal: form.queixa_principal,
        historia_doenca_atual: form.historia_doenca_atual,
        historico_medico: form.historico_medico,
        medicamentos_uso: form.medicamentos,
        medicamentos: form.medicamentos,
        antecedentes_familiares: form.antecedentes_familiares,
        habitos_vida: form.habitos_vida,
        nivel_funcional: form.nivel_funcional,
        independencia_funcional: form.independencia_funcional,
        marcha: form.marcha,
        postura: form.postura,
        inspecao: form.inspecao,
        palpacao: form.palpacao,
        amplitude_movimento: form.amplitude_movimento,
        forca_muscular: form.forca_muscular,
        dor_escala: form.escala_dor ?? 0,
        escala_dor: Number(form.escala_dor || 0),
        testes_especiais: form.testes_especiais || tests.map(t => `${t.name}: ${t.result}`).filter(Boolean).join('\\n'),
        diagnostico_fisio: form.diagnostico_fisio,
        diagnostico_fisioterapeutico: form.diagnostico_fisio,
        objetivos_terapeuticos: form.objetivos_terapeuticos,
        prognostico: form.prognostico,
        conduta: form.conduta,
        frequencia_sessoes: form.frequencia_sessoes,
        observacoes_finais: form.observacoes_finais,
        updated_at: now,
      };
      const contentStr = JSON.stringify({ ...payload, integrityHash: undefined });
      const hash = await generateIntegrityHash(patientId, user.id, now, contentStr);
      if (savedId) {
        const { error } = await supabase.from('fichas_avaliacao').update({ ...payload, integrity_hash: hash }).eq('id', savedId).eq('fisioterapeuta_id', user.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('fichas_avaliacao').insert({ ...payload, data_avaliacao: now, created_at: now, integrity_hash: hash }).select('id').single();
        if (error) throw error;
        setSavedId(data.id);
        navigate(`/physio/evaluation/${data.id}?pacienteId=${patientId}`, { replace: true });
      }
      setIntegrityHash(hash);
      toast.success('Avaliação salva com integridade.');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Erro ao salvar avaliação.');
    } finally {
      setSaving(false);
    }
  };

  const addSpecific = (label: string) => {
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    setSpecific(prev => ({ ...prev, [key]: prev[key] || '' }));
  };

  const specificLabels: Record<EvaluationType, string[]> = {
    geriatrica: ['Histórico de quedas', 'Timed Up and Go', 'Berg/POMA', 'Sentar e levantar', 'Velocidade da marcha', 'Atividades de vida diária'],
    neurologica: ['Lateralidade', 'Reflexos', 'Sensibilidade superficial/profunda', 'Tônus', 'Coordenação', 'Controle motor', 'Marcha neurológica'],
    ortopedica: ['Região anatômica', 'ADM por segmento', 'Força por grupo muscular', 'Testes especiais', 'Edema', 'Medidas antropométricas'],
    cardiorrespiratoria: ['Padrão respiratório', 'Ausculta', 'Dispneia', 'Tolerância ao esforço', 'Teste funcional', 'Oxigenoterapia'],
    esportiva: ['Modalidade', 'Fase da temporada', 'Mecanismo da lesão', 'Desempenho funcional', 'Força e potência', 'Retorno ao esporte'],
    pediatrica: ['Marcos motores', 'Tônus', 'Coordenação', 'Controle postural', 'Mobilidade', 'Participação'],
    funcional: ['Transferências', 'AVDs', 'Mobilidade', 'Equilíbrio', 'Marcha', 'Auxílio/dispositivo'],
    domiciliar: ['Barreiras ambientais', 'Risco de quedas', 'Acessibilidade', 'Cuidador/rede de apoio', 'Segurança no domicílio', 'Necessidades do ambiente'],
    personalizada: ['Campo personalizado'],
  };

  const generatePdf = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const blue: [number, number, number] = [37, 99, 235];
      doc.setFillColor(...blue); doc.rect(0, 0, 210, 26, 'F');
      doc.setTextColor(255,255,255); doc.setFontSize(17); doc.setFont('helvetica','bold');
      doc.text('FisioCareHub', 15, 12);
      doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.text('Avaliação Fisioterapêutica', 15, 19);
      doc.text(new Date().toLocaleDateString('pt-BR'), 195, 15, { align: 'right' });
      let y = 36;
      const rows: [string,string][] = [
        ['Paciente', patient?.nome_completo || ''],
        ['Tipo de avaliação', selectedType?.title || ''],
        ['Data de nascimento', patient?.data_nascimento ? new Date(patient.data_nascimento+'T00:00:00').toLocaleDateString('pt-BR') : ''],
        ['Diagnóstico clínico', form.diagnostico_clinico || patient?.diagnostico || ''],
        ['Fisioterapeuta', user?.user_metadata?.nome_completo || user?.email || ''],
      ];
      autoTable(doc, { startY:y, head:[['IDENTIFICAÇÃO','']], body:rows, theme:'grid', styles:{fontSize:9,cellPadding:3}, headStyles:{fillColor:blue}, columnStyles:{0:{fontStyle:'bold',cellWidth:48}} });
      y=(doc as any).lastAutoTable.finalY+7;
      const sections: Array<[string, [string,string][]]> = [
        ['ANAMNESE', [['Queixa principal',form.queixa_principal],['História da doença atual',form.historia_doenca_atual],['Histórico médico',form.historico_medico],['Medicamentos',form.medicamentos],['Hábitos de vida',form.habitos_vida]]],
        ['DOR', [['Localização',form.localizacao_dor],['Início/duração',form.inicio_dor],['Tipo',form.tipo_dor],['Agravantes',form.fatores_agravantes],['Alívio',form.fatores_alivio],['Escala',String(form.escala_dor ?? 0)+'/10']]],
        ['EXAME FÍSICO', [['Postura',form.postura],['Inspeção',form.inspecao],['Palpação',form.palpacao],['ADM',form.amplitude_movimento],['Força',form.forca_muscular],['Sensibilidade',form.sensibilidade],['Tônus',form.tonus],['Coordenação',form.coordenacao],['Equilíbrio',form.equilibrio],['Marcha',form.marcha]]],
        ['RACIOCÍNIO CLÍNICO', [['Diagnóstico fisioterapêutico',form.diagnostico_fisio],['Objetivos',form.objetivos_terapeuticos],['Prognóstico',form.prognostico],['Conduta',form.conduta],['Frequência',form.frequencia_sessoes]]],
        ['CIF', cif.map(x => [`${x.code} — ${x.description}`, `Categoria: ${x.category}; Qualificador: ${x.qualifier}; ${x.observation}` ] as [string,string]),
      ];
      for (const [title, data] of sections) {
        const usable = data.filter(r => r[1] || r[0] === 'Escala');
        if (!usable.length) continue;
        if (y > 245) { doc.addPage(); y=18; }
        autoTable(doc,{startY:y,head:[[title,'']],body:usable,theme:'striped',styles:{fontSize:8.5,cellPadding:3,overflow:'linebreak'},headStyles:{fillColor:blue},columnStyles:{0:{fontStyle:'bold',cellWidth:52}}});
        y=(doc as any).lastAutoTable.finalY+7;
      }
      if (y > 250) { doc.addPage(); y=18; }
      doc.setFontSize(7); doc.setTextColor(110);
      doc.text('Documento clínico gerado pelo FisioCareHub. Os dados registrados são de responsabilidade do profissional responsável.', 15, 286);
      doc.save(`fisiocarehub-avaliacao-${(patient?.nome_completo||'paciente').replace(/[^a-z0-9]+/gi,'-')}.pdf`);
      toast.success('PDF premium gerado.');
    } catch (e) { console.error(e); toast.error('Não foi possível gerar o PDF.'); }
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-sky-400" size={42}/></div>;

  return (
    <ProGuard>
      <div className="max-w-7xl mx-auto pb-24 space-y-7">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/physio/evaluations')} className="p-3 rounded-2xl bg-white/5 text-slate-400 hover:text-white border border-white/10"><ArrowLeft size={20}/></button>
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] font-black text-sky-400">Prontuário clínico</p>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Avaliação fisioterapêutica</h1>
              <p className="text-slate-400 text-sm mt-1">Ficha estruturada por área, com CIF e PDF profissional.</p>
            </div>
          </div>
          <div className="flex gap-2">
            {savedId && <button onClick={generatePdf} className="px-4 py-3 rounded-2xl border border-white/10 bg-white/5 text-white font-black text-xs flex items-center gap-2"><FileDown size={17}/> PDF premium</button>}
            <button disabled={saving || !!integrityHash} onClick={save} className="px-5 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black text-xs flex items-center gap-2 disabled:opacity-50"><Save size={17}/>{saving?'Salvando...':'Salvar avaliação'}</button>
          </div>
        </header>

        {!type && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-slate-300"><Stethoscope size={20} className="text-sky-400"/><span className="font-black">1. Escolha a área da avaliação</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {TYPES.map(item => { const Icon=item.icon; return <button key={item.id} onClick={() => {setType(item.id);setStep(1)}} className="text-left rounded-[2rem] border border-white/10 bg-slate-900/60 p-6 hover:border-sky-500/40 hover:bg-slate-900 transition-all group">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform"><Icon size={25}/></div>
                <h2 className="text-lg font-black text-white">{item.title}</h2><p className="text-sm text-slate-400 mt-2 leading-relaxed">{item.description}</p>
              </button>})}
            </div>
          </div>
        )}

        {type && step >= 1 && (
          <div className="flex flex-wrap gap-2">
            {['Paciente','Anamnese','Exame físico','Testes','CIF','Plano'].map((x,i)=><button key={x} onClick={()=>setStep(i+1)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${step===i+1?'bg-sky-500 text-white border-sky-400':'bg-white/5 text-slate-400 border-white/10'}`}>{i+1}. {x}</button>)}
          </div>
        )}

        {type && step === 1 && (
          <Section title={`Paciente • ${selectedType?.title}`} icon={UserRound}>
            <div className="space-y-5">
              <div className="relative">
                <Search className="absolute left-4 top-3.5 text-slate-500" size={18}/>
                <input value={patientSearch} onChange={e=>setPatientSearch(e.target.value)} placeholder="Pesquisar paciente..." className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 pl-11 pr-4 text-white outline-none focus:border-sky-500"/>
                {patientSearch && !patientId && <div className="absolute z-30 mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 shadow-2xl overflow-hidden">{filteredPatients.map(p=><button key={p.id} onClick={()=>{setPatientId(p.id);setPatientSearch(p.nome_completo)}} className="w-full text-left px-4 py-3 hover:bg-white/5 text-white text-sm flex justify-between"><span>{p.nome_completo}</span><span className="text-slate-500">{ageFromDate(p.data_nascimento)} anos</span></button>)}</div>}
              </div>
              {patient && <div className="rounded-2xl bg-sky-500/5 border border-sky-500/20 p-5 flex items-center justify-between"><div><p className="text-xs font-black text-sky-400 uppercase tracking-widest">Paciente selecionado</p><h3 className="text-xl font-black text-white mt-1">{patient.nome_completo}</h3><p className="text-sm text-slate-400">{ageFromDate(patient.data_nascimento) ? `${ageFromDate(patient.data_nascimento)} anos` : 'Idade não informada'}{patient.diagnostico ? ` • ${patient.diagnostico}` : ''}</p></div><CheckCircle2 className="text-emerald-400"/></div>}
              <div className="flex justify-end"><button disabled={!patientId} onClick={()=>setStep(2)} className="px-6 py-3 rounded-2xl bg-sky-500 text-white font-black text-sm disabled:opacity-40">Continuar</button></div>
            </div>
          </Section>
        )}

        {type && step === 2 && (
          <div className="space-y-5">
            <Section title="Identificação e anamnese" icon={ClipboardList}>
              <div className="grid md:grid-cols-2 gap-5">
                <Field label="Diagnóstico clínico/médico" value={form.diagnostico_clinico || patient?.diagnostico} onChange={(v:string)=>set('diagnostico_clinico',v)}/>
                <Field label="Profissão" value={form.profissao} onChange={(v:string)=>set('profissao',v)}/>
                <div className="md:col-span-2"><Field label="Queixa principal" value={form.queixa_principal} onChange={(v:string)=>set('queixa_principal',v)} type="textarea"/></div>
                <Field label="História da doença atual" value={form.historia_doenca_atual} onChange={(v:string)=>set('historia_doenca_atual',v)} type="textarea"/>
                <Field label="Histórico médico / comorbidades / cirurgias" value={form.historico_medico} onChange={(v:string)=>set('historico_medico',v)} type="textarea"/>
                <Field label="Medicamentos em uso" value={form.medicamentos} onChange={(v:string)=>set('medicamentos',v)} type="textarea"/>
                <Field label="Antecedentes familiares" value={form.antecedentes_familiares} onChange={(v:string)=>set('antecedentes_familiares',v)} type="textarea"/>
                <Field label="Hábitos de vida / atividade física / sono" value={form.habitos_vida} onChange={(v:string)=>set('habitos_vida',v)} type="textarea"/>
                <Field label="Objetivo do paciente" value={form.objetivo_paciente} onChange={(v:string)=>set('objetivo_paciente',v)} type="textarea"/>
              </div>
            </Section>
            <Section title="Dor e sinais vitais" icon={HeartPulse}>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Field label="Dor NRS/EVA (0–10)" value={form.escala_dor} onChange={(v:string)=>set('escala_dor',v)} type="number" min="0" max="10"/>
                <Field label="Localização da dor" value={form.localizacao_dor} onChange={(v:string)=>set('localizacao_dor',v)}/>
                <Field label="Início/duração" value={form.inicio_dor} onChange={(v:string)=>set('inicio_dor',v)}/>
                <Field label="Tipo de dor" value={form.tipo_dor} onChange={(v:string)=>set('tipo_dor',v)}/>
                <Field label="PA" value={form.pressao_arterial} onChange={(v:string)=>set('pressao_arterial',v)}/>
                <Field label="FC (bpm)" value={form.frequencia_cardiaca} onChange={(v:string)=>set('frequencia_cardiaca',v)} type="number" min="0"/>
                <Field label="FR (irpm)" value={form.frequencia_respiratoria} onChange={(v:string)=>set('frequencia_respiratoria',v)} type="number" min="0"/>
                <Field label="SpO₂ (%)" value={form.spo2} onChange={(v:string)=>set('spo2',v)} type="number" min="0" max="100"/>
              </div>
              <div className="grid md:grid-cols-2 gap-5 mt-5"><Field label="Fatores agravantes" value={form.fatores_agravantes} onChange={(v:string)=>set('fatores_agravantes',v)}/><Field label="Fatores de alívio" value={form.fatores_alivio} onChange={(v:string)=>set('fatores_alivio',v)}/></div>
            </Section>
            <Section title={`Campos específicos • ${selectedType?.title}`} icon={Sparkles}>
              <div className="grid md:grid-cols-2 gap-5">
                {specificLabels[type].map(label => { const key=label.toLowerCase().replace(/[^a-z0-9]+/g,'_'); return <Field key={key} label={label} value={specific[key] || ''} onChange={(v:string)=>setSpecific(prev=>({...prev,[key]:v}))} type={label.includes('Campo personalizado')?'textarea':'text'}/>; })}
              </div>
            </Section>
            <Section title="Exame físico" icon={Activity}>
              <div className="grid md:grid-cols-2 gap-5">
                <Field label="Nível funcional" value={form.nivel_funcional} onChange={(v:string)=>set('nivel_funcional',v)} type="textarea"/>
                <Field label="Independência funcional / AVDs" value={form.independencia_funcional} onChange={(v:string)=>set('independencia_funcional',v)} type="textarea"/>
                <Field label="Postura" value={form.postura} onChange={(v:string)=>set('postura',v)} type="textarea"/>
                <Field label="Inspeção" value={form.inspecao} onChange={(v:string)=>set('inspecao',v)} type="textarea"/>
                <Field label="Palpação" value={form.palpacao} onChange={(v:string)=>set('palpacao',v)} type="textarea"/>
                <Field label="Amplitude de movimento" value={form.amplitude_movimento} onChange={(v:string)=>set('amplitude_movimento',v)} type="textarea"/>
                <Field label="Força muscular (MRC/Oxford ou método utilizado)" value={form.forca_muscular} onChange={(v:string)=>set('forca_muscular',v)} type="textarea"/>
                <Field label="Sensibilidade" value={form.sensibilidade} onChange={(v:string)=>set('sensibilidade',v)} type="textarea"/>
                <Field label="Tônus" value={form.tonus} onChange={(v:string)=>set('tonus',v)} type="textarea"/>
                <Field label="Coordenação" value={form.coordenacao} onChange={(v:string)=>set('coordenacao',v)} type="textarea"/>
                <Field label="Equilíbrio" value={form.equilibrio} onChange={(v:string)=>set('equilibrio',v)} type="textarea"/>
                <Field label="Marcha" value={form.marcha} onChange={(v:string)=>set('marcha',v)} type="textarea"/>
                <Field label="Transferências" value={form.transferencias} onChange={(v:string)=>set('transferencias',v)} type="textarea"/>
              </div>
              <div className="flex justify-end mt-5"><button onClick={()=>setStep(3)} className="px-6 py-3 rounded-2xl bg-sky-500 text-white font-black">Próximo: testes e escalas</button></div>
            </Section>
          </div>
        )}

        {type && step === 3 && (
          <Section title="Testes e escalas" icon={Activity}>
            <div className="flex flex-wrap gap-2 mb-5">
              {specificLabels[type].slice(0,5).map(x=><button key={x} onClick={()=>{addTest(); setTests(prev=>[...prev.slice(0,-1),{name:x,result:'',unit:'',interpretation:''}])}} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 hover:border-sky-500/40">+ {x}</button>)}
              <button onClick={addTest} className="px-3 py-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300">+ Teste personalizado</button>
            </div>
            <div className="space-y-3">
              {tests.map((t,i)=><div key={i} className="grid md:grid-cols-[1.3fr_1fr_0.6fr_1.5fr_auto] gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                <input value={t.name} onChange={e=>setTests(a=>a.map((x,j)=>j===i?{...x,name:e.target.value}:x))} placeholder="Teste / escala" className="input-compact"/>
                <input value={t.result} onChange={e=>setTests(a=>a.map((x,j)=>j===i?{...x,result:e.target.value}:x))} placeholder="Resultado" className="input-compact"/>
                <input value={t.unit} onChange={e=>setTests(a=>a.map((x,j)=>j===i?{...x,unit:e.target.value}:x))} placeholder="Unid." className="input-compact"/>
                <input value={t.interpretation} onChange={e=>setTests(a=>a.map((x,j)=>j===i?{...x,interpretation:e.target.value}:x))} placeholder="Interpretação clínica" className="input-compact"/>
                <button onClick={()=>setTests(a=>a.filter((_,j)=>j!==i))} className="p-3 rounded-xl text-rose-400 hover:bg-rose-500/10"><Trash2 size={16}/></button>
              </div>)}
              {!tests.length && <div className="py-12 text-center text-slate-500 text-sm">Nenhum teste registrado ainda.</div>}
            </div>
            <div className="flex justify-end mt-6"><button onClick={()=>setStep(4)} className="px-6 py-3 rounded-2xl bg-sky-500 text-white font-black">Próximo: CIF</button></div>
          </Section>
        )}

        {type && step === 4 && (
          <Section title="CIF — Classificação Internacional de Funcionalidade" icon={ShieldCheck}>
            <p className="text-sm text-slate-400 mb-5">Registre o domínio, qualificador e contexto funcional observado. Os códigos abaixo são referências da CIF; o profissional deve confirmar a pertinência clínica antes de registrar.</p>
            <div className="flex flex-wrap gap-2 mb-5">{CIF_SUGGESTIONS.map(s=><button key={s.code} onClick={()=>addCif(s)} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 hover:border-sky-500/40">{s.code} · {s.description}</button>)}<button onClick={()=>addCif()} className="px-3 py-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300">+ Item CIF</button></div>
            <div className="space-y-4">
              {cif.map((x,i)=><div key={i} className="grid md:grid-cols-[0.55fr_1.6fr_1fr_0.55fr_1.5fr_auto] gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                <input value={x.code} onChange={e=>setCif(a=>a.map((v,j)=>j===i?{...v,code:e.target.value}:v))} placeholder="Código" className="input-compact"/>
                <input value={x.description} onChange={e=>setCif(a=>a.map((v,j)=>j===i?{...v,description:e.target.value}:v))} placeholder="Descrição" className="input-compact"/>
                <select value={x.category} onChange={e=>setCif(a=>a.map((v,j)=>j===i?{...v,category:e.target.value}:v))} className="input-compact"><option value="funcoes">Funções</option><option value="estruturas">Estruturas</option><option value="atividade_participacao">Atividade/participação</option><option value="ambiental">Ambiental</option></select>
                <select value={x.qualifier} onChange={e=>setCif(a=>a.map((v,j)=>j===i?{...v,qualifier:e.target.value}:v))} className="input-compact"><option value="0">0 — nenhum</option><option value="1">1 — leve</option><option value="2">2 — moderado</option><option value="3">3 — grave</option><option value="4">4 — completo</option><option value="8">8 — não especificado</option><option value="9">9 — não aplicável</option></select>
                <input value={x.observation} onChange={e=>setCif(a=>a.map((v,j)=>j===i?{...v,observation:e.target.value}:v))} placeholder="Observação / contexto" className="input-compact"/>
                <button onClick={()=>setCif(a=>a.filter((_,j)=>j!==i))} className="p-3 rounded-xl text-rose-400 hover:bg-rose-500/10"><Trash2 size={16}/></button>
              </div>)}
              {!cif.length && <div className="py-12 text-center text-slate-500 text-sm">Adicione os domínios funcionais relevantes para este paciente.</div>}
            </div>
            <div className="flex justify-end mt-6"><button onClick={()=>setStep(5)} className="px-6 py-3 rounded-2xl bg-sky-500 text-white font-black">Próximo: plano terapêutico</button></div>
          </Section>
        )}

        {type && step === 5 && (
          <div className="space-y-5">
            <Section title="Diagnóstico, objetivos e plano terapêutico" icon={Stethoscope}>
              <div className="grid md:grid-cols-2 gap-5">
                <Field label="Diagnóstico fisioterapêutico" value={form.diagnostico_fisio} onChange={(v:string)=>set('diagnostico_fisio',v)} type="textarea"/>
                <Field label="Objetivos terapêuticos" value={form.objetivos_terapeuticos} onChange={(v:string)=>set('objetivos_terapeuticos',v)} type="textarea"/>
                <Field label="Prognóstico funcional" value={form.prognostico} onChange={(v:string)=>set('prognostico',v)} type="textarea"/>
                <Field label="Conduta / plano terapêutico" value={form.conduta} onChange={(v:string)=>set('conduta',v)} type="textarea"/>
                <Field label="Frequência / duração estimada" value={form.frequencia_sessoes} onChange={(v:string)=>set('frequencia_sessoes',v)}/>
                <Field label="Observações finais" value={form.observacoes_finais} onChange={(v:string)=>set('observacoes_finais',v)} type="textarea"/>
              </div>
            </Section>
            <div className="rounded-[2rem] border border-emerald-500/20 bg-emerald-500/5 p-6 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
              <div><div className="flex items-center gap-2 text-emerald-400 font-black"><CheckCircle2 size={20}/> Ficha pronta para finalização</div><p className="text-sm text-slate-400 mt-1">Salve a avaliação para vinculá-la ao histórico do paciente e gerar o PDF.</p></div>
              <div className="flex gap-2"><button onClick={save} disabled={saving || !!integrityHash} className="px-6 py-3 rounded-2xl bg-emerald-500 text-white font-black flex items-center gap-2 disabled:opacity-50"><Save size={17}/>{saving?'Salvando...':'Salvar e finalizar'}</button>{savedId&&<button onClick={generatePdf} className="px-6 py-3 rounded-2xl bg-white/10 text-white font-black flex items-center gap-2"><FileDown size={17}/> Gerar PDF</button>}</div>
            </div>
            {integrityHash && <div className="text-[11px] text-slate-500 flex items-center gap-2"><ShieldCheck size={14}/> Registro protegido por integridade documental.</div>}
          </div>
        )}
      </div>
    </ProGuard>
  );
}
